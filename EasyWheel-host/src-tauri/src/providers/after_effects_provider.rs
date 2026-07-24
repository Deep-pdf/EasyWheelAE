use serde::Deserialize;
use crate::models::command_context::CommandContext;
use crate::providers::provider::CommandProvider;
use crate::ae_bridge::AEBridge;
use crate::ipc::{
    CommandRequest,
    protocol::{PROTOCOL_VERSION, generate_request_id, get_iso8601_timestamp},
};

/// Command provider for Adobe After Effects actions.
pub struct AfterEffectsProvider;

#[derive(Debug, Clone, Deserialize)]
struct AECommandParams {
    command: String,
}

impl CommandProvider for AfterEffectsProvider {
    fn can_execute(&self, action_id: &str) -> bool {
        self.supported_actions().contains(&action_id)
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
            "null_object",
            "after_effects_command",
        ]
    }

    fn execute(&self, context: &CommandContext) -> Result<(), String> {
        let command_name = if context.action_id == "after_effects_command" {
            let params: AECommandParams = serde_json::from_value(context.parameters.clone())
                .map_err(|e| format!("Invalid parameters for after_effects_command: {}", e))?;
            params.command
        } else {
            context.action_id.clone()
        };

        // Construct Request
        let req = CommandRequest {
            version: PROTOCOL_VERSION,
            request_id: generate_request_id(),
            timestamp: get_iso8601_timestamp(),
            command: command_name.clone(),
            parameters: context.parameters.clone(),
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
                    Err(err_msg)
                }
            }
            Err(e) => {
                let err_msg = format!("Failed to communicate with After Effects: {}", e);
                eprintln!("[AfterEffectsProvider] Error: {}", err_msg);
                Err(err_msg)
            }
        }
    }
}

