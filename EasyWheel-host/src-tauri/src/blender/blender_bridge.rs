//! Blender communication bridge for EasyWheel Host.
//!
//! `BlenderBridge` runs a WebSocket server on `127.0.0.1:23437` and
//! communicates with the EasyWheel Blender add-on.
//!
//! # Single-client constraint
//!
//! Only one Blender client is active at a time. When a second client connects
//! the bridge:
//!   1. Sends a kill signal to the old connection's server-loop thread via a
//!      dedicated `kill_tx` channel.
//!   2. The old loop checks `kill_rx.try_recv()` at the top of each iteration
//!      and responds by sending a WebSocket Close frame and breaking.
//!   3. The old `ActiveConnection` is atomically replaced by the new one.
//!
//! Dropping the write `Sender` alone is NOT sufficient because the old loop
//! blocks on `ws.read()` with a 50 ms timeout.  The kill channel ensures the
//! loop exits within 50 ms and the socket is closed cleanly.
//!
//! # No offline queue
//!
//! Unlike the AE bridge, `BlenderBridge` does NOT queue requests when Blender
//! is disconnected.  Blender operations are stateful; replaying queued
//! operations after a reconnect could produce unpredictable results.
//! `send_request` returns `Err("Blender not connected")` immediately.
//!
//! # Timeout
//!
//! Phase 3 reuses `GlobalSettings::adobe_timeout_ms` to avoid adding a new
//! config field.  A TODO comment marks the rename path for future settings-UI
//! work.

use std::collections::HashMap;
use std::io;
use std::sync::{Arc, Mutex, OnceLock};
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::mpsc::{channel, Sender, RecvTimeoutError, TryRecvError};
use std::thread;
use std::time::Duration;
use tungstenite::{Message, accept};

use crate::ipc::{CommandRequest, CommandResponse};
use crate::config_manager::ConfigManager;

// ── Per-connection state ──────────────────────────────────────────────────────

/// A single active Blender WebSocket client.
struct ActiveConnection {
    /// Unique monotonic ID.  Used by `clear_connection` to avoid stale clears.
    id: u64,
    /// Channel for outbound text frames to the socket-owning thread.
    tx: Sender<String>,
    /// One-shot shutdown signal.  Sending `()` causes the server loop to call
    /// `ws.close()` and break within the next 50 ms polling cycle.
    kill_tx: Sender<()>,
}

// ── Client (shared across threads) ───────────────────────────────────────────

/// Thread-safe state shared between the bridge singleton and each server-loop thread.
pub struct BlenderBridgeClient {
    /// The one active connection.  `Option` makes the single-client constraint
    /// structural: replacing it automatically signals the previous owner.
    connection: Arc<Mutex<Option<ActiveConnection>>>,
    /// Monotonically increasing connection ID.
    conn_id_counter: AtomicU64,
    /// Maps `requestId` strings to one-shot response channels.
    pending_requests: Arc<Mutex<HashMap<String, Sender<CommandResponse>>>>,
}

