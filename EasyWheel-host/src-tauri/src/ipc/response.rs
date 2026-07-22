use serde::{Serialize, Deserialize};

/// Represents a response from the Adobe extension to a specific command.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CommandResponse {
    /// Protocol version.
    pub version: u32,

    /// Unique identifier matching the request ID.
    pub request_id: String,

    /// Whether execution succeeded.
    pub success: bool,

    /// Error code if execution failed.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error_code: Option<String>,

    /// Human-readable message or result.
    pub message: String,

    /// Execution time on the extension in milliseconds.
    pub execution_time: u64,
}
