use std::sync::{Arc, Mutex};
use serde::Serialize;

/// Connection status states of the Adobe After Effects Bridge.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
pub enum BridgeStatus {
    Disconnected,
    Connected,
}

/// Bounded, thread-safe wrapper around `BridgeStatus` to manage state transitions.
#[derive(Clone)]
pub struct BridgeStatusTracker {
    status: Arc<Mutex<BridgeStatus>>,
}

impl BridgeStatusTracker {
    /// Creates a new tracker initialized to `Disconnected`.
    pub fn new() -> Self {
        Self {
            status: Arc::new(Mutex::new(BridgeStatus::Disconnected)),
        }
    }

    /// Sets the status, printing a log on transitions.
    pub fn set(&self, new_status: BridgeStatus) {
        let mut guard = self.status.lock().unwrap_or_else(|e| e.into_inner());
        if *guard != new_status {
            *guard = new_status;
            match new_status {
                BridgeStatus::Connected => println!("[AEBridge] Info: Bridge Connected"),
                BridgeStatus::Disconnected => println!("[AEBridge] Info: Bridge Disconnected"),
            }
        }
    }
}
