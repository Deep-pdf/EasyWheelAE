use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::sync::mpsc::{channel, Sender, RecvTimeoutError};
use std::time::Duration;

use crate::ipc::{CommandRequest, CommandResponse};
use crate::config_manager::ConfigManager;
use super::request_queue::RequestQueue;
use super::bridge_status::{BridgeStatusTracker, BridgeStatus};

/// Handles WebSocket messaging: queuing commands, forwarding them to the
/// server-loop thread that exclusively owns the socket, and routing responses
/// back to their callers via one-shot channels.
///
/// # Deadlock-free design
///
/// The previous design shared the WebSocket behind `Arc<Mutex<…>>`. The reader
/// thread held that lock during `ws.read()` — a blocking call — so any writer
/// thread that tried to acquire the same lock would deadlock until a frame
/// arrived. The new design removes the shared mutex entirely:
///
/// - `ConnectionManager::server_loop` owns the `WebSocket` exclusively.
/// - All outbound payloads flow through an `mpsc::Sender<String>` stored here.
/// - The server loop drains the channel between reads (non-blocking
///   `try_recv`), so reads and writes are interleaved within the same thread.
pub struct AEBridgeClient {
    /// One-way channel to the server loop that owns the WebSocket.
    /// `None` when no client is connected.
    write_tx: Arc<Mutex<Option<Sender<String>>>>,
    /// Maps request IDs to one-shot response channels.
    pending_requests: Arc<Mutex<HashMap<String, Sender<CommandResponse>>>>,
    queue: Arc<RequestQueue>,
    status: BridgeStatusTracker,
}

impl AEBridgeClient {
    /// Creates a new `AEBridgeClient` instance.
    pub fn new(status: BridgeStatusTracker, queue: Arc<RequestQueue>) -> Self {
        Self {
            write_tx: Arc::new(Mutex::new(None)),
            pending_requests: Arc::new(Mutex::new(HashMap::new())),
            queue,
            status,
        }
    }

    // -----------------------------------------------------------------------
    // Channel management — called by ConnectionManager
    // -----------------------------------------------------------------------

    /// Registers the write channel when a client connects.
    pub fn set_write_channel(&self, tx: Sender<String>) {
        let mut guard = self.write_tx.lock().unwrap_or_else(|e| e.into_inner());
        *guard = Some(tx);
    }

    /// Clears the write channel when a client disconnects.
    pub fn clear_write_channel(&self) {
        let mut guard = self.write_tx.lock().unwrap_or_else(|e| e.into_inner());
        *guard = None;
    }

    // -----------------------------------------------------------------------
    // Connection state
    // -----------------------------------------------------------------------

    /// Returns `true` if a client is currently connected.
    pub fn is_connected(&self) -> bool {
        let guard = self.write_tx.lock().unwrap_or_else(|e| e.into_inner());
        guard.is_some()
    }

    /// Sends a raw JSON string to the server loop.
    ///
    /// Returns `true` if the payload was handed off successfully;
    /// `false` if not connected or the channel has been closed.
    pub fn send_raw(&self, payload: String) -> bool {
        let guard = self.write_tx.lock().unwrap_or_else(|e| e.into_inner());
        if let Some(tx) = guard.as_ref() {
            tx.send(payload).is_ok()
        } else {
            false
        }
    }

    // -----------------------------------------------------------------------
    // Command send / receive
    // -----------------------------------------------------------------------

