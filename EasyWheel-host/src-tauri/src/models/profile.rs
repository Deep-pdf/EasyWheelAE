use std::collections::HashMap;
use serde::{Deserialize, Deserializer, Serialize};

/// Represents a command configured on a wheel sector, supporting both
/// legacy string (Action ID) and new parameterized command (JSON object) formats.
#[derive(Debug, Clone, Serialize)]
pub struct ConfiguredCommand {
    /// The programmatic type or ID of the command (e.g. `"launch_app"` or `"easy_ease"`).
    #[serde(rename = "command", alias = "command_id")]
    pub command_id: String,

    /// The customizable user display label for the sector.
    pub label: String,

    /// Freeform JSON parameter key-value pairs.
    pub parameters: serde_json::Value,
}

impl ConfiguredCommand {
    /// Creates a new `ConfiguredCommand` with parameters and a label.
    #[allow(dead_code)]
    pub fn new(command_id: &str, label: &str, parameters: serde_json::Value) -> Self {
        Self {
            command_id: command_id.to_string(),
            label: label.to_string(),
            parameters,
        }
    }

    /// Creates a legacy or parameter-less `ConfiguredCommand` with a default label.
    pub fn legacy(command_id: &str, label: &str) -> Self {
        Self {
            command_id: command_id.to_string(),
            label: label.to_string(),
            parameters: serde_json::Value::Object(serde_json::Map::new()),
        }
    }
}

impl<'de> Deserialize<'de> for ConfiguredCommand {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        #[derive(Deserialize)]
        #[serde(untagged)]
        enum Helper {
            Legacy(String),
            New {
                #[serde(rename = "command", alias = "command_id")]
                command_id: String,
                #[serde(default)]
                label: String,
                #[serde(default = "empty_json_object")]
                parameters: serde_json::Value,
            },
        }

        fn empty_json_object() -> serde_json::Value {
            serde_json::Value::Object(serde_json::Map::new())
        }

        match Helper::deserialize(deserializer)? {
            Helper::Legacy(id) => Ok(ConfiguredCommand {
                command_id: id,
                label: String::new(),
                parameters: empty_json_object(),
            }),
            Helper::New { command_id, label, parameters } => Ok(ConfiguredCommand {
                command_id,
                label,
                parameters,
            }),
        }
    }
}

/// A per-application wheel profile.
///
/// Owned by [`crate::models::config::AppConfig::profiles`] and managed by
/// [`crate::profile_manager::ProfileManager`].
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Profile {
    /// Human-readable name shown in the Settings UI.
    pub name: String,

    /// Executable filename used to identify the foreground application.
    pub executable: String,

    /// Mapping from sector index (0 to SECTOR_COUNT-1) to configured command.
    pub sector_assignments: HashMap<u8, ConfiguredCommand>,
}
