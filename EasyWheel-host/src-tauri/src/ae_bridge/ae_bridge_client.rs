use std::collections::HashMap;
use std::net::TcpStream;
use std::sync::{Arc, Mutex};
use std::sync::mpsc::{channel, Sender, RecvTimeoutError};
use std::time::Duration;
use tungstenite::{WebSocket, Message};
use serde_json;

use crate::ipc::{CommandRequest, CommandResponse};
use crate::config_manager::ConfigManager;
use super::request_queue::RequestQueue;
use super::bridge_status::{BridgeStatusTracker, BridgeStatus};

/// Represents an active WebSocket client connection.
pub struct ActiveClient {
    pub ws: Arc<Mutex<WebSocket<TcpStream>>>,
}

/// Handles WebSocket messaging server behavior: sending commands, matching incoming
/// responses with pending request channels, and managing the request queue.
pub struct AEBridgeClient {
    pub active_clients: Arc<Mutex<Vec<ActiveClient>>>,
    pending_requests: Arc<Mutex<HashMap<String, Sender<CommandResponse>>>>,
    queue: Arc<RequestQueue>,
    status: BridgeStatusTracker,
}

impl AEBridgeClient {
    /// Creates a new `AEBridgeClient` instance.
    pub fn new(status: BridgeStatusTracker, queue: Arc<RequestQueue>) -> Self {
        Self {
            active_clients: Arc::new(Mutex::new(Vec::new())),
            pending_requests: Arc::new(Mutex::new(HashMap::new())),
            queue,
            status,
        }
    }

    /// Adds an active client connection and returns the thread-safe websocket wrapper.
    pub fn add_client(&self, ws: WebSocket<TcpStream>) -> Arc<Mutex<WebSocket<TcpStream>>> {
        let ws_shared = Arc::new(Mutex::new(ws));
        let mut clients = self.active_clients.lock().unwrap_or_else(|e| e.into_inner());
        clients.push(ActiveClient { ws: ws_shared.clone() });
        ws_shared
    }

    /// Removes an active client connection by reference.
    pub fn remove_client(&self, ws_shared: &Arc<Mutex<WebSocket<TcpStream>>>) {
        let mut clients = self.active_clients.lock().unwrap_or_else(|e| e.into_inner());
        clients.retain(|c| !Arc::ptr_eq(&c.ws, ws_shared));
    }

    /// Checks if the client is currently connected.
    pub fn is_connected(&self) -> bool {
        let clients = self.active_clients.lock().unwrap_or_else(|e| e.into_inner());
        !clients.is_empty()
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

            // Required Logging:
            // [AEBridge]
            // Sent:
            // ...
            println!("[AEBridge] Info: Command Sent: {}", command);
            
            let send_result = {
                let mut clients = self.active_clients.lock().unwrap_or_else(|e| e.into_inner());
                let mut failed_clients = Vec::new();
                let mut last_err = None;
                
                for (idx, client) in clients.iter().enumerate() {
                    let mut ws_guard = client.ws.lock().unwrap_or_else(|e| e.into_inner());
                    let write_res = ws_guard.write(Message::Text(payload.clone()));
                    let res = match write_res {
                        Ok(_) => ws_guard.flush(),
                        Err(e) => Err(e),
                    };
                    match res {
                        Ok(_) => {}
                        Err(e) => {
                            eprintln!("[AEBridge] Error writing to client: {}", e);
                            failed_clients.push(idx);
                            last_err = Some(e);
                        }
                    }
                }
                
                // Cleanup failed clients
                for idx in failed_clients.into_iter().rev() {
                    clients.remove(idx);
                }
                
                if clients.is_empty() {
                    self.status.set(BridgeStatus::Disconnected);
                    Err(last_err.unwrap_or(tungstenite::Error::ConnectionClosed))
                } else {
                    Ok(())
                }
            };

            if let Err(e) = send_result {
                let mut pending = self.pending_requests.lock().unwrap_or_else(|e| e.into_inner());
                pending.remove(&req_id);
                eprintln!("[AEBridge] Error: Failed to write WebSocket frame: {}", e);
                return Err("Lost connection".to_string());
            }

            let timeout = Duration::from_millis(config.global.adobe_timeout_ms);
            match rx.recv_timeout(timeout) {
                Ok(res) => {
                    println!(
                        "[AEBridge] Info: Command Received: {}",
                        command
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

    /// Drains the queue by sending all buffered requests.
    pub fn drain_queue(&self) {
        while let Some(req) = self.queue.pop() {
            let req_id = req.request_id.clone();
            
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


            let send_result = {
                let mut clients = self.active_clients.lock().unwrap_or_else(|e| e.into_inner());
                let mut failed_clients = Vec::new();
                let mut succeeded = false;
                
                for (idx, client) in clients.iter().enumerate() {
                    let mut ws_guard = client.ws.lock().unwrap_or_else(|e| e.into_inner());
                    let write_res = ws_guard.write(Message::Text(payload.clone()));
                    let res = match write_res {
                        Ok(_) => ws_guard.flush(),
                        Err(e) => Err(e),
                    };
                    match res {
                        Ok(_) => {
                            succeeded = true;
                        }
                        Err(e) => {
                            eprintln!("[AEBridge] Error writing queued request to client: {}", e);
                            failed_clients.push(idx);
                        }
                    }
                }
                
                // Cleanup failed clients
                for idx in failed_clients.into_iter().rev() {
                    clients.remove(idx);
                }
                
                if clients.is_empty() {
                    self.status.set(BridgeStatus::Disconnected);
                }
                
                if succeeded {
                    Ok(())
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


}
