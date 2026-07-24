use std::sync::Arc;
use std::thread;
use std::time::Duration;
use tungstenite::{Message, accept};

use crate::config_manager::ConfigManager;
use super::ae_bridge_client::AEBridgeClient;
use super::bridge_status::{BridgeStatusTracker, BridgeStatus};

/// Orchestrates the WebSocket connection lifecycle: running the server, accepting connections,
/// performing handshakes, managing heartbeat pings, and handling disconnects.
pub struct ConnectionManager {
    client: Arc<AEBridgeClient>,
    status: BridgeStatusTracker,
}

impl ConnectionManager {
    /// Creates a new `ConnectionManager`.
    pub fn new(client: Arc<AEBridgeClient>, status: BridgeStatusTracker) -> Self {
        Self { client, status }
    }

    /// Spawns the background server socket listener and heartbeat threads.
    pub fn start(&self) {
        let client_clone = self.client.clone();
        let status_clone = self.status.clone();
        
        // Spawn the server acceptor loop
        thread::spawn(move || {
            Self::server_loop(client_clone, status_clone);
        });

        let client_heartbeat = self.client.clone();
        let status_heartbeat = self.status.clone();
        
        // Spawn the heartbeat loop (sends ping every 30 seconds)
        thread::spawn(move || {
            Self::heartbeat_loop(client_heartbeat, status_heartbeat);
        });
    }

    /// Listens for incoming connections on the configured port and upgrades them to WebSocket streams.
    fn server_loop(client: Arc<AEBridgeClient>, status: BridgeStatusTracker) {
        let config = ConfigManager::get();
        let port = config.global.adobe_port;
        let addr = format!("127.0.0.1:{}", port);

        let listener = match std::net::TcpListener::bind(&addr) {
            Ok(l) => {
                l
            }
            Err(e) => {
                eprintln!("[AEBridge] Error: Failed to bind WebSocket server to {} — {}", addr, e);
                status.set(BridgeStatus::Disconnected);
                return;
            }
        };

        for stream in listener.incoming() {
            let stream = match stream {
                Ok(s) => s,
                Err(e) => {
                    eprintln!("[AEBridge] Error: Failed to accept incoming stream — {}", e);
                    continue;
                }
            };

            let client_reader = client.clone();
            let status_reader = status.clone();

            thread::spawn(move || {
                // Upgrade TCP stream to WebSocket
                let mut ws = match accept(stream) {
                    Ok(w) => w,
                    Err(e) => {
                        eprintln!("[AEBridge] Error: Failed WebSocket handshake upgrade — {}", e);
                        return;
                    }
                };

                // Read handshake hello message
                let first_msg = match ws.read() {
                    Ok(Message::Text(text)) => text,
                    Ok(other) => {
                        eprintln!("[AEBridge] Error: Invalid first message format: {:?}", other);
                        let _ = ws.close(None);
                        return;
                    }
                    Err(e) => {
                        eprintln!("[AEBridge] Error: Handshake read error — {}", e);
                        return;
                    }
                };


                // Verify client handshake hello payload
                let is_valid = if let Ok(json) = serde_json::from_str::<serde_json::Value>(&first_msg) {
                    json.get("type").and_then(|v| v.as_str()) == Some("hello") &&
                    json.get("client").and_then(|v| v.as_str()) == Some("after-effects")
                } else {
                    false
                };

                if !is_valid {
                    eprintln!("[AEBridge] Error: Handshake verification failed. Closing connection.");
                    let _ = ws.close(None);
                    return;
                }

                // Send welcome message
                let welcome = serde_json::json!({
                    "type": "welcome",
                    "server": "EasyWheelHost",
                    "version": "1.0.0"
                }).to_string();

                let write_res = ws.write(Message::Text(welcome));
                let res = match write_res {
                    Ok(_) => ws.flush(),
                    Err(e) => Err(e),
                };
                if let Err(e) = res {
                    eprintln!("[AEBridge] Error: Failed to write welcome handshake response — {}", e);
                    return;
                }

                status_reader.set(BridgeStatus::Connected);

                let ws_shared = client_reader.add_client(ws);

                // Drain queued requests if any
                client_reader.drain_queue();

                // Start reading frames
                loop {
                    let msg = {
                        let mut ws_guard = ws_shared.lock().unwrap_or_else(|e| e.into_inner());
                        ws_guard.read()
                    };

                    match msg {
                        Ok(Message::Text(text)) => {

                            // Inspect if it is a heartbeat response
                            if let Ok(json) = serde_json::from_str::<serde_json::Value>(&text) {
                                if json.get("type").and_then(|v| v.as_str()) == Some("pong") {
                                    continue; // Heartbeat pong handled
                                }
                            }

                            client_reader.handle_incoming_response(&text);
                        }
                        Ok(Message::Close(_)) => {
                            break;
                        }
                        Err(e) => {
                            eprintln!("[AEBridge] Error reading from socket: {}", e);
                            break;
                        }
                        _ => {}
                    }
                }

                client_reader.remove_client(&ws_shared);
                if !client_reader.is_connected() {
                    status_reader.set(BridgeStatus::Disconnected);
                }
            });
        }
    }

    /// Periodic loop performing heartbeat ping checks every 30 seconds.
    fn heartbeat_loop(client: Arc<AEBridgeClient>, status: BridgeStatusTracker) {
        loop {
            thread::sleep(Duration::from_secs(30));

            let ping_msg = serde_json::json!({
                "type": "ping"
            }).to_string();

            let mut failed_clients = Vec::new();
            {
                let clients = client.active_clients.lock().unwrap_or_else(|e| e.into_inner());
                if clients.is_empty() {
                    continue;
                }

                for (idx, c) in clients.iter().enumerate() {
                    let mut ws_guard = c.ws.lock().unwrap_or_else(|e| e.into_inner());
                    let write_res = ws_guard.write(Message::Text(ping_msg.clone()));
                    let res = match write_res {
                        Ok(_) => ws_guard.flush(),
                        Err(e) => Err(e),
                    };
                    if let Err(e) = res {
                        eprintln!("[AEBridge] Heartbeat error sending to client: {}", e);
                        failed_clients.push(idx);
                    }
                }
            }

            if !failed_clients.is_empty() {
                let mut clients = client.active_clients.lock().unwrap_or_else(|e| e.into_inner());
                for idx in failed_clients.into_iter().rev() {
                    if idx < clients.len() {
                        clients.remove(idx);
                    }
                }
                if clients.is_empty() {
                    status.set(BridgeStatus::Disconnected);
                }
            }
        }
    }
}
