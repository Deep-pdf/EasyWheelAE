use std::io;
use std::sync::Arc;
use std::sync::mpsc::{channel, TryRecvError};
use std::thread;
use std::time::Duration;
use std::sync::atomic::{AtomicBool, Ordering};
use tungstenite::{Message, accept};

use crate::config_manager::ConfigManager;
use super::ae_bridge_client::AEBridgeClient;
use super::bridge_status::{BridgeStatusTracker, BridgeStatus};

pub static RUNNING: AtomicBool = AtomicBool::new(true);

/// Orchestrates the WebSocket connection lifecycle: running the server,
/// accepting connections, performing handshakes, managing heartbeat pings,
/// and handling disconnects.
pub struct ConnectionManager {
    client: Arc<AEBridgeClient>,
    status: BridgeStatusTracker,
}

impl ConnectionManager {
    /// Creates a new `ConnectionManager`.
    pub fn new(client: Arc<AEBridgeClient>, status: BridgeStatusTracker) -> Self {
        Self { client, status }
    }

    /// Spawns the background server-socket listener and heartbeat threads.
    pub fn start(&self) {
        let client_clone  = self.client.clone();
        let status_clone  = self.status.clone();
        thread::spawn(move || {
            Self::server_loop(client_clone, status_clone);
        });

        let client_heartbeat = self.client.clone();
        let status_heartbeat = self.status.clone();
        thread::spawn(move || {
            Self::heartbeat_loop(client_heartbeat, status_heartbeat);
        });
    }

    pub fn shutdown() {
        RUNNING.store(false, Ordering::Relaxed);
        let port = ConfigManager::get().global.adobe_port;
        let addr = format!("127.0.0.1:{}", port);
        // Connect a dummy stream to unblock the TcpListener loop
        if let Ok(_) = std::net::TcpStream::connect(&addr) {
            println!("[AEBridge] Info: Sent wakeup ping to connection loop for shutdown.");
        }
    }

    // -----------------------------------------------------------------------
    // Server loop
    // -----------------------------------------------------------------------

