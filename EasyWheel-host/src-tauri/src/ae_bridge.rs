use std::collections::HashMap;
use std::io::{BufRead, BufReader, Write};
use std::net::TcpStream;
use std::sync::{Arc, Mutex, OnceLock};
use std::sync::mpsc::{channel, Sender, RecvTimeoutError};
use std::thread;
use std::time::Duration;

use crate::config_manager::ConfigManager;
use crate::ipc::{CommandRequest, CommandResponse};

/// Represents the connection state of the Adobe AE Bridge.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ConnectionState {
    Connected,
    Disconnected,
}

static AE_BRIDGE: OnceLock<Arc<AEBridge>> = OnceLock::new();

/// Manages the connection lifecycle and communication with After Effects.
pub struct AEBridge {
    state: Mutex<ConnectionState>,
    writer: Mutex<Option<TcpStream>>,
    pending_requests: Mutex<HashMap<String, Sender<CommandResponse>>>,
}

impl AEBridge {
    /// Returns the global thread-safe instance of the `AEBridge`.
    pub fn global() -> Arc<Self> {
        AE_BRIDGE.get_or_init(|| {
            Arc::new(Self {
                state: Mutex::new(ConnectionState::Disconnected),
                writer: Mutex::new(None),
                pending_requests: Mutex::new(HashMap::new()),
            })
        }).clone()
    }

    /// Starts the background reconnection manager thread.
    pub fn start() {
        let bridge = Self::global();
        thread::spawn(move || {
            bridge.reconnection_loop();
        });
    }

    /// Checks if the bridge is currently connected to the After Effects extension.
    pub fn is_connected(&self) -> bool {
        *self.state.lock().unwrap_or_else(|e| e.into_inner()) == ConnectionState::Connected
    }

    fn set_state(&self, new_state: ConnectionState) {
        let mut state_guard = self.state.lock().unwrap_or_else(|e| e.into_inner());
        *state_guard = new_state;
    }

    /// Periodic loop attempting connection whenever the bridge is disconnected.
    fn reconnection_loop(&self) {
        println!("[AEBridge] Info: Starting connection manager thread.");
        loop {
            if !self.is_connected() {
                let config = ConfigManager::get();
                let port = config.global.adobe_port;
                let retry_interval = Duration::from_millis(config.global.adobe_retry_interval_ms);
                
                println!(
                    "[AEBridge] Info: Attempting to connect to After Effects extension on port {}...",
                    port
                );
                
                match TcpStream::connect(format!("127.0.0.1:{}", port)) {
                    Ok(stream) => {
                        println!("[AEBridge] Info: Connection established with After Effects extension.");
                        
                        let read_stream = match stream.try_clone() {
                            Ok(s) => s,
                            Err(e) => {
                                eprintln!("[AEBridge] Error: Failed to clone stream: {}", e);
                                thread::sleep(retry_interval);
                                continue;
                            }
                        };

                        {
                            let mut writer_guard = self.writer.lock().unwrap_or_else(|e| e.into_inner());
                            *writer_guard = Some(stream);
                        }

                        self.set_state(ConnectionState::Connected);

                        // Spawn reader thread
                        let bridge_clone = Self::global();
                        thread::spawn(move || {
                            bridge_clone.reader_loop(read_stream);
                        });
                    }
                    Err(_e) => {
                        // Connection failed; sleep for retry interval
                        thread::sleep(retry_interval);
                    }
                }
            } else {
                // Connected; sleep briefly before checking state again
                thread::sleep(Duration::from_millis(1000));
            }
        }
    }

    /// Reader loop executing on a dedicated thread for receiving responses.
    fn reader_loop(&self, stream: TcpStream) {
        let reader = BufReader::new(stream);
        for line in reader.lines() {
            match line {
                Ok(l) => {
                    let trimmed = l.trim();
                    if trimmed.is_empty() {
                        continue;
                    }
                    self.handle_incoming_response(trimmed);
                }
                Err(e) => {
                    eprintln!("[AEBridge] Error: Read error (connection likely lost): {}", e);
                    break;
                }
            }
        }
        self.handle_disconnect();
    }

