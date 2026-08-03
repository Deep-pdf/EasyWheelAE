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
pub struct ActiveConnection {
    pub id: u64,
    pub tx: Sender<String>,
}

pub struct AEBridgeClient {
    /// Active connections to CEP client panels.
    write_txs: Arc<Mutex<Vec<ActiveConnection>>>,
    /// Incremented on each new connection.
    conn_id_counter: std::sync::atomic::AtomicU64,
    /// Maps request IDs to one-shot response channels.
    pending_requests: Arc<Mutex<HashMap<String, Sender<CommandResponse>>>>,
    queue: Arc<RequestQueue>,
    status: BridgeStatusTracker,
}

impl AEBridgeClient {
    /// Creates a new `AEBridgeClient` instance.
    pub fn new(status: BridgeStatusTracker, queue: Arc<RequestQueue>) -> Self {
        Self {
            write_txs: Arc::new(Mutex::new(Vec::new())),
            conn_id_counter: std::sync::atomic::AtomicU64::new(0),
            pending_requests: Arc::new(Mutex::new(HashMap::new())),
            queue,
            status,
        }
    }

    // -----------------------------------------------------------------------
    // Channel management — called by ConnectionManager
    // -----------------------------------------------------------------------

    /// Allocates a new unique connection ID.
    pub fn next_conn_id(&self) -> u64 {
        self.conn_id_counter.fetch_add(1, std::sync::atomic::Ordering::SeqCst)
    }

    /// Registers the write channel when a client connects.
    pub fn add_write_channel(&self, id: u64, tx: Sender<String>) {
        let mut guard = self.write_txs.lock().unwrap_or_else(|e| e.into_inner());
        guard.push(ActiveConnection { id, tx });
    }

    /// Clears the write channel when a client disconnects.
    pub fn remove_write_channel(&self, id: u64) {
        let mut guard = self.write_txs.lock().unwrap_or_else(|e| e.into_inner());
        guard.retain(|c| c.id != id);
    }

    // -----------------------------------------------------------------------
    // Connection state
    // -----------------------------------------------------------------------

    /// Returns `true` if a client is currently connected.
    pub fn is_connected(&self) -> bool {
        let guard = self.write_txs.lock().unwrap_or_else(|e| e.into_inner());
        !guard.is_empty()
    }

