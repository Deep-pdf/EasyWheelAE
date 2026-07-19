use crate::models::command_context::CommandContext;
use crate::providers::provider::CommandProvider;

/// Command provider placeholder for Adobe Photoshop actions.
pub struct PhotoshopProvider;

impl CommandProvider for PhotoshopProvider {
    fn can_execute(&self, action_id: &str) -> bool {
        self.supported_actions().contains(&action_id)
    }

    fn provider_name(&self) -> &'static str {
        "PhotoshopProvider"
    }

    fn supported_actions(&self) -> Vec<&'static str> {
        vec![
            "brush",
            "eraser",
            "gradient",
            "crop",
            "duplicate", // Support default profile action
        ]
    }

    fn execute(&self, context: &CommandContext) -> Result<(), String> {
        println!(
            "[PhotoshopProvider] Info: Photoshop Provider Executing {}",
            context.action_id
        );
        Ok(())
    }
}
