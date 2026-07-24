use crate::models::command_context::CommandContext;
use crate::provider_registry::global;

/// Dispatches command execution to the appropriate command provider.
pub struct CommandDispatcher;

impl CommandDispatcher {
    /// Dispatches the execution of a resolved command context to a registered provider.
    ///
    /// Logs all states of the dispatching pipeline: resolved action, provider search,
    /// execution outcome, and warning cases.
    pub fn dispatch(context: CommandContext) -> Result<(), String> {
        let provider = {
            let registry = global().lock().unwrap_or_else(|e| e.into_inner());
            registry.find_by_action(&context.action_id, &context.current_profile)
        };

        match provider {
            Some(provider) => {

                match provider.execute(&context) {
                    Ok(_) => {
                        println!(
                            "[CommandDispatcher] Info: Provider Executed: '{}' successfully for action '{}'",
                            provider.provider_name(),
                            context.action_id
                        );
                        Ok(())
                    }
                    Err(err) => {
                        eprintln!(
                            "[CommandDispatcher] Error: Execution Failed: provider '{}' failed executing action '{}': {}",
                            provider.provider_name(),
                            context.action_id,
                            err
                        );
                        Err(err)
                    }
                }
            }
            None => {
                eprintln!(
                    "[CommandDispatcher] Warning: Unknown Provider/Action: No provider found for action '{}'",
                    context.action_id
                );
                Err(format!("Unknown action ID: '{}' (no provider registered)", context.action_id))
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::command_context::CommandContext;
    use crate::providers::register_defaults;

    #[test]
    fn test_provider_lookup_and_dispatch() {
        // Ensure defaults are registered
        register_defaults();

        // 1. Test Windows Provider action
        let win_ctx = CommandContext {
            action_id: "calculator".to_string(),
            selected_sector: 2,
            current_profile: "Desktop".to_string(),
            executable_name: "explorer.exe".to_string(),
            timestamp: 0,
            modifier_keys: vec![],
            mouse_position: None,
            selection: None,
            parameters: serde_json::Value::Object(serde_json::Map::new()),
        };
        let res = CommandDispatcher::dispatch(win_ctx);
        assert!(res.is_ok());

        // 1.5. Test Windows Provider parameterized launch_app
        let launch_ctx = CommandContext {
            action_id: "launch_app".to_string(),
            selected_sector: 2,
            current_profile: "Desktop".to_string(),
            executable_name: "explorer.exe".to_string(),
            timestamp: 0,
            modifier_keys: vec![],
            mouse_position: None,
            selection: None,
            parameters: serde_json::json!({
                "path": "calc.exe",
                "arguments": "",
                "working_directory": "",
                "run_as_admin": false
            }),
        };
        let res = CommandDispatcher::dispatch(launch_ctx);
        assert!(res.is_ok());

        // 2. Test After Effects Provider action
        let ae_ctx = CommandContext {
            action_id: "trim_paths".to_string(),
            selected_sector: 2,
            current_profile: "Adobe After Effects".to_string(),
            executable_name: "AfterFX.exe".to_string(),
            timestamp: 0,
            modifier_keys: vec![],
            mouse_position: None,
            selection: None,
            parameters: serde_json::Value::Object(serde_json::Map::new()),
        };
        let res = CommandDispatcher::dispatch(ae_ctx);
        if crate::ae_bridge::AEBridge::global().client.is_connected() {
            assert!(res.is_ok());
        } else {
            assert!(res.is_err());
        }

        // 3. Test Photoshop Provider action
        let ps_ctx = CommandContext {
            action_id: "brush".to_string(),
            selected_sector: 0,
            current_profile: "Adobe Photoshop".to_string(),
            executable_name: "Photoshop.exe".to_string(),
            timestamp: 0,
            modifier_keys: vec![],
            mouse_position: None,
            selection: None,
            parameters: serde_json::Value::Object(serde_json::Map::new()),
        };
        let res = CommandDispatcher::dispatch(ps_ctx);
        assert!(res.is_ok());

        // 4. Test Unknown action fails gracefully
        let unknown_ctx = CommandContext {
            action_id: "non_existent_action_xyz".to_string(),
            selected_sector: 0,
            current_profile: "Desktop".to_string(),
            executable_name: "explorer.exe".to_string(),
            timestamp: 0,
            modifier_keys: vec![],
            mouse_position: None,
            selection: None,
            parameters: serde_json::Value::Object(serde_json::Map::new()),
        };
        let res = CommandDispatcher::dispatch(unknown_ctx);
        assert!(res.is_err());
    }
}
