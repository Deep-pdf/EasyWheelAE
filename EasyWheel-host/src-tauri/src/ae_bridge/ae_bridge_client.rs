use std::collections::HashMap;
use std::net::TcpStream;
use std::sync::{Arc, Mutex};
use std::sync::mpsc::{channel, Sender, RecvTimeoutError};
use std::time::Duration;
use tungstenite::{WebSocket, Message, stream::MaybeTlsStream};
use serde_json;

use crate::ipc::{CommandRequest, CommandResponse};
use crate::config_manager::ConfigManager;
use super::request_queue::RequestQueue;
use super::bridge_status::{BridgeStatusTracker, BridgeStatus};

/// Handles WebSocket messaging client behavior: sending commands, matching incoming
/// responses with pending request channels, and managing the request queue.
pub struct AEBridgeClient {
    pub ws: Arc<Mutex<Option<WebSocket<MaybeTlsStream<TcpStream>>>>>,
    pending_requests: Arc<Mutex<HashMap<String, Sender<CommandResponse>>>>,
    queue: Arc<RequestQueue>,
    status: BridgeStatusTracker,
}

impl AEBridgeClient {
    /// Creates a new `AEBridgeClient` instance.
    pub fn new(status: BridgeStatusTracker, queue: Arc<RequestQueue>) -> Self {
        Self {
            ws: Arc::new(Mutex::new(None)),
            pending_requests: Arc::new(Mutex::new(HashMap::new())),
            queue,
            status,
        }
    }

    /// Stores the active WebSocket connection or clears it.
    pub fn set_socket(&self, ws: Option<WebSocket<MaybeTlsStream<TcpStream>>>) {
        let mut guard = self.ws.lock().unwrap_or_else(|e| e.into_inner());
        *guard = ws;
    }

    /// Checks if the client is currently connected.
    pub fn is_connected(&self) -> bool {
        self.status.get() == BridgeStatus::Connected
    }