    fn server_loop(client: Arc<AEBridgeClient>, status: BridgeStatusTracker) {
        let config = ConfigManager::get();
        let port   = config.global.adobe_port;
        let addr   = format!("127.0.0.1:{}", port);

        let listener = loop {
            if !RUNNING.load(Ordering::Relaxed) {
                return;
            }
            match std::net::TcpListener::bind(&addr) {
                Ok(l)  => {
                    println!("[AEBridge] Listening on port {}", port);
                    break l;
                }
                Err(e) => {
                    eprintln!(
                        "[AEBridge] Warning: Failed to bind WebSocket server to {} — {}. \
                         Retrying in 5 seconds...",
                        addr, e
                    );
                    status.set(BridgeStatus::Disconnected);
                    std::thread::sleep(Duration::from_secs(5));
                }
            }
        };

        for stream in listener.incoming() {
            if !RUNNING.load(Ordering::Relaxed) {
                break;
            }
            let stream = match stream {
                Ok(s)  => s,
                Err(e) => {
                    if !RUNNING.load(Ordering::Relaxed) {
                        break;
                    }
                    eprintln!("[AEBridge] Error: Failed to accept incoming stream — {}", e);
                    continue;
                }
            };

            let client_conn = client.clone();
            let status_conn = status.clone();

            thread::spawn(move || {
                // ----------------------------------------------------------
                // 1. Upgrade TCP stream → WebSocket (blocking; local = fast)
                // ----------------------------------------------------------
                let mut ws = match accept(stream) {
                    Ok(w)  => w,
                    Err(e) => {
                        eprintln!("[AEBridge] Error: Failed WebSocket handshake upgrade — {}", e);
                        return;
                    }
                };

                // ----------------------------------------------------------
                // 2. Read the hello handshake (5 s timeout is generous enough
                //    for a local connection and prevents an indefinite block).
                // ----------------------------------------------------------
                let _ = ws.get_ref().set_read_timeout(Some(Duration::from_secs(5)));

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

                // ----------------------------------------------------------
                // 3. Verify hello payload
                // ----------------------------------------------------------
                let is_valid = if let Ok(json) = serde_json::from_str::<serde_json::Value>(&first_msg) {
                    json.get("type").and_then(|v| v.as_str())   == Some("hello") &&
                    json.get("client").and_then(|v| v.as_str()) == Some("after-effects")
                } else {
                    false
                };

                if !is_valid {
                    eprintln!("[AEBridge] Error: Handshake verification failed. Closing connection.");
                    let _ = ws.close(None);
                    return;
                }

                // ----------------------------------------------------------
                // 4. Send welcome
                // ----------------------------------------------------------
                let welcome = serde_json::json!({
                    "type":    "welcome",
                    "server":  "EasyWheelHost",
                    "version": "1.0.0"
                }).to_string();

                let write_res = ws.write(Message::Text(welcome));
                let flush_res = match write_res {
                    Ok(_)  => ws.flush(),
                    Err(e) => Err(e),
                };
                if let Err(e) = flush_res {
                    eprintln!("[AEBridge] Error: Failed to write welcome handshake response — {}", e);
                    return;
                }

                // ----------------------------------------------------------
                // 5. Switch to short polling timeout for the main loop.
                //    50 ms means the loop wakes up ~20×/second to check for
                //    pending outbound messages even when the socket is quiet.
                // ----------------------------------------------------------
                let _ = ws.get_ref().set_read_timeout(Some(Duration::from_millis(50)));

                // ----------------------------------------------------------
                // 6. Register write channel, mark Connected, drain queue.
                //    The write channel is the ONLY way to send data to the
                //    socket — all senders are now deadlock-free.
                // ----------------------------------------------------------
                let conn_id = client_conn.next_conn_id();
                let (write_tx, write_rx) = channel::<String>();
                client_conn.add_write_channel(conn_id, write_tx);
                status_conn.set(BridgeStatus::Connected);
                client_conn.drain_queue();

                // ----------------------------------------------------------
                // 7. Combined read + write polling loop.
                //    Order: flush all pending writes → attempt a read.
                // ----------------------------------------------------------
                'conn: loop {
                    // Drain all pending outbound messages (non-blocking).
                    loop {
                        match write_rx.try_recv() {
                            Ok(payload) => {
                                let write_res = ws.write(Message::Text(payload));
                                let flush_res = match write_res {
                                    Ok(_)  => ws.flush(),
                                    Err(e) => Err(e),
                                };
                                if let Err(e) = flush_res {
                                    eprintln!("[AEBridge] Error writing to socket: {}", e);
                                    break 'conn;
                                }
                            }
                            Err(TryRecvError::Empty)        => break,
                            Err(TryRecvError::Disconnected) => break 'conn,
                        }
                    }

                    // Read one frame (returns after ≤50 ms due to read timeout).
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
                            // Respond to WebSocket-level pings.
                            let _ = ws.write(Message::Pong(data));
                        }
                        Ok(Message::Close(_)) => {
                            break;
                        }
                        Ok(_) => {}
                        Err(tungstenite::Error::Io(ref e))
                            if e.kind() == io::ErrorKind::WouldBlock
                            || e.kind() == io::ErrorKind::TimedOut => {
                            // Normal: no data in the last 50 ms — continue polling.
                            continue;
                        }
                        Err(e) => {
                            eprintln!("[AEBridge] Error reading from socket: {}", e);
                            break;
                        }
                    }
                }

                // ----------------------------------------------------------
                // 8. Cleanup on disconnect.
                // ----------------------------------------------------------
                client_conn.remove_write_channel(conn_id);
                if !client_conn.is_connected() {
                    status_conn.set(BridgeStatus::Disconnected);
                }
            });
        }
    }

    // -----------------------------------------------------------------------
    // Heartbeat loop
    // -----------------------------------------------------------------------

    /// Sends a ping text frame every 30 seconds via the write channel.
    fn heartbeat_loop(client: Arc<AEBridgeClient>, _status: BridgeStatusTracker) {
        while RUNNING.load(Ordering::Relaxed) {
            // Sleep in small increments to allow responsive shutdown
            for _ in 0..300 {
                if !RUNNING.load(Ordering::Relaxed) {
                    return;
                }
                thread::sleep(Duration::from_millis(100));
            }

            let ping_msg = serde_json::json!({ "type": "ping" }).to_string();
            client.send_raw(ping_msg);
        }
    }
}