    /// Delivers responses to the appropriate waiting request thread.
    fn handle_incoming_response(&self, line: &str) {
        match serde_json::from_str::<CommandResponse>(line) {
            Ok(res) => {
                let req_id = res.request_id.clone();
                let mut pending = self.pending_requests.lock().unwrap_or_else(|e| e.into_inner());
                if let Some(tx) = pending.remove(&req_id) {
                    let _ = tx.send(res);
                } else {
                    println!(
                        "[AEBridge] Warning: Received response for unknown or timed-out request ID: {}",
                        req_id
                    );
                }
            }
            Err(e) => {
                eprintln!("[AEBridge] Error: Failed to parse incoming response: {}. Data: {}", e, line);
            }
        }
    }

    /// Handles socket disconnection by resetting state and cancelling pending requests.
    fn handle_disconnect(&self) {
        // Double check connection state to avoid redundant logs
        let was_connected = self.is_connected();
        self.set_state(ConnectionState::Disconnected);
        
        {
            let mut writer_guard = self.writer.lock().unwrap_or_else(|e| e.into_inner());
            *writer_guard = None;
        }

        {
            let mut pending = self.pending_requests.lock().unwrap_or_else(|e| e.into_inner());
            pending.clear();
        }

        if was_connected {
            println!("[AEBridge] Info: Disconnected from After Effects extension.");
        }
    }

    /// Sends a request and blocks waiting for the response with a timeout.
    pub fn send_request(&self, req: CommandRequest) -> Result<CommandResponse, String> {
        let req_id = req.request_id.clone();
        
        if !self.is_connected() {
            return Err("Extension unavailable".to_string());
        }

        let (tx, rx) = channel();
        {
            let mut pending = self.pending_requests.lock().unwrap_or_else(|e| e.into_inner());
            pending.insert(req_id.clone(), tx);
        }

        let mut payload = match serde_json::to_string(&req) {
            Ok(p) => p,
            Err(e) => {
                let mut pending = self.pending_requests.lock().unwrap_or_else(|e| e.into_inner());
                pending.remove(&req_id);
                return Err(format!("Malformed request: Failed to serialize: {}", e));
            }
        };
        payload.push('\n');

        let write_result = {
            let mut writer_guard = self.writer.lock().unwrap_or_else(|e| e.into_inner());
            if let Some(ref mut stream) = *writer_guard {
                stream.write_all(payload.as_bytes())
                    .and_then(|_| stream.flush())
            } else {
                Err(std::io::Error::new(std::io::ErrorKind::NotConnected, "Socket not open"))
            }
        };

        if let Err(e) = write_result {
            let mut pending = self.pending_requests.lock().unwrap_or_else(|e| e.into_inner());
            pending.remove(&req_id);
            eprintln!("[AEBridge] Error: Failed to write to TCP socket: {}", e);
            self.handle_disconnect();
            return Err("Lost connection".to_string());
        }

        println!("[AEBridge] Info: Request Sent: {} (ID: {})", req.command, req_id);

        let config = ConfigManager::get();
        let timeout = Duration::from_millis(config.global.adobe_timeout_ms);
        
        match rx.recv_timeout(timeout) {
            Ok(res) => {
                println!(
                    "[AEBridge] Info: Response Received: {} (ID: {}, success: {}, executionTime: {}ms)",
                    req.command, res.request_id, res.success, res.execution_time
                );
                Ok(res)
            }
            Err(RecvTimeoutError::Timeout) => {
                let mut pending = self.pending_requests.lock().unwrap_or_else(|e| e.into_inner());
                pending.remove(&req_id);
                eprintln!("[AEBridge] Error: Timeout occurred waiting for response to request: {}", req_id);
                Err("IPC timeout".to_string())
            }
            Err(RecvTimeoutError::Disconnected) => {
                eprintln!("[AEBridge] Error: Connection closed while waiting for response to request: {}", req_id);
                Err("Lost connection".to_string())
            }
        }
    }
}
