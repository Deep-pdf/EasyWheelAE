use serde::{Serialize, Deserialize};

/// Represents a versioned command request sent from the Host to the Adobe extension.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CommandRequest {
    /// Protocol version.
    pub version: u32,

    /// Unique identifier for this request to match responses.
    pub request_id: String,

    /// ISO8601 UTC timestamp of request generation.
    pub timestamp: String,

    /// Command identifier (e.g. "easy_ease").
    pub command: String,

    /// Parameters for the command.
    pub parameters: serde_json::Value,

    /// The active profile (e.g., "After Effects").
    pub profile: String,
}
