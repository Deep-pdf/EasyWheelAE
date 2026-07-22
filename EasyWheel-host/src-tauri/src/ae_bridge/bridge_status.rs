use std::sync::{Arc, Mutex};
use serde::Serialize;

/// Connection status states of the Adobe After Effects Bridge.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
pub enum BridgeStatus {
    Disconnected,
    Connecting,
    Connected,
    Reconnecting,
    TimedOut,
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

    /// Gets a snapshot of the current status.
    pub fn get(&self) -> BridgeStatus {
        *self.status.lock().unwrap_or_else(|e| e.into_inner())
    }

    /// Sets the status, printing a log on transitions.
    pub fn set(&self, new_status: BridgeStatus) {
        let mut guard = self.status.lock().unwrap_or_else(|e| e.into_inner());
        if *guard != new_status {
            *guard = new_status;
            println!("[AEBridge] Status: {:?}", new_status);
        }
    }
}