    /// Sends a command request over the bridge and blocks until the response
    /// arrives or the configured timeout elapses.
    ///
    /// If the bridge is not yet connected the request is enqueued; it will be
    /// flushed the next time a client connects via `drain_queue`.
    pub fn send_request(&self, req: CommandRequest) -> Result<CommandResponse, String> {
        let req_id  = req.request_id.clone();
        let command = req.command.clone();

        let config = ConfigManager::get();
        if !config.global.adobe_enabled {
            return Err("Adobe integration is disabled".to_string());
        }

        // Register a one-shot response channel before touching the network so
        // that a very fast response cannot be lost in a race.
        let (tx, rx) = channel();
        {
            let mut pending = self.pending_requests.lock().unwrap_or_else(|e| e.into_inner());
            pending.insert(req_id.clone(), tx);
        }

        if !self.is_connected() {
            // -----------------------------------------------------------------
            // Offline path: enqueue and wait
            // -----------------------------------------------------------------
            if let Err(e) = self.queue.push(req) {
                let mut pending = self.pending_requests.lock().unwrap_or_else(|e| e.into_inner());
                pending.remove(&req_id);
                return Err(format!("Queue failed: {}", e));
            }

            let timeout = Duration::from_millis(config.global.adobe_timeout_ms);
            match rx.recv_timeout(timeout) {
                Ok(res)                          => Ok(res),
                Err(RecvTimeoutError::Timeout)   => {
                    let mut pending = self.pending_requests.lock().unwrap_or_else(|e| e.into_inner());
                    pending.remove(&req_id);
                    eprintln!("[AEBridge] Error: Queued request timed out: {}", req_id);
                    Err("Timeout".to_string())
                }
                Err(RecvTimeoutError::Disconnected) => {
                    Err("Lost connection".to_string())
                }
            }
        } else {
            // -----------------------------------------------------------------
            // Online path: forward to server loop via channel
            // -----------------------------------------------------------------
            let payload = match serde_json::to_string(&req) {
                Ok(p)  => p,
                Err(e) => {
                    let mut pending = self.pending_requests.lock().unwrap_or_else(|e| e.into_inner());
                    pending.remove(&req_id);
                    return Err(format!("Serialization error: {}", e));
                }
            };

            println!("[AEBridge] Info: Command Sent: {}", command);

            if !self.send_raw(payload) {
                let mut pending = self.pending_requests.lock().unwrap_or_else(|e| e.into_inner());
                pending.remove(&req_id);
                self.status.set(BridgeStatus::Disconnected);
                return Err("Lost connection".to_string());
            }

            let timeout = Duration::from_millis(config.global.adobe_timeout_ms);
            match rx.recv_timeout(timeout) {
                Ok(res) => {
                    println!("[AEBridge] Info: Command Received: {}", command);
                    Ok(res)
                }
                Err(RecvTimeoutError::Timeout) => {
                    let mut pending = self.pending_requests.lock().unwrap_or_else(|e| e.into_inner());
                    pending.remove(&req_id);
                    eprintln!("[AEBridge] Error: Timeout occurred waiting for response: {}", req_id);
                    Err("Timeout".to_string())
                }
                Err(RecvTimeoutError::Disconnected) => {
                    Err("Lost connection".to_string())
                }
            }
        }
    }

    // -----------------------------------------------------------------------
    // Queue drain
    // -----------------------------------------------------------------------

    /// Forwards all buffered requests to the now-connected client.
    ///
    /// Requests whose response channel has already timed out are silently
    /// discarded. Called by `ConnectionManager` immediately after a client
    /// completes the handshake.
    pub fn drain_queue(&self) {
        while let Some(req) = self.queue.pop() {
            let req_id = req.request_id.clone();

            // Skip requests that have already timed out on the caller side.
            let has_receiver = {
                let pending = self.pending_requests.lock().unwrap_or_else(|e| e.into_inner());
                pending.contains_key(&req_id)
            };
            if !has_receiver {
                continue;
            }

            let payload = match serde_json::to_string(&req) {
                Ok(p)  => p,
                Err(e) => {
                    eprintln!("[AEBridge] Error serializing queued request: {}", e);
                    continue;
                }
            };

            if !self.send_raw(payload) {
                eprintln!("[AEBridge] Error: Channel closed during drain. Re-queuing.");
                let _ = self.queue.push(req);
                break;
            }
        }
    }

    // -----------------------------------------------------------------------
    // Response routing
    // -----------------------------------------------------------------------

    /// Routes an incoming JSON response to the waiting caller.
    ///
    /// Called by the server loop whenever a text frame is received that is not
    /// a heartbeat pong.
    pub fn handle_incoming_response(&self, text: &str) {
        if let Ok(res) = serde_json::from_str::<CommandResponse>(text) {
            let req_id = res.request_id.clone();
            let mut pending = self.pending_requests.lock().unwrap_or_else(|e| e.into_inner());
            if let Some(tx) = pending.remove(&req_id) {
                let _ = tx.send(res);
            }
        } else {
            eprintln!("[AEBridge] Error: Failed to parse incoming response: {}", text);
        }
    }
}
