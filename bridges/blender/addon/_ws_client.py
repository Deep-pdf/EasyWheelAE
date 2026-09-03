# _ws_client.py — Minimal WebSocket client (RFC 6455, client mode only).
#
# Implements the subset of RFC 6455 required by the EasyWheel Blender bridge:
#   - HTTP Upgrade handshake with Sec-WebSocket-Key / Sec-WebSocket-Accept
#   - Text frame send (client MUST mask frames per RFC 6455 §5.3)
#   - Text frame receive (server frames are unmasked)
#   - Ping (0x9) → automatic Pong (0xA) response
#   - Close (0x8) detection
#   - Multi-byte payload lengths (7-bit, 16-bit, 64-bit)
#
# NOT implemented (not needed for local loopback to EasyWheel Host):
#   - Binary frames          (server only sends text/JSON)
#   - Message fragmentation  (server sends complete messages)
#   - TLS / SSL              (loopback only)
#   - Extensions             (no permessage-deflate)
#
# Dependencies: socket, hashlib, base64, struct, os  — all Python stdlib.
# Tested with Python 3.10+ (Blender's embedded Python).

import base64
import hashlib
import os
import socket
import struct

# WebSocket opcodes (RFC 6455 §5.2)
_OP_TEXT  = 0x1
_OP_CLOSE = 0x8
_OP_PING  = 0x9
_OP_PONG  = 0xA

# Magic GUID used in Sec-WebSocket-Accept computation (RFC 6455 §4.1)
_WS_MAGIC = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11"


class WebSocketError(OSError):
    """Raised for WebSocket protocol errors (non-I/O)."""


class WebSocketClosed(WebSocketError):
    """Raised when the server sends a Close frame or the TCP connection drops."""


