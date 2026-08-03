pub mod bridge_status;
pub mod request_queue;
pub mod connection_manager;
pub mod ae_bridge_client;

use std::sync::{Arc, OnceLock};
use crate::ipc::{CommandRequest, CommandResponse};
use crate::config_manager::ConfigManager;

pub use bridge_status::BridgeStatusTracker;
pub use request_queue::RequestQueue;
pub use ae_bridge_client::AEBridgeClient;
pub use connection_manager::ConnectionManager;

static AE_BRIDGE: OnceLock<Arc<AEBridge>> = OnceLock::new();

/// The primary orchestrator/facade for the After Effects connection bridge.
pub struct AEBridge {
    pub client: Arc<AEBridgeClient>,
    pub status: BridgeStatusTracker,
}

impl AEBridge {
    /// Returns the global, thread-safe instance of the `AEBridge`.
    pub fn global() -> Arc<Self> {
        AE_BRIDGE.get_or_init(|| {
            let status = BridgeStatusTracker::new();
            let config = ConfigManager::get();
            let queue = Arc::new(RequestQueue::new(config.global.adobe_max_queue_size));
            let client = Arc::new(AEBridgeClient::new(status.clone(), queue.clone()));
            Arc::new(Self {
                client,
                status,
            })
        }).clone()
    }

    /// Starts the background connection manager and heartbeat threads.
    pub fn start() {
        let bridge = Self::global();
        let connection_manager = ConnectionManager::new(bridge.client.clone(), bridge.status.clone());
        connection_manager.start();

        // Subscribe to configuration changes to broadcast PROFILE_UPDATED
        ConfigManager::subscribe(|| {
            let bridge = Self::global();
            if bridge.client.is_connected() {
                let config = ConfigManager::get();
                if let Some(profile) = config.profiles.iter().find(|p| {
                    p.name.to_ascii_lowercase().contains("after effects") ||
                    p.executable.to_ascii_lowercase() == "afterfx.exe"
                }) {
                    let mut sectors = Vec::new();
                    for i in 0..8 {
                        let number = i + 1;
                        let assigned_command_id = profile.sector_assignments.get(&i).map(|c| c.command_id.clone());
                        sectors.push(serde_json::json!({
                            "number": number,
                            "assignedCommandId": assigned_command_id
                        }));
                    }
                    let cep_profile = serde_json::json!({
                        "name": profile.name,
                        "application": "After Effects",
                        "sectorCount": 8,
                        "sectors": sectors,
                        "version": profile.version,
                        "lastModified": profile.last_modified,
                        "lastModifiedBy": profile.last_modified_by
                    });

                    let msg = serde_json::json!({
                        "type": "PROFILE_UPDATED",
                        "application": "After Effects",
                        "profile": cep_profile
                    }).to_string();
                    bridge.client.send_raw(msg);
                }
            }
        });
    }



    /// Sends a command request over the client, returning the response or error.
    pub fn send_request(&self, req: CommandRequest) -> Result<CommandResponse, String> {
        self.client.send_request(req)
    }
}
