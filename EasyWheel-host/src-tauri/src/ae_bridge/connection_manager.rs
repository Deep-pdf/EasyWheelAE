use std::sync::Arc;
use std::thread;
use std::time::Duration;
use tungstenite::{connect, Message, stream::MaybeTlsStream};

use crate::config_manager::ConfigManager;
use crate::ipc::protocol::{PROTOCOL_VERSION, generate_request_id, get_iso8601_timestamp};
use crate::ipc::CommandRequest;
use super::ae_bridge_client::AEBridgeClient;
use super::bridge_status::{BridgeStatusTracker, BridgeStatus};

/// Orchestrates the WebSocket connection lifecycle: connecting, reconnecting, heartbeats, and timeout detection.
pub struct ConnectionManager {
    client: Arc<AEBridgeClient>,
    status: BridgeStatusTracker,
}

impl ConnectionManager {
    /// Creates a new `ConnectionManager`.
    pub fn new(client: Arc<AEBridgeClient>, status: BridgeStatusTracker) -> Self {
        Self { client, status }
    }

    /// Spawns the connection management thread in the background.
    pub fn start(&self) {
        let client_clone = self.client.clone();
        let status_clone = self.status.clone();
        
        thread::spawn(move || {
            Self::connection_loop(client_clone, status_clone);
        });
    }

    fn connection_loop(client: Arc<AEBridgeClient>, status: BridgeStatusTracker) {
        println!("[AEBridge] Info: Connection manager thread started.");
        
        loop {
            let config = ConfigManager::get();
            if !config.global.adobe_enabled {
                status.set(BridgeStatus::Disconnected);
                thread::sleep(Duration::from_millis(1000));
                continue;
            }

            let port = config.global.adobe_port;
            let retry_interval = Duration::from_millis(config.global.adobe_retry_interval_ms);
            let heartbeat_interval = Duration::from_millis(config.global.adobe_heartbeat_interval_ms);

            let current_status = status.get();
            if current_status == BridgeStatus::Disconnected || current_status == BridgeStatus::TimedOut {
                status.set(BridgeStatus::Connecting);
            }

            let url = format!("ws://127.0.0.1:{}", port);
            println!("[AEBridge] Connection Started: ws://127.0.0.1:{}", port);
            
            match connect(&url) {
                Ok((ws, _response)) => {
                    println!("[AEBridge] Connection Success: Connected to Adobe After Effects.");
                    
                    // Set non-blocking on underlying TCP socket for concurrent read/write
                    let nonblocking_res = match ws.get_ref() {
                        MaybeTlsStream::Plain(ref stream) => stream.set_nonblocking(true),
                        _ => Ok(()),
                    };
                    if let Err(e) = nonblocking_res {
                        eprintln!("[AEBridge] Error setting TCP non-blocking: {}", e);
                        status.set(BridgeStatus::Reconnecting);
                        thread::sleep(retry_interval);
                        continue;
                    }

                    client.set_socket(Some(ws));
                    status.set(BridgeStatus::Connected);
                    
                    // Spawn reader thread to handle incoming WebSocket frames asynchronously
                    let client_reader = client.clone();
                    let status_reader = status.clone();
                    thread::spawn(move || {
                        Self::run_reader_loop(client_reader, status_reader);
                    });

                    // Drain the request queue first
                    client.drain_queue();

                    // Enter active session heartbeat loop (blocks until disconnect or heartbeat failure)
                    Self::run_active_session(client.clone(), status.clone(), heartbeat_interval);
                    
                    // Disconnect cleanup
                    client.set_socket(None);
                    client.handle_disconnect();
                    status.set(BridgeStatus::Disconnected);
                    println!("[AEBridge] Connection Lost: Disconnected from After Effects.");
                }
                Err(e) => {
                    eprintln!("[AEBridge] Connection Failed: Could not connect to ws://127.0.0.1:{} (Error: {})", port, e);
                    status.set(BridgeStatus::Reconnecting);
                }
            }

            println!("[AEBridge] Reconnect Started: Retrying in {}ms...", config.global.adobe_retry_interval_ms);
            thread::sleep(retry_interval);
        }
    }

    /// Background thread reading incoming WebSocket messages.
    fn run_reader_loop(client: Arc<AEBridgeClient>, status: BridgeStatusTracker) {
        loop {
            if status.get() != BridgeStatus::Connected {
                break;
            }

            let msg = {
                let mut ws_guard = client.ws.lock().unwrap_or_else(|e| e.into_inner());
                if let Some(ref mut ws) = *ws_guard {
                    match ws.read() {
                        Ok(m) => Some(Ok(m)),
                        Err(tungstenite::Error::Io(ref e)) if e.kind() == std::io::ErrorKind::WouldBlock => {
                            None // No frame ready yet
                        }
                        Err(e) => Some(Err(e)),
                    }
                } else {
                    break;
                }
            };

            if let Some(res) = msg {
                match res {
                    Ok(Message::Text(text)) => {
                        client.handle_incoming_response(&text);
                    }
                    Ok(Message::Binary(_)) => {}
                    Ok(Message::Close(_)) => {
                        println!("[AEBridge] Info: WebSocket Close frame received.");
                        status.set(BridgeStatus::Disconnected);
                        break;
                    }
                    Ok(Message::Ping(_)) => {
                        // tungstenite handles returning Pong automatically
                    }
                    Ok(Message::Pong(_)) => {}
                    Err(e) => {
                        eprintln!("[AEBridge] Error during frame read: {}", e);
                        status.set(BridgeStatus::Disconnected);
                        break;
                    }
                    _ => {}
                }
            }

            thread::sleep(Duration::from_millis(10));
        }
    }

    /// Periodic loop performing heartbeat ping checks.
    fn run_active_session(client: Arc<AEBridgeClient>, status: BridgeStatusTracker, heartbeat_interval: Duration) {
        let mut last_heartbeat = std::time::Instant::now();

        loop {
            // Stop if status transitions away from Connected
            if status.get() != BridgeStatus::Connected {
                break;
            }

            // Heartbeat Ping Check
            if last_heartbeat.elapsed() >= heartbeat_interval {
                let req = CommandRequest {
                    version: PROTOCOL_VERSION,
                    request_id: generate_request_id(),
                    timestamp: get_iso8601_timestamp(),
                    command: "ping".to_string(),
                    parameters: serde_json::Value::Null,
                    profile: "Adobe After Effects".to_string(),
                };

                println!("[AEBridge] Heartbeat: Ping");
                match client.send_heartbeat(req) {
                    Ok(res) => {
                        if res.success {
                            last_heartbeat = std::time::Instant::now();
                        } else {
                            eprintln!("[AEBridge] Heartbeat error response: {}", res.message);
                            status.set(BridgeStatus::TimedOut);
                            break;
                        }
                    }
                    Err(e) => {
                        eprintln!("[AEBridge] Heartbeat: Timeout / Failed: {}", e);
                        status.set(BridgeStatus::TimedOut);
                        break;
                    }
                }
            }

            thread::sleep(Duration::from_millis(100));
        }
    }
}
