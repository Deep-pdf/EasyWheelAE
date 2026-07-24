use serde::Deserialize;
use crate::models::command_context::CommandContext;
use crate::providers::provider::CommandProvider;

/// Command provider for Adobe Photoshop actions.
pub struct PhotoshopProvider;

#[derive(Debug, Clone, Deserialize)]
struct PSCommandParams {
    #[allow(dead_code)]
    command: String,
}

impl CommandProvider for PhotoshopProvider {
    fn can_execute(&self, action_id: &str) -> bool {
        self.supported_actions().contains(&action_id)
    }

    fn provider_name(&self) -> &'static str {
        "PhotoshopProvider"
    }

    fn supported_actions(&self) -> Vec<&'static str> {
        vec![
            // Legacy Actions
            "brush",
            "eraser",
            "gradient",
            "crop",
            "duplicate",
            // Parameterized Command
            "photoshop_command",
        ]
    }

    fn execute(&self, context: &CommandContext) -> Result<(), String> {
        if context.action_id == "photoshop_command" {
            let _params: PSCommandParams = serde_json::from_value(context.parameters.clone())
                .map_err(|e| format!("Invalid parameters for photoshop_command: {}", e))?;
        }
        Ok(())
    }
}
