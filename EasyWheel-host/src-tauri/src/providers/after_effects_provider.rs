use serde::Deserialize;
use crate::models::command_context::CommandContext;
use crate::providers::provider::CommandProvider;

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
            // Legacy Actions
            "easy_ease",
            "pre_compose",
            "trim_paths",
            "graph_editor",
            "duplicate_layer",
            "duplicate",
            "parent",
            // Parameterized Command
            "after_effects_command",
        ]
    }

    fn execute(&self, context: &CommandContext) -> Result<(), String> {
        if context.action_id == "after_effects_command" {
            let params: AECommandParams = serde_json::from_value(context.parameters.clone())
                .map_err(|e| format!("Invalid parameters for after_effects_command: {}", e))?;
            println!(
                "[AfterEffectsProvider] Info: Adobe Provider Executing {}",
                params.command
            );
        } else {
            println!(
                "[AfterEffectsProvider] Info: Adobe Provider Executing {}",
                context.action_id
            );
        }
        Ok(())
    }
}
