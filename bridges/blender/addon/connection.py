# connection.py — Background-thread WebSocket connection to EasyWheel Host.
#
# Threading model
# ───────────────
#   Main thread (Blender / bpy.app.timers):
#     - Reads  from  INCOMING  (CommandRequest dicts placed by the network thread)
#     - Writes to    OUTGOING  (CommandResponse dicts produced by the dispatcher)
#
#   Network thread:
#     - Owns the WebSocket socket exclusively
#     - Reads  from  OUTGOING  (non-blocking; drains before each recv)
#     - Writes to    INCOMING  (after handshake succeeds)
#
# The 50 ms socket timeout (matching the host's 50 ms read timeout) ensures
# that the network thread alternates between draining OUTGOING and attempting
# a recv without blocking indefinitely in either direction.
#
# Connection state machine
# ────────────────────────
#   DISCONNECTED → CONNECTING → HANDSHAKE → CONNECTED
#        ↑                                      │
#        └────────────── on any error ──────────┘
#
# The INCOMING queue is only populated once state reaches CONNECTED, i.e.
# after the Host's "welcome" message has been received and validated.

import json
import queue
import threading
import time

from ._ws_client import WebSocketClient, WebSocketClosed, WebSocketError

# ── Thread-safe queues (module-level singletons) ──────────────────────────────

# Network thread → Blender main thread: incoming CommandRequest dicts.
INCOMING: queue.Queue = queue.Queue()

# Blender main thread → network thread: outgoing CommandResponse dicts.
OUTGOING: queue.Queue = queue.Queue()

# ── Configuration ─────────────────────────────────────────────────────────────

_HOST            = "127.0.0.1"
_PORT            = 23437
_RECONNECT_DELAY = 5.0   # seconds between reconnect attempts
_SOCK_TIMEOUT    = 0.05  # 50 ms — matches host polling interval

# ── Module state (private) ────────────────────────────────────────────────────

_stop_event: threading.Event = threading.Event()
_thread: threading.Thread | None = None

# ── Connection state ──────────────────────────────────────────────────────────

class _State:
    DISCONNECTED = "DISCONNECTED"
    CONNECTING   = "CONNECTING"
    HANDSHAKE    = "HANDSHAKE"
    CONNECTED    = "CONNECTED"

_current_state = _State.DISCONNECTED
_state_lock    = threading.Lock()


def _set_state(state: str) -> None:
    global _current_state
    with _state_lock:
        if _current_state != state:
            _current_state = state
            print(f"[EasyWheelBlender] Connection: {state}")


def get_state() -> str:
    """Returns the current connection state string (thread-safe)."""
    with _state_lock:
        return _current_state


# ── Network thread ────────────────────────────────────────────────────────────

