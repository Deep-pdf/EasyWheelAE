use super::browser_bridge::BrowserBridge;
use crate::models::command_context::CommandContext;
use crate::providers::provider::CommandProvider;
use serde::Deserialize;

pub struct BrowserProviderImpl;

#[derive(Debug, Clone, Deserialize)]
struct OpenWebsiteParams {
    url: String,
    browser: Option<String>,
    switch_to_existing: Option<bool>,
}

impl CommandProvider for BrowserProviderImpl {
    fn can_execute(&self, action_id: &str, _profile: &str) -> bool {
        self.supported_actions().contains(&action_id)
    }

    fn provider_name(&self) -> &'static str {
        "BrowserProvider"
    }

    fn supported_actions(&self) -> Vec<&'static str> {
        vec!["open_website"]
    }

    fn execute(&self, context: &CommandContext) -> Result<(), String> {
        match context.action_id.as_str() {
            "open_website" => {
                let params: OpenWebsiteParams = serde_json::from_value(context.parameters.clone())
                    .map_err(|e| format!("Invalid parameters for open_website: {}", e))?;

                let browser = params
                    .browser
                    .clone()
                    .unwrap_or_else(|| "default".to_string());
                let switch_to = params.switch_to_existing.unwrap_or(true);
                let mut matched = false;

                if switch_to {
                    let bridge = BrowserBridge::global();
                    if let Some(tab) = bridge.find_matching_tab(&params.url, &browser) {
                        matched = true;
                        bridge.activate_tab(&tab)?;
                    }
                }

                if !matched {
                    let bridge = BrowserBridge::global();
                    bridge.open_launch_url(&params.url, &browser)?;
                }

                Ok(())
            }
            _ => Err(format!("Unsupported action: {}", context.action_id)),
        }
    }
}
