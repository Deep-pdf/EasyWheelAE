use serde::{Deserialize, Serialize};

/// Contextual metadata passed to a command provider at execution time.
///
/// Contains information about the sector selection event, active profile,
/// and placeholders for future context parameters.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CommandContext {
    /// Programmatic identifier of the resolved action (e.g., `"trim_paths"`).
    pub action_id: String,

    /// Sector index selected by the user (0 to SECTOR_COUNT-1).
    pub selected_sector: u8,

    /// Name of the active profile at execution time (e.g., `"Adobe After Effects"`).
    pub current_profile: String,

    /// Executable filename of the foreground application (e.g., `"AfterFX.exe"`).
    pub executable_name: String,

    /// Unix epoch timestamp in milliseconds when the execution was triggered.
    pub timestamp: u64,

    /// Future placeholder: Modifier keys active during wheel release.
    pub modifier_keys: Vec<String>,

    /// Future placeholder: Screen coordinates (x, y) of mouse cursor during wheel release.
    pub mouse_position: Option<(i32, i32)>,

    /// Future placeholder: Current selected text/layer programmatic reference.
    pub selection: Option<String>,

    /// Dynamic command parameters as a JSON Value.
    pub parameters: serde_json::Value,
}