def _network_loop() -> None:
    """
    Background thread: connect → handshake → recv/send loop → reconnect.

    The loop uses a 50 ms socket timeout so that it can service OUTGOING
    (send pending responses) promptly without blocking indefinitely in recv().
    Control flow per iteration:
        1. Drain OUTGOING queue (non-blocking).
        2. Attempt a recv (returns None on the 50 ms timeout).
        3. If data received, parse and route to INCOMING.
    """
    while not _stop_event.is_set():
        _set_state(_State.CONNECTING)

        ws = WebSocketClient(_HOST, _PORT, timeout=_SOCK_TIMEOUT)

        # ── Connect ───────────────────────────────────────────────────────────
        try:
            ws.connect()
        except OSError as exc:
            print(f"[EasyWheelBlender] Cannot connect to EasyWheel Host: {exc}")
            _set_state(_State.DISCONNECTED)
            _stop_event.wait(_RECONNECT_DELAY)
            continue

        # ── Send hello handshake ──────────────────────────────────────────────
        _set_state(_State.HANDSHAKE)
        try:
            ws.send_text(json.dumps({
                "type":    "hello",
                "client":  "blender",
                "version": "1.0.0",
            }))
        except OSError as exc:
            print(f"[EasyWheelBlender] Failed to send hello: {exc}")
            ws.close()
            _set_state(_State.DISCONNECTED)
            _stop_event.wait(_RECONNECT_DELAY)
            continue

        # ── Wait for welcome (up to 5 s using 50 ms polls) ───────────────────
        # The bridge is NOT marked CONNECTED until the welcome is validated.
        welcomed = False
        deadline = time.monotonic() + 5.0

        while not welcomed and time.monotonic() < deadline and not _stop_event.is_set():
            try:
                text = ws.recv_text()
            except (WebSocketClosed, WebSocketError, OSError) as exc:
                print(f"[EasyWheelBlender] Error waiting for welcome: {exc}")
                break

            if text is None:
                # 50 ms timeout — keep polling.
                continue

            try:
                msg = json.loads(text)
                if msg.get("type") == "welcome":
                    welcomed = True
                    print(
                        "[EasyWheelBlender] Connected to EasyWheel Host on port 23437."
                    )
            except json.JSONDecodeError:
                pass  # Ignore malformed messages during handshake phase.

        if not welcomed:
            print("[EasyWheelBlender] Did not receive welcome from host. Retrying.")
            ws.close()
            _set_state(_State.DISCONNECTED)
            _stop_event.wait(_RECONNECT_DELAY)
            continue

        # ── CONNECTED — begin normal operation ────────────────────────────────
        _set_state(_State.CONNECTED)

        try:
            while not _stop_event.is_set():

                # 1. Drain OUTGOING: send all pending responses to the host.
                #    Done BEFORE recv so that responses generated by the previous
                #    timer callback are transmitted promptly.
                while True:
                    try:
                        response = OUTGOING.get_nowait()
                        payload  = json.dumps(
                            {k: v for k, v in response.items() if v is not None},
                        )
                        ws.send_text(payload)
                    except queue.Empty:
                        break
                    except (WebSocketClosed, WebSocketError, OSError) as exc:
                        print(f"[EasyWheelBlender] Send error: {exc}")
                        raise  # Fall through to disconnect handling.

                # 2. Attempt a recv (returns None after 50 ms timeout).
                try:
                    text = ws.recv_text()
                except (WebSocketClosed, WebSocketError) as exc:
                    print(f"[EasyWheelBlender] Connection closed: {exc}")
                    raise

                if text is None:
                    # Timeout — no data available; loop back to drain OUTGOING.
                    continue

                # 3. Parse and route the received message.
                try:
                    msg = json.loads(text)
                except json.JSONDecodeError as exc:
                    print(
                        f"[EasyWheelBlender] Malformed JSON from host: {exc} "
                        f"— raw: {text!r}"
                    )
                    continue

                msg_type = msg.get("type")

                if msg_type == "ping":
                    # JSON-level ping: respond with JSON-level pong.
                    # (WebSocket-level Ping frames are handled by _ws_client.py.)
                    try:
                        ws.send_text(json.dumps({"type": "pong"}))
                    except (WebSocketClosed, WebSocketError, OSError) as exc:
                        print(f"[EasyWheelBlender] Failed to send pong: {exc}")
                        raise
                    continue

                if "command" in msg:
                    # CommandRequest — forward to the main thread dispatcher.
                    INCOMING.put_nowait(msg)
                else:
                    print(
                        f"[EasyWheelBlender] Unrecognised message type: {msg_type!r}"
                    )

        except (WebSocketClosed, WebSocketError, OSError):
            pass  # Clean up below.
        finally:
            ws.close()
            _set_state(_State.DISCONNECTED)

        if not _stop_event.is_set():
            print(f"[EasyWheelBlender] Reconnecting in {_RECONNECT_DELAY:.0f} s...")
            _stop_event.wait(_RECONNECT_DELAY)

    print("[EasyWheelBlender] Network thread stopped.")


# ── Public API ────────────────────────────────────────────────────────────────

def start() -> None:
    """Starts the background network thread.  Safe to call multiple times."""
    global _thread
    _stop_event.clear()
    if _thread is None or not _thread.is_alive():
        _thread = threading.Thread(
            target=_network_loop,
            name="EasyWheelBlender-net",
            daemon=True,
        )
        _thread.start()
        print("[EasyWheelBlender] Network thread started.")


def stop() -> None:
    """Signals the network thread to stop and waits up to 6 s for it to exit."""
    global _thread
    _stop_event.set()
    if _thread is not None and _thread.is_alive():
        _thread.join(timeout=6.0)
        _thread = None
    print("[EasyWheelBlender] Network thread stopped.")
