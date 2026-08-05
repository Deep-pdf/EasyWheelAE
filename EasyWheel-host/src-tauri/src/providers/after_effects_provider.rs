use crate::models::command_context::CommandContext;
use crate::providers::provider::CommandProvider;
use crate::ae_bridge::AEBridge;
use crate::ipc::{
    CommandRequest,
    protocol::{PROTOCOL_VERSION, generate_request_id, get_iso8601_timestamp},
};

/// Command provider for Adobe After Effects actions.
pub struct AfterEffectsProvider;
impl CommandProvider for AfterEffectsProvider {
    fn can_execute(&self, action_id: &str, profile: &str) -> bool {
        profile == "Adobe After Effects" && (
            self.supported_actions().contains(&action_id) ||
            crate::command_registry::has_command(action_id)
        )
    }

    fn provider_name(&self) -> &'static str {
        "AfterEffectsProvider"
    }

    fn supported_actions(&self) -> Vec<&'static str> {
        vec![
            "easy_ease",
            "pre_compose",
            "trim_paths",
            "graph_editor",
            "duplicate_layer",
            "duplicate",
            "null_object",
            "parent",
            "after_effects_command",
            "execute_native_command",
        ]
    }

    fn execute(&self, context: &CommandContext) -> Result<(), String> {
        // Resolve the numeric command ID
        let command_id = if let Some(cmd) = crate::command_registry::get_command(&context.action_id) {
            cmd.command_id
        } else {
            // Fallback for legacy actions/names if they are not in the registry
            match context.action_id.as_str() {
                "easy_ease" => 2057,
                "pre_compose" => 2071,
                "duplicate" | "duplicate_layer" => 2007,
                "split_layer" => 2524,
                "graph_editor" => 2104, // default timeline graph editor toggle
                "trim_paths" => 2406,   // Trim Paths command ID (or shape layer trim paths)
                "parent" => 2410,       // Parent command ID fallback
                "null_object" => 2507,  // Null Object command ID fallback
                "horizontal_type_tool" | "new_text" => 2525, // Type tool command ID fallback
                _ => {
                    eprintln!("[AfterEffectsProvider] Error: Command '{}' not found in registry.", context.action_id);
                    return Err("Command not found.".to_string());
                }
            }
        };

        // Construct Request to execute the native command ID on After Effects bridge
        let req = CommandRequest {
            version: PROTOCOL_VERSION,
            request_id: generate_request_id(),
            timestamp: get_iso8601_timestamp(),
            command: "execute_native_command".to_string(),
            parameters: serde_json::json!({ "commandId": command_id }),
            profile: context.current_profile.clone(),
        };

        // Send via AEBridge
        match AEBridge::global().send_request(req) {
            Ok(response) => {
                if response.success {
                    Ok(())
                } else {
                    let err_code = response.error_code.unwrap_or_else(|| "UNKNOWN_ERROR".to_string());
                    let err_msg = format!(
                        "Extension returned error: {} - {}",
                        err_code, response.message
                    );
                    eprintln!("[AfterEffectsProvider] Error: {}", err_msg);
                    Err(format!("After Effects command failed: {}", response.message))
                }
            }
            Err(e) => {
                let err_msg = format!("Failed to communicate with After Effects: {}", e);
                eprintln!("[AfterEffectsProvider] Error: {}", err_msg);
                Err("After Effects Bridge is offline. Please verify that After Effects is running and the EasyWheel panel is open.".to_string())
            }
        }
    }
}