class WebSocketClient:
    """
    Minimal synchronous WebSocket client.

    The socket is set to a caller-specified timeout so that recv_text()
    returns None on timeout instead of blocking indefinitely.  The networking
    thread in connection.py uses this to interleave outbound response sends
    with inbound command receives without either direction starving the other.

    Usage::

        ws = WebSocketClient("127.0.0.1", 23437, timeout=0.05)
        ws.connect()
        ws.send_text('{"type":"hello","client":"blender","version":"1.0.0"}')
        while True:
            msg = ws.recv_text()   # None on timeout, str on data
            if msg is not None:
                handle(msg)
        ws.close()
    """

    def __init__(self, host: str, port: int, timeout: float = 0.05) -> None:
        self._host    = host
        self._port    = port
        self._timeout = timeout  # seconds; controls recv blocking
        self._sock: socket.socket | None = None

    # ── Connection ────────────────────────────────────────────────────────────

    def connect(self) -> None:
        """Opens the TCP connection and performs the WebSocket upgrade handshake."""
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        # Connect timeout: generous 5 s for the initial TCP + HTTP round-trip.
        sock.settimeout(5.0)
        sock.connect((self._host, self._port))
        self._sock = sock
        self._handshake()
        # Switch to the caller-specified polling timeout for the main loop.
        self._sock.settimeout(self._timeout)

    def _handshake(self) -> None:
        """
        Performs the HTTP Upgrade handshake.

        Sends a compliant WebSocket upgrade request and validates the server's
        101 response, including the Sec-WebSocket-Accept header.
        """
        nonce = base64.b64encode(os.urandom(16)).decode()
        expected_accept = base64.b64encode(
            hashlib.sha1((nonce + _WS_MAGIC).encode()).digest()
        ).decode()

        request = (
            f"GET / HTTP/1.1\r\n"
            f"Host: {self._host}:{self._port}\r\n"
            f"Upgrade: websocket\r\n"
            f"Connection: Upgrade\r\n"
            f"Sec-WebSocket-Key: {nonce}\r\n"
            f"Sec-WebSocket-Version: 13\r\n"
            f"\r\n"
        )
        self._sock.sendall(request.encode())

        # Buffer until the HTTP response headers end.
        response = b""
        while b"\r\n\r\n" not in response:
            chunk = self._sock.recv(4096)
            if not chunk:
                raise WebSocketError("Connection closed during handshake")
            response += chunk

        header = response.decode(errors="replace")
        status_line = header.split("\r\n", 1)[0]
        if "101" not in status_line:
            raise WebSocketError(
                f"Server did not return HTTP 101 Switching Protocols: {status_line!r}"
            )

        # Validate the Sec-WebSocket-Accept header.
        accept_line = next(
            (line for line in header.split("\r\n")
             if line.lower().startswith("sec-websocket-accept:")),
            None,
        )
        if accept_line is None:
            raise WebSocketError("Missing Sec-WebSocket-Accept header in server response")
        actual_accept = accept_line.split(":", 1)[1].strip()
        if actual_accept != expected_accept:
            raise WebSocketError(
                f"Sec-WebSocket-Accept mismatch: "
                f"expected {expected_accept!r}, got {actual_accept!r}"
            )

    # ── Send ─────────────────────────────────────────────────────────────────

    def send_text(self, text: str) -> None:
        """Sends a UTF-8 text frame.  Client→server frames MUST be masked (RFC 6455 §5.3)."""
        self._send_frame(_OP_TEXT, text.encode("utf-8"))

    def _send_pong(self, data: bytes = b"") -> None:
        """Sends a Pong control frame in response to a Ping."""
        self._send_frame(_OP_PONG, data)

    def _send_frame(self, opcode: int, payload: bytes) -> None:
        """
        Constructs and transmits a single WebSocket frame with a random 4-byte mask.

        Frame layout (RFC 6455 §5.2)::

            Byte 0: FIN=1, RSV1-3=0, Opcode (4 bits)
            Byte 1: MASK=1, Payload length (7 bits; or 126/127 for extended lengths)
            [2-byte extended length if len == 126]
            [8-byte extended length if len == 127]
            4-byte masking key
            Masked payload  (payload[i] XOR mask[i % 4])
        """
        if self._sock is None:
            raise WebSocketError("Not connected")

        length = len(payload)
        mask   = os.urandom(4)
        masked = bytes(b ^ mask[i % 4] for i, b in enumerate(payload))

        # Header byte 0: FIN=1, no extensions, opcode.
        header = bytes([0x80 | opcode])

        # Header byte 1 (+optional extended length): MASK=1.
        if length <= 125:
            header += bytes([0x80 | length])
        elif length <= 65535:
            header += struct.pack("!BH", 0x80 | 126, length)
        else:
            header += struct.pack("!BQ", 0x80 | 127, length)

        self._sock.sendall(header + mask + masked)

    # ── Receive ───────────────────────────────────────────────────────────────

    def recv_text(self) -> str | None:
        """
        Receives one WebSocket frame from the server.

        Returns:
            str   — the UTF-8 payload for Text frames.
            None  — on a read timeout (socket.timeout / TimeoutError).
                    The caller should continue its loop and try again.

        Raises:
            WebSocketClosed — on a server Close frame or TCP disconnect.
            WebSocketError  — on protocol violations.
        """
        try:
            opcode, payload = self._recv_frame()
        except (socket.timeout, TimeoutError):
            return None

        if opcode == _OP_TEXT:
            return payload.decode("utf-8")
        elif opcode == _OP_PING:
            # RFC 6455 §5.5.3: MUST respond with Pong.
            self._send_pong(payload)
            return None
        elif opcode == _OP_PONG:
            return None
        elif opcode == _OP_CLOSE:
            raise WebSocketClosed("Server sent a Close frame")
        else:
            # Ignore binary / continuation frames (not used by EasyWheel Host).
            return None

    def _recv_frame(self) -> tuple[int, bytes]:
        """
        Reads exactly one frame from the socket.

        Server→client frames are UNMASKED (RFC 6455 §5.1).
        Handles 7-bit, 16-bit, and 64-bit payload length fields.
        """
        head = self._recv_exactly(2)
        opcode = head[0] & 0x0F
        masked = (head[1] & 0x80) != 0
        length = head[1] & 0x7F

        if length == 126:
            length = struct.unpack("!H", self._recv_exactly(2))[0]
        elif length == 127:
            length = struct.unpack("!Q", self._recv_exactly(8))[0]

        if masked:
            # Servers SHOULD NOT mask frames (RFC 6455 §5.1), but handle it
            # gracefully if they do.
            mask    = self._recv_exactly(4)
            raw     = self._recv_exactly(length)
            payload = bytes(b ^ mask[i % 4] for i, b in enumerate(raw))
        else:
            payload = self._recv_exactly(length)

        return opcode, payload

    def _recv_exactly(self, n: int) -> bytes:
        """
        Reads exactly `n` bytes from the socket, handling short reads.

        Raises WebSocketClosed if the connection is closed mid-read.
        Propagates socket.timeout to the caller.
        """
        buf = b""
        while len(buf) < n:
            chunk = self._sock.recv(n - len(buf))
            if not chunk:
                raise WebSocketClosed("TCP connection closed mid-frame")
            buf += chunk
        return buf

    # ── Close ─────────────────────────────────────────────────────────────────

    def close(self) -> None:
        """
        Sends a WebSocket Close frame and shuts down the underlying socket.
        Safe to call multiple times.
        """
        if self._sock is None:
            return
        try:
            self._send_frame(_OP_CLOSE, b"")
        except OSError:
            pass
        try:
            self._sock.shutdown(socket.SHUT_RDWR)
        except OSError:
            pass
        try:
            self._sock.close()
        except OSError:
            pass
        self._sock = None
