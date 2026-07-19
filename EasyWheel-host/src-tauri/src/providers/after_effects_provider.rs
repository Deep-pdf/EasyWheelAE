use crate::models::command_context::CommandContext;
use crate::providers::provider::CommandProvider;

/// Command provider placeholder for Adobe After Effects actions.
pub struct AfterEffectsProvider;

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
            "duplicate", // Support default profile action
            "parent",    // Support default profile action
        ]
    }

    fn execute(&self, context: &CommandContext) -> Result<(), String> {
        println!(
            "[AfterEffectsProvider] Info: Adobe Provider Executing {}",
            context.action_id
        );
        Ok(())
    }
}