    /// Sends a raw JSON string to all connected server loops (broadcast).
    ///
    /// Returns `true` if the payload was handed off successfully to at least one sender;
    /// `false` if not connected or all channels have been closed.
    pub fn send_raw(&self, payload: String) -> bool {
        let mut guard = self.write_txs.lock().unwrap_or_else(|e| e.into_inner());
        let mut any_success = false;
        guard.retain(|conn| {
            if conn.tx.send(payload.clone()).is_ok() {
                any_success = true;
                true
            } else {
                false
            }
        });
        any_success
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
        if let Ok(json) = serde_json::from_str::<serde_json::Value>(text) {
            if let Some(msg_type) = json.get("type").and_then(|v| v.as_str()) {
                match msg_type {
                    "GET_PROFILE" => {
                        println!("[AEBridge] Info: GET_PROFILE request received");
                        let config = ConfigManager::get();
                        if let Some(profile) = config.profiles.iter().find(|p| {
                            p.name.to_ascii_lowercase().contains("after effects") ||
                            p.executable.to_ascii_lowercase() == "afterfx.exe"
                        }) {
                            let cep_profile = self.convert_profile_to_cep(profile);
                            let available_commands = self.get_available_commands();
                            let categories = self.get_categories();

                            let response = serde_json::json!({
                                "type": "PROFILE_DATA",
                                "profile": cep_profile,
                                "availableCommands": available_commands,
                                "categories": categories,
                                "registryVersion": "1.2.0",
                                "profileVersion": profile.version
                            }).to_string();

                            self.send_raw(response);
                            println!("[AEBridge] Info: PROFILE_DATA response sent");
                        } else {
                            eprintln!("[AEBridge] Error: After Effects profile not found in configuration");
                        }
                        return;
                    }
                    "UPDATE_PROFILE" => {
                        println!("[AEBridge] Info: UPDATE_PROFILE request received");
                        if let Some(incoming_profile_val) = json.get("profile") {
                            let incoming_version = incoming_profile_val.get("version").and_then(|v| v.as_u64()).unwrap_or(1) as u32;

                            let mut config = ConfigManager::get();
                            if let Some(idx) = config.profiles.iter().position(|p| {
                                p.name.to_ascii_lowercase().contains("after effects") ||
                                p.executable.to_ascii_lowercase() == "afterfx.exe"
                            }) {
                                let current_version = config.profiles[idx].version;
                                if incoming_version < current_version {
                                    eprintln!("[AEBridge] Error: UPDATE_PROFILE rejected due to outdated version (incoming: {}, current: {})", incoming_version, current_version);
                                    let cep_profile = self.convert_profile_to_cep(&config.profiles[idx]);
                                    let error_response = serde_json::json!({
                                        "type": "PROFILE_DATA",
                                        "profile": cep_profile,
                                        "availableCommands": self.get_available_commands(),
                                        "categories": self.get_categories(),
                                        "registryVersion": "1.2.0",
                                        "profileVersion": current_version
                                    }).to_string();
                                    self.send_raw(error_response);
                                    return;
                                }

                                let next_version = current_version + 1;
                                let mut updated_profile = config.profiles[idx].clone();
                                updated_profile.version = next_version;
                                updated_profile.last_modified = crate::ipc::protocol::get_iso8601_timestamp();
                                updated_profile.last_modified_by = "After Effects Panel".to_string();

                                if let Some(sectors_arr) = incoming_profile_val.get("sectors").and_then(|v| v.as_array()) {
                                    let mut new_assignments = std::collections::HashMap::new();
                                    for sector_val in sectors_arr {
                                        if let (Some(num), Some(cmd_id_val)) = (
                                            sector_val.get("number").and_then(|v| v.as_u64()),
                                            sector_val.get("assignedCommandId")
                                        ) {
                                            let sector_idx = (num - 1) as u8;
                                            if !cmd_id_val.is_null() {
                                                if let Some(cmd_id_str) = cmd_id_val.as_str() {
                                                    let display_name = crate::command_registry::get_command(cmd_id_str)
                                                        .map(|c| c.name)
                                                        .unwrap_or_else(|| cmd_id_str.to_string());
                                                    new_assignments.insert(
                                                        sector_idx,
                                                        crate::models::profile::ConfiguredCommand::legacy(cmd_id_str, &display_name)
                                                    );
                                                }
                                            }
                                        }
                                    }
                                    updated_profile.sector_assignments = new_assignments;
                                }

                                config.profiles[idx] = updated_profile.clone();

                                if let Err(e) = ConfigManager::update_and_save(config) {
                                    eprintln!("[AEBridge] Error: Failed to save updated profile: {}", e);
                                    return;
                                }

                                println!("[AEBridge] Info: Profile version {} saved successfully", next_version);
                            }
                        }
                        return;
                    }
                    _ => {}
                }
            }

            if let Ok(res) = serde_json::from_value::<CommandResponse>(json) {
                let req_id = res.request_id.clone();
                let mut pending = self.pending_requests.lock().unwrap_or_else(|e| e.into_inner());
                if let Some(tx) = pending.remove(&req_id) {
                    let _ = tx.send(res);
                }
                return;
            }
        }
        eprintln!("[AEBridge] Error: Failed to parse incoming message: {}", text);
    }

    /// Helper: Converts a Host Profile into a CEP-compatible Profile JSON.
    fn convert_profile_to_cep(&self, profile: &crate::models::profile::Profile) -> serde_json::Value {
        let mut sectors = Vec::new();
        for i in 0..8 {
            let number = i + 1;
            let assigned_command_id = profile.sector_assignments.get(&i).map(|c| c.command_id.clone());
            sectors.push(serde_json::json!({
                "number": number,
                "assignedCommandId": assigned_command_id
            }));
        }

        serde_json::json!({
            "name": profile.name,
            "application": "After Effects",
            "sectorCount": 8,
            "sectors": sectors,
            "version": profile.version,
            "lastModified": profile.last_modified,
            "lastModifiedBy": profile.last_modified_by
        })
    }

    /// Helper: Retrieves available AE commands for the CEP picker.
    fn get_available_commands(&self) -> Vec<serde_json::Value> {
        crate::command_registry::get_commands().iter().map(|c| {
            serde_json::json!({
                "id": c.id,
                "name": c.name,
                "category": c.category,
                "description": c.description,
                "executionType": "Native"
            })
        }).collect()
    }

    /// Helper: Retrieves unique categories from command registry.
    fn get_categories(&self) -> Vec<String> {
        let mut categories: Vec<String> = crate::command_registry::get_commands()
            .iter()
            .map(|c| c.category.clone())
            .collect();
        categories.sort();
        categories.dedup();
        categories
    }
}
