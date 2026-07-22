pub mod bridge_status;
pub mod request_queue;
pub mod connection_manager;
pub mod ae_bridge_client;

use std::sync::{Arc, OnceLock};
use crate::ipc::{CommandRequest, CommandResponse};
use crate::config_manager::ConfigManager;

pub use bridge_status::{BridgeStatusTracker, BridgeStatus};
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
    }

    /// Helper to check if the WebSocket client is connected.
    pub fn is_connected(&self) -> bool {
        self.client.is_connected()
    }

    /// Sends a command request over the client, returning the response or error.
    pub fn send_request(&self, req: CommandRequest) -> Result<CommandResponse, String> {
        self.client.send_request(req)
    }
}
