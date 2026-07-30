use std::sync::OnceLock;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AECommand {
    pub id: String,
    pub name: String,
    pub category: String,
    pub r#type: String,
    #[serde(rename = "commandId")]
    pub command_id: u32,
    pub description: String,
}

static REGISTRY: OnceLock<Vec<AECommand>> = OnceLock::new();

/// Returns all commands in the registry, parsing them on the first call.
pub fn get_commands() -> &'static Vec<AECommand> {
    REGISTRY.get_or_init(|| {
        let json_str = include_str!("command_registry.json");
        serde_json::from_str(json_str).unwrap_or_else(|e| {
            eprintln!("[CommandRegistry] Error: Failed to parse embedded command_registry.json: {}", e);
            Vec::new()
        })
    })
}

/// Checks if a command with the given action_id exists in the registry.
pub fn has_command(action_id: &str) -> bool {
    get_commands().iter().any(|c| c.id == action_id)
}

/// Returns a clone of the command with the given action_id, if found.
pub fn get_command(action_id: &str) -> Option<AECommand> {
    get_commands().iter().find(|c| c.id == action_id).cloned()
}
