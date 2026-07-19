use std::process::Command;
use crate::models::command_context::CommandContext;
use crate::providers::provider::CommandProvider;

/// Command provider for built-in Windows shell actions and utilities.
pub struct WindowsProvider;

impl CommandProvider for WindowsProvider {
    fn can_execute(&self, action_id: &str) -> bool {
        self.supported_actions().contains(&action_id)
    }

    fn provider_name(&self) -> &'static str {
        "WindowsProvider"
    }

    fn supported_actions(&self) -> Vec<&'static str> {
        vec![
            "open_explorer",
            "calculator",
            "browser",
            "clipboard",
            "settings",
        ]
    }

    fn execute(&self, context: &CommandContext) -> Result<(), String> {
        println!(
            "[WindowsProvider] Info: Executing action '{}' (profile: '{}', executable: '{}')",
            context.action_id, context.current_profile, context.executable_name
        );

        #[cfg(target_os = "windows")]
        {
            match context.action_id.as_str() {
                "open_explorer" => {
                    Command::new("explorer.exe")
                        .spawn()
                        .map_err(|e| format!("Failed to launch explorer: {}", e))?;
                }
                "calculator" => {
                    Command::new("calc.exe")
                        .spawn()
                        .map_err(|e| format!("Failed to launch calculator: {}", e))?;
                }
                "browser" => {
                    Command::new("explorer.exe")
                        .arg("https://www.google.com")
                        .spawn()
                        .map_err(|e| format!("Failed to open browser: {}", e))?;
                }
                "clipboard" => {
                    Command::new("explorer.exe")
                        .arg("ms-settings:clipboard")
                        .spawn()
                        .map_err(|e| format!("Failed to open clipboard settings: {}", e))?;
                }
                "settings" => {
                    if let Some(app) = crate::app_state::get_app_handle() {
                        crate::window_manager::WindowManager::show_and_focus(app);
                    } else {
                        Command::new("explorer.exe")
                            .arg("ms-settings:")
                            .spawn()
                            .map_err(|e| format!("Failed to open Windows settings: {}", e))?;
                    }
                }
                _ => return Err(format!("Unsupported action '{}'", context.action_id)),
            }
            Ok(())
        }

        #[cfg(not(target_os = "windows"))]
        {
            match context.action_id.as_str() {
                "open_explorer" | "calculator" | "browser" | "clipboard" | "settings" => {
                    println!(
                        "[WindowsProvider] Stub: Action '{}' executed (non-Windows platform mock).",
                        context.action_id
                    );
                    Ok(())
                }
                _ => Err(format!("Unsupported action '{}'", context.action_id)),
            }
        }
    }
}
