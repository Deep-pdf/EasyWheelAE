//! `BlenderProvider` — `CommandProvider` implementation for Blender.
//!
//! # can_execute strictness (Phase 3)
//!
//! Only action IDs in the explicit `SUPPORTED_ACTIONS` list are accepted.
//! Arbitrary `blender.*` strings are NOT accepted.  This prevents accidental
//! routing of mis-spelled or future action IDs that are not yet implemented.
//!
//! # Legacy "duplicate" alias
//!
//! Saved Blender profiles created before the `blender.*` prefix was adopted
//! may contain `"duplicate"` as the action ID.  `BlenderProvider` handles this
//! by:
//!   - Including `"duplicate"` in `SUPPORTED_ACTIONS` (so `can_execute` returns `true`).
//!   - Mapping it to `"blender.duplicate"` in `execute()` before sending it
//!     over the wire to the add-on.

use crate::blender::BlenderBridge;
use crate::ipc::{CommandRequest, CommandResponse};
use crate::ipc::protocol::{PROTOCOL_VERSION, generate_request_id, get_iso8601_timestamp};
use crate::models::command_context::CommandContext;
use crate::providers::provider::CommandProvider;

/// All action IDs that `BlenderProvider` handles.  Phase 3 only.
/// Must be kept in sync with the command handlers registered in dispatcher.py.
const SUPPORTED_ACTIONS: &[&str] = &[
    // Phase 3 blender.* namespace
    "blender.test_connection",
    "blender.add_cube",
    "blender.delete_selected",
    "blender.duplicate",
    "blender.frame_selected",
    // Legacy alias — may appear in user configs saved before the blender.* prefix
    "duplicate",
];

pub struct BlenderProvider;

impl CommandProvider for BlenderProvider {
    /// Returns `true` only when:
    ///   - The active profile is **exactly** `"Blender"`, AND
    ///   - `action_id` is in the explicit `SUPPORTED_ACTIONS` list.
    ///
    /// Arbitrary `blender.*` strings are NOT matched; every supported action
    /// must be explicitly enumerated.
    fn can_execute(&self, action_id: &str, profile: &str) -> bool {
        profile == "Blender" && SUPPORTED_ACTIONS.contains(&action_id)
    }

    fn provider_name(&self) -> &'static str {
        "BlenderProvider"
    }

    fn supported_actions(&self) -> Vec<&'static str> {
        SUPPORTED_ACTIONS.to_vec()
    }

    fn execute(&self, context: &CommandContext) -> Result<(), String> {
        // Normalise the legacy "duplicate" alias to the canonical wire command.
        let command = match context.action_id.as_str() {
            "duplicate" => "blender.duplicate".to_string(),
            other       => other.to_string(),
        };

        let req = CommandRequest {
            version:    PROTOCOL_VERSION,
            request_id: generate_request_id(),
            timestamp:  get_iso8601_timestamp(),
            command,
            parameters: context.parameters.clone(),
            profile:    context.current_profile.clone(),
        };

        match BlenderBridge::global().send_request(req) {
            Ok(CommandResponse { success: true, .. }) => Ok(()),
            Ok(res) => {
                let code = res.error_code.as_deref().unwrap_or("unknown");
                eprintln!(
                    "[BlenderProvider] Error: Command '{}' failed — code={} message={}",
                    context.action_id, code, res.message
                );
                Err(format!("Blender returned error: {}", res.message))
            }
            Err(e) => {
                eprintln!(
                    "[BlenderProvider] Error: '{}' — {}",
                    context.action_id, e
                );
                Err(format!("Blender command failed: {}", e))
            }
        }
    }
}

// ── Unit tests ────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn can_execute_phase3_actions_in_blender_profile() {
        let p = BlenderProvider;
        assert!(p.can_execute("blender.test_connection", "Blender"));
        assert!(p.can_execute("blender.add_cube",        "Blender"));
        assert!(p.can_execute("blender.delete_selected", "Blender"));
        assert!(p.can_execute("blender.duplicate",       "Blender"));
        assert!(p.can_execute("blender.frame_selected",  "Blender"));
    }

    #[test]
    fn can_execute_legacy_duplicate_in_blender_profile() {
        let p = BlenderProvider;
        assert!(p.can_execute("duplicate", "Blender"));
    }

    #[test]
    fn cannot_execute_arbitrary_blender_prefix() {
        let p = BlenderProvider;
        // Phase 3: arbitrary blender.* strings are NOT accepted.
        assert!(!p.can_execute("blender.some_future_command", "Blender"));
        assert!(!p.can_execute("blender.",                    "Blender"));
    }

    #[test]
    fn cannot_execute_in_wrong_profile() {
        let p = BlenderProvider;
        assert!(!p.can_execute("blender.add_cube", "Adobe After Effects"));
        assert!(!p.can_execute("blender.add_cube", ""));
        assert!(!p.can_execute("duplicate",        "Adobe After Effects"));
    }

    #[test]
    fn cannot_execute_ae_actions_in_blender_profile() {
        let p = BlenderProvider;
        assert!(!p.can_execute("trim_paths",  "Blender"));
        assert!(!p.can_execute("easy_ease",   "Blender"));
        assert!(!p.can_execute("null_object", "Blender"));
    }
}