impl BlenderBridgeClient {
    fn new() -> Self {
        Self {
            connection: Arc::new(Mutex::new(None)),
            conn_id_counter: AtomicU64::new(0),
            pending_requests: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    /// Allocates a new unique connection ID.
    pub fn next_conn_id(&self) -> u64 {
        self.conn_id_counter.fetch_add(1, Ordering::SeqCst)
    }

    /// Registers a new connection, explicitly terminating any previous one.
    ///
    /// Sends `()` to the old `kill_tx`, which causes the old server-loop
    /// thread to call `ws.close(None)` and exit within the next 50 ms cycle.
    /// The old `tx` is also dropped, closing the write channel.
    pub fn set_connection(&self, id: u64, tx: Sender<String>, kill_tx: Sender<()>) {
        let mut guard = self.connection.lock().unwrap_or_else(|e| e.into_inner());
        if let Some(old) = guard.take() {
            // Signal the old connection loop to close its WebSocket and exit.
            let _ = old.kill_tx.send(());
            // `old.tx` drops here, closing the write channel as belt-and-suspenders.
            println!(
                "[BlenderBridge] Info: Previous connection terminated to make way for connection {}.",
                id
            );
        }
        *guard = Some(ActiveConnection { id, tx, kill_tx });
        println!("[BlenderBridge] Info: Connection {} registered.", id);
    }

    /// Clears the connection entry only if it matches `id`.
    ///
    /// Prevents a newly-accepted connection from being cleared by an older
    /// thread that exits after the replacement has already been registered.
    pub fn clear_connection(&self, id: u64) {
        let mut guard = self.connection.lock().unwrap_or_else(|e| e.into_inner());
        if guard.as_ref().map_or(false, |c| c.id == id) {
            guard.take();
            println!("[BlenderBridge] Info: Connection {} cleared.", id);
        }
    }

    /// Returns `true` if a Blender client is currently connected.
    pub fn is_connected(&self) -> bool {
        let guard = self.connection.lock().unwrap_or_else(|e| e.into_inner());
        guard.is_some()
    }

    /// Forwards a raw JSON string to the active connection's server-loop thread.
    /// Returns `false` if not connected or the channel is closed.
    pub fn send_raw(&self, payload: String) -> bool {
        let guard = self.connection.lock().unwrap_or_else(|e| e.into_inner());
        match guard.as_ref() {
            Some(conn) => conn.tx.send(payload).is_ok(),
            None => false,
        }
    }

    /// Sends a `CommandRequest` to Blender and blocks until the response arrives
    /// or the configured timeout elapses.
    ///
    /// Returns `Err` immediately if Blender is not connected (no queue).
    pub fn send_request(&self, req: CommandRequest) -> Result<CommandResponse, String> {
        if !self.is_connected() {
            return Err("Blender not connected".to_string());
        }

        let req_id  = req.request_id.clone();
        let command = req.command.clone();

        // Register the response channel BEFORE touching the network so that a
        // very fast response cannot arrive before we start listening.
        let (tx, rx) = channel();
        {
            let mut pending = self.pending_requests.lock().unwrap_or_else(|e| e.into_inner());
            pending.insert(req_id.clone(), tx);
        }

        let payload = match serde_json::to_string(&req) {
            Ok(p)  => p,
            Err(e) => {
                let mut pending = self.pending_requests.lock().unwrap_or_else(|e| e.into_inner());
                pending.remove(&req_id);
                return Err(format!("Serialization error: {}", e));
            }
        };

        if !self.send_raw(payload) {
            let mut pending = self.pending_requests.lock().unwrap_or_else(|e| e.into_inner());
            pending.remove(&req_id);
            return Err("Lost connection while sending".to_string());
        }

        println!("[BlenderBridge] Info: Command sent: {}", command);

        // Phase 3: reuse adobe_timeout_ms to avoid adding a new GlobalSettings field.
        // TODO: rename GlobalSettings::adobe_timeout_ms -> bridge_timeout_ms when
        //       the Settings UI is updated and can surface the rename to users.
        let timeout = Duration::from_millis(ConfigManager::get().global.adobe_timeout_ms);

        match rx.recv_timeout(timeout) {
            Ok(res) => {
                println!("[BlenderBridge] Info: Response received for command: {}", command);
                Ok(res)
            }
            Err(RecvTimeoutError::Timeout) => {
                let mut pending = self.pending_requests.lock().unwrap_or_else(|e| e.into_inner());
                pending.remove(&req_id);
                eprintln!(
                    "[BlenderBridge] Error: Timeout waiting for response to command: {}",
                    command
                );
                Err("Timeout".to_string())
            }
            Err(RecvTimeoutError::Disconnected) => {
                Err("Lost connection while waiting for response".to_string())
            }
        }
    }

    /// Routes an incoming JSON text frame to the waiting caller via `requestId`.
    pub fn handle_incoming_response(&self, text: &str) {
        match serde_json::from_str::<CommandResponse>(text) {
            Ok(res) => {
                let req_id = res.request_id.clone();
                let mut pending = self.pending_requests.lock().unwrap_or_else(|e| e.into_inner());
                if let Some(tx) = pending.remove(&req_id) {
                    let _ = tx.send(res);
                } else {
                    eprintln!(
                        "[BlenderBridge] Warning: Received response for unknown requestId '{}'.",
                        req_id
                    );
                }
            }
            Err(e) => {
                eprintln!(
                    "[BlenderBridge] Error: Failed to parse incoming message as CommandResponse: {} — raw: {}",
                    e, text
                );
            }
        }
    }
}

// ── Bridge singleton ──────────────────────────────────────────────────────────

/// Entry point for the Blender WebSocket bridge.
///
/// Holds a reference to the shared `BlenderBridgeClient` and owns the server
/// and heartbeat threads.
pub struct BlenderBridge {
    pub client: Arc<BlenderBridgeClient>,
}

static BLENDER_BRIDGE: OnceLock<Arc<BlenderBridge>> = OnceLock::new();

impl BlenderBridge {
    /// Returns the global `BlenderBridge` singleton, initialising it on first call.
    pub fn global() -> Arc<Self> {
        BLENDER_BRIDGE
            .get_or_init(|| {
                Arc::new(Self {
                    client: Arc::new(BlenderBridgeClient::new()),
                })
            })
            .clone()
    }

    /// Spawns the WebSocket server loop and heartbeat thread.
    /// Called once from `lib.rs` during application startup.
    pub fn start() {
        let bridge = Self::global();
        let client_server    = bridge.client.clone();
        let client_heartbeat = bridge.client.clone();

        thread::spawn(move || Self::server_loop(client_server));
        thread::spawn(move || Self::heartbeat_loop(client_heartbeat));
    }

    /// Sends a `CommandRequest` to Blender and waits for the response.
    pub fn send_request(&self, req: CommandRequest) -> Result<CommandResponse, String> {
        self.client.send_request(req)
    }

    // ── Server loop ───────────────────────────────────────────────────────────

    fn server_loop(client: Arc<BlenderBridgeClient>) {
        let addr = "127.0.0.1:23437";
        let listener = match std::net::TcpListener::bind(addr) {
            Ok(l) => {
                println!("[BlenderBridge] Info: Listening on port 23437.");
                l
            }
            Err(e) => {
                eprintln!(
                    "[BlenderBridge] Fatal: Failed to bind WebSocket server to {} — {}",
                    addr, e
                );
                return;
            }
        };

        for stream in listener.incoming() {
            let stream = match stream {
                Ok(s)  => s,
                Err(e) => {
                    eprintln!("[BlenderBridge] Error: Failed to accept TCP stream — {}", e);
                    continue;
                }
            };

            let client_conn = client.clone();

            thread::spawn(move || {
                // ── 1. WebSocket upgrade ──────────────────────────────────────
                let mut ws = match accept(stream) {
                    Ok(w)  => w,
                    Err(e) => {
                        eprintln!("[BlenderBridge] Error: WebSocket upgrade failed — {}", e);
                        return;
                    }
                };

                // ── 2. Read hello (5 s timeout) ───────────────────────────────
                let _ = ws.get_ref().set_read_timeout(Some(Duration::from_secs(5)));

                let first_msg = match ws.read() {
                    Ok(Message::Text(t)) => t,
                    Ok(other) => {
                        eprintln!(
                            "[BlenderBridge] Error: Invalid first message format: {:?}",
                            other
                        );
                        let _ = ws.close(None);
                        return;
                    }
                    Err(e) => {
                        eprintln!(
                            "[BlenderBridge] Error: Handshake read error — {}",
                            e
                        );
                        return;
                    }
                };

                // ── 3. Verify hello: must be client == "blender" ──────────────
                let is_valid = serde_json::from_str::<serde_json::Value>(&first_msg)
                    .ok()
                    .filter(|j| {
                        j.get("type").and_then(|v| v.as_str())   == Some("hello") &&
                        j.get("client").and_then(|v| v.as_str()) == Some("blender")
                    })
                    .is_some();

                if !is_valid {
                    eprintln!(
                        "[BlenderBridge] Error: Handshake rejected \
                         (expected client==\"blender\"). Closing connection."
                    );
                    let _ = ws.close(None);
                    return;
                }

                // ── 4. Send welcome ───────────────────────────────────────────
                let welcome = serde_json::json!({
                    "type":    "welcome",
                    "server":  "EasyWheelHost",
                    "version": "1.0.0"
                })
                .to_string();

                let write_res = ws.write(Message::Text(welcome));
                let flush_res = match write_res {
                    Ok(_)  => ws.flush(),
                    Err(e) => Err(e),
                };
                if let Err(e) = flush_res {
                    eprintln!(
                        "[BlenderBridge] Error: Failed to write welcome message — {}",
                        e
                    );
                    return;
                }

                println!("[BlenderBridge] Info: Blender client connected and welcomed.");

                // ── 5. Switch to 50 ms read timeout for main loop ─────────────
                let _ = ws.get_ref().set_read_timeout(Some(Duration::from_millis(50)));

                // ── 6. Register connection (terminates any previous one) ───────
                let conn_id = client_conn.next_conn_id();
                let (write_tx, write_rx) = channel::<String>();
                let (kill_tx,  kill_rx)  = channel::<()>();
                client_conn.set_connection(conn_id, write_tx, kill_tx);

                // ── 7. Combined read + write + kill polling loop ───────────────
                //
                // Order of operations each iteration:
                //   a) Check kill signal — close socket and exit if received.
                //   b) Drain all pending outbound messages (non-blocking).
                //   c) Attempt one read (returns after ≤ 50 ms due to timeout).
                'conn: loop {
                    // a) Kill signal check — checked before any I/O.
                    match kill_rx.try_recv() {
                        Ok(()) => {
                            println!(
                                "[BlenderBridge] Info: Kill signal received for connection {}. \
                                 Closing socket.",
                                conn_id
                            );
                            let _ = ws.close(None);
                            break 'conn;
                        }
                        Err(TryRecvError::Disconnected) => {
                            // Bridge dropped — exit.
                            break 'conn;
                        }
                        Err(TryRecvError::Empty) => {}
                    }

                    // b) Drain outbound messages (non-blocking).
                    loop {
                        match write_rx.try_recv() {
                            Ok(payload) => {
                                let write_res = ws.write(Message::Text(payload));
                                let flush_res = match write_res {
                                    Ok(_)  => ws.flush(),
                                    Err(e) => Err(e),
                                };
                                if let Err(e) = flush_res {
                                    eprintln!(
                                        "[BlenderBridge] Error: Write failed on connection {}: {}",
                                        conn_id, e
                                    );
                                    break 'conn;
                                }
                            }
                            Err(TryRecvError::Empty)        => break,
                            Err(TryRecvError::Disconnected) => break 'conn,
                        }
                    }

                    // c) Read one frame (≤ 50 ms block due to read timeout).
                    match ws.read() {
                        Ok(Message::Text(text)) => {
                            // Silently discard heartbeat pongs.
                            if let Ok(json) = serde_json::from_str::<serde_json::Value>(&text) {
                                if json.get("type").and_then(|v| v.as_str()) == Some("pong") {
                                    continue;
                                }
                            }
                            client_conn.handle_incoming_response(&text);
                        }
                        Ok(Message::Ping(data)) => {
                            let _ = ws.write(Message::Pong(data));
                        }
                        Ok(Message::Close(_)) => {
                            println!(
                                "[BlenderBridge] Info: Client sent Close frame on connection {}.",
                                conn_id
                            );
                            break;
                        }
                        Ok(_) => {}
                        Err(tungstenite::Error::Io(ref e))
                            if e.kind() == io::ErrorKind::WouldBlock
                                || e.kind() == io::ErrorKind::TimedOut =>
                        {
                            // Normal: no data in the last 50 ms — continue polling.
                            continue;
                        }
                        Err(e) => {
                            eprintln!(
                                "[BlenderBridge] Error: Read failed on connection {}: {}",
                                conn_id, e
                            );
                            break;
                        }
                    }
                }

                // ── 8. Cleanup ────────────────────────────────────────────────
                client_conn.clear_connection(conn_id);
                println!(
                    "[BlenderBridge] Info: Client disconnected (connection {}).",
                    conn_id
                );
            });
        }
    }

    // ── Heartbeat loop ────────────────────────────────────────────────────────

    /// Sends a JSON-level ping every 30 seconds via the write channel.
    /// Returns silently if Blender is not connected.
    fn heartbeat_loop(client: Arc<BlenderBridgeClient>) {
        loop {
            thread::sleep(Duration::from_secs(30));
            let ping = serde_json::json!({ "type": "ping" }).to_string();
            // Returns false when disconnected — that is expected, not an error.
            client.send_raw(ping);
        }
    }
}