    /// Sends a command request.
    ///
    /// If connected, sends immediately via WebSocket.
    /// If offline, queues the request in the `RequestQueue` and waits.
    /// Blocks until a response is received or a timeout occurs.
    pub fn send_request(&self, req: CommandRequest) -> Result<CommandResponse, String> {
        let req_id = req.request_id.clone();
        let command = req.command.clone();
        
        let config = ConfigManager::get();
        if !config.global.adobe_enabled {
            return Err("Adobe integration is disabled".to_string());
        }

        let (tx, rx) = channel();
        {
            let mut pending = self.pending_requests.lock().unwrap_or_else(|e| e.into_inner());
            pending.insert(req_id.clone(), tx);
        }

        if !self.is_connected() {
            println!(
                "[AEBridge] Info: Bridge offline. Queuing request '{}' (ID: {})",
                command, req_id
            );
            if let Err(e) = self.queue.push(req) {
                let mut pending = self.pending_requests.lock().unwrap_or_else(|e| e.into_inner());
                pending.remove(&req_id);
                return Err(format!("Queue failed: {}", e));
            }
            
            // Block waiting for response. If we reconnect and execute, we will get the response.
            let timeout = Duration::from_millis(config.global.adobe_timeout_ms);
            match rx.recv_timeout(timeout) {
                Ok(res) => Ok(res),
                Err(RecvTimeoutError::Timeout) => {
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
            // Connected: Send immediately
            let payload = serde_json::to_string(&req)
                .map_err(|e| {
                    let mut pending = self.pending_requests.lock().unwrap_or_else(|e| e.into_inner());
                    pending.remove(&req_id);
                    format!("Serialization error: {}", e)
                })?;

            println!("[AEBridge] Info: Request Sent: {} (ID: {})", command, req_id);
            
            let send_result = {
                let mut guard = self.ws.lock().unwrap_or_else(|e| e.into_inner());
                if let Some(ref mut ws) = *guard {
                    ws.write(Message::Text(payload)).and_then(|_| ws.flush())
                } else {
                    Err(tungstenite::Error::ConnectionClosed)
                }
            };

            if let Err(e) = send_result {
                let mut pending = self.pending_requests.lock().unwrap_or_else(|e| e.into_inner());
                pending.remove(&req_id);
                eprintln!("[AEBridge] Error: Failed to write WebSocket frame: {}", e);
                // Trigger disconnect
                self.set_socket(None);
                self.status.set(BridgeStatus::Disconnected);
                return Err("Lost connection".to_string());
            }

            let timeout = Duration::from_millis(config.global.adobe_timeout_ms);
            match rx.recv_timeout(timeout) {
                Ok(res) => {
                    println!(
                        "[AEBridge] Info: Response Received: {} (ID: {}, success: {}, executionTime: {}ms)",
                        command, res.request_id, res.success, res.execution_time
                    );
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

    /// Special send command for heartbeat. Does not queue when offline.
    pub fn send_heartbeat(&self, req: CommandRequest) -> Result<CommandResponse, String> {
        let req_id = req.request_id.clone();
        let (tx, rx) = channel();
        {
            let mut pending = self.pending_requests.lock().unwrap_or_else(|e| e.into_inner());
            pending.insert(req_id.clone(), tx);
        }

        let payload = serde_json::to_string(&req).unwrap();
        
        let send_result = {
            let mut guard = self.ws.lock().unwrap_or_else(|e| e.into_inner());
            if let Some(ref mut ws) = *guard {
                ws.write(Message::Text(payload)).and_then(|_| ws.flush())
            } else {
                Err(tungstenite::Error::ConnectionClosed)
            }
        };

        if let Err(_) = send_result {
            let mut pending = self.pending_requests.lock().unwrap_or_else(|e| e.into_inner());
            pending.remove(&req_id);
            return Err("Heartbeat send failed".to_string());
        }

        // Give heartbeat exactly 1 second to respond to avoid freezing the manager thread
        let timeout = Duration::from_millis(1000);
        match rx.recv_timeout(timeout) {
            Ok(res) => Ok(res),
            Err(_) => {
                let mut pending = self.pending_requests.lock().unwrap_or_else(|e| e.into_inner());
                pending.remove(&req_id);
                Err("Heartbeat timeout".to_string())
            }
        }
    }

    /// Drains the queue by sending all buffered requests.
    pub fn drain_queue(&self) {
        let mut count = 0;
        while let Some(req) = self.queue.pop() {
            let req_id = req.request_id.clone();
            let command = req.command.clone();
            
            // If the waiting thread already timed out, discard this request.
            let has_receiver = {
                let pending = self.pending_requests.lock().unwrap_or_else(|e| e.into_inner());
                pending.contains_key(&req_id)
            };

            if !has_receiver {
                continue;
            }

            let payload = match serde_json::to_string(&req) {
                Ok(p) => p,
                Err(e) => {
                    eprintln!("[AEBridge] Error serializing queued request: {}", e);
                    continue;
                }
            };

            println!("[AEBridge] Info: Sending queued request: {} (ID: {})", command, req_id);

            let send_result = {
                let mut guard = self.ws.lock().unwrap_or_else(|e| e.into_inner());
                if let Some(ref mut ws) = *guard {
                    ws.write(Message::Text(payload)).and_then(|_| ws.flush())
                } else {
                    Err(tungstenite::Error::ConnectionClosed)
                }
            };

            if let Err(e) = send_result {
                eprintln!("[AEBridge] Error sending queued request: {}. Re-queuing.", e);
                // Return it to the queue
                let _ = self.queue.push(req);
                break;
            }
            count += 1;
        }
        if count > 0 {
            println!("[AEBridge] Info: Drained {} requests from queue.", count);
        }
    }

    /// Matches an incoming JSON text response with a pending request channel.
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

    /// Resets all waiting channels on connection loss.
    pub fn handle_disconnect(&self) {
        let mut pending = self.pending_requests.lock().unwrap_or_else(|e| e.into_inner());
        pending.clear();
    }
}
