//! Top-level configuration schema for EasyWheel Host.
//!
//! `AppConfig` is the root type that is serialised to / deserialised from
//! `%APPDATA%\EasyWheelAE\config.json`. It owns the global settings, the
//! full profile list, and the global action library.
//!
//! # Versioning
//!
//! The `schema_version` field allows future migrations. `ConfigManager` checks
//! this value at load time and can transform older configs forward. No
//! migration logic is required until the schema changes.
//!
//! # Design Rules
//!
//! - `GlobalSettings` contains every value the Settings UI can edit that
//!   is not profile-specific.
//! - Activation keys are stored as `String` (e.g. `"Alt"`, `"F1"`) because
//!   `rdev::Key` is not `Serialize`/`Deserialize`. `ConfigManager` parses
//!   them into `rdev::Key` at load time.
//! - Colour values are stored as CSS hex strings (`"#RRGGBB"` or `"#RRGGBBAA"`).

use serde::{Deserialize, Serialize};

use super::{action::ActionDefinition, profile::{Profile, ConfiguredCommand}};

/// Current config schema version.
///
/// Increment this whenever a **breaking** change is made to the schema.
/// `ConfigManager` compares the loaded version against this constant and
/// may run migration logic in future phases.
pub const SCHEMA_VERSION: u32 = 1;

/// Root configuration document.
///
/// Serialised as the top-level JSON object in `config.json`.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppConfig {
    /// Schema version for forward-migration support.
    pub schema_version: u32,

    /// Application-wide settings not tied to any specific profile.
    pub global: GlobalSettings,

    /// All application profiles. At minimum the Desktop profile must exist.
    pub profiles: Vec<Profile>,

    /// Global registry of every action EasyWheel can execute.
    ///
    /// Profiles reference entries here by `ActionDefinition::id`.
    /// Actions are never duplicated inside profiles.
    pub action_library: Vec<ActionDefinition>,
}

/// Global, application-wide settings.
///
/// Every field here will be editable by the Phase 6 Settings UI without
/// requiring a backend schema change.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GlobalSettings {
    /// The modifier key that must be held before the trigger key.
    ///
    /// Stored as a string and parsed by `ConfigManager` into `rdev::Key`.
    /// Example: `"Alt"`, `"ShiftLeft"`, `"ControlLeft"`
    pub activation_modifier: String,

    /// The trigger key pressed while the modifier is held.
    ///
    /// Stored as a string and parsed by `ConfigManager` into `rdev::Key`.
    /// Example: `"F1"`, `"F2"`, `"Space"`
    pub activation_key: String,

    /// Outer visual radius of the wheel in CSS pixels.
    pub wheel_radius: f64,

    /// Minimum cursor distance from the origin in CSS pixels before any
    /// sector activates. While inside this radius no action is queued.
    pub dead_zone_radius: f64,

    /// Number of equal sectors. Must be a positive divisor of 360.
    pub sector_count: u8,

    /// CSS colour for the currently highlighted sector.
    /// Example: `"#FFFFFF33"`
    pub highlight_color: String,

    /// CSS colour for non-highlighted sectors.
    /// Example: `"#FFFFFF11"`
    pub default_color: String,

    /// Opacity of the wheel overlay (0.0 to 1.0).
    pub wheel_opacity: f64,
}

impl Default for AppConfig {
    /// Returns the factory-default configuration.
    ///
    /// Includes all placeholder actions and profiles with sensible default
    /// sector assignments. Written to disk automatically when no config file
    /// exists or when the file is corrupt.
    fn default() -> Self {
        use std::collections::HashMap;
        use super::action::ActionDefinition;
        use super::profile::Profile;

        let global = GlobalSettings {
            activation_modifier: "Alt".to_string(),
            activation_key: "F1".to_string(),
            wheel_radius: 120.0,
            dead_zone_radius: 40.0,
            sector_count: 8,
            highlight_color: "#FFFFFF33".to_string(),
            default_color: "#FFFFFF11".to_string(),
            wheel_opacity: 0.8,
        };

        // -----------------------------------------------------------------------
        // Global action library — placeholder implementations (Phase 5).
        // Execution prints to terminal. No Adobe integration.
        // -----------------------------------------------------------------------
        let action_library = vec![
            ActionDefinition {
                id: "easy_ease".to_string(),
                display_name: "Easy Ease".to_string(),
                description: "Apply Easy Ease keyframe interpolation.".to_string(),
                category: "After Effects".to_string(),
                icon: None, shortcut: None, parameters: None,
            },
            ActionDefinition {
                id: "pre_compose".to_string(),
                display_name: "Pre-Compose".to_string(),
                description: "Pre-compose selected layers.".to_string(),
                category: "After Effects".to_string(),
                icon: None, shortcut: None, parameters: None,
            },
            ActionDefinition {
                id: "trim_paths".to_string(),
                display_name: "Trim Paths".to_string(),
                description: "Add Trim Paths shape effect.".to_string(),
                category: "After Effects".to_string(),
                icon: None, shortcut: None, parameters: None,
            },
            ActionDefinition {
                id: "duplicate".to_string(),
                display_name: "Duplicate".to_string(),
                description: "Duplicate selected layers or items.".to_string(),
                category: "After Effects".to_string(),
                icon: None, shortcut: None, parameters: None,
            },
            ActionDefinition {
                id: "parent".to_string(),
                display_name: "Parent".to_string(),
                description: "Open parent/child layer picker.".to_string(),
                category: "After Effects".to_string(),
                icon: None, shortcut: None, parameters: None,
            },
            ActionDefinition {
                id: "graph_editor".to_string(),
                display_name: "Graph Editor".to_string(),
                description: "Toggle the Graph Editor panel.".to_string(),
                category: "After Effects".to_string(),
                icon: None, shortcut: None, parameters: None,
            },
            ActionDefinition {
                id: "settings".to_string(),
                display_name: "EasyWheel Settings".to_string(),
                description: "Open the EasyWheel Settings window.".to_string(),
                category: "System".to_string(),
                icon: None, shortcut: None, parameters: None,
            },
            ActionDefinition {
                id: "open_explorer".to_string(),
                display_name: "Open Explorer".to_string(),
                description: "Open a new Windows Explorer window.".to_string(),
                category: "System".to_string(),
                icon: None, shortcut: None, parameters: None,
            },
            ActionDefinition {
                id: "calculator".to_string(),
                display_name: "Calculator".to_string(),
                description: "Launch the Windows Calculator.".to_string(),
                category: "System".to_string(),
                icon: None, shortcut: None, parameters: None,
            },
            ActionDefinition {
                id: "browser".to_string(),
                display_name: "Browser".to_string(),
                description: "Open the default web browser.".to_string(),
                category: "Application".to_string(),
                icon: None, shortcut: None, parameters: None,
            },
            ActionDefinition {
                id: "clipboard".to_string(),
                display_name: "Clipboard".to_string(),
                description: "Open the Windows Clipboard history (Win+V).".to_string(),
                category: "System".to_string(),
                icon: None, shortcut: None, parameters: None,
            },
        ];

        // -----------------------------------------------------------------------
        // Profiles — one per supported application plus the mandatory Desktop.
        // Sector assignments: index 0 = Right, advancing clockwise.
        // -----------------------------------------------------------------------
        let profiles = vec![
            // Desktop — always present, used as the fallback.
            Profile {
                name: "Desktop".to_string(),
                executable: "explorer.exe".to_string(),
                sector_assignments: HashMap::from([
                    (0, ConfiguredCommand::legacy("open_explorer", "Open Explorer")),
                    (1, ConfiguredCommand::legacy("browser", "Browser")),
                    (2, ConfiguredCommand::legacy("calculator", "Calculator")),
                    (3, ConfiguredCommand::legacy("clipboard", "Clipboard")),
                    (7, ConfiguredCommand::legacy("settings", "EasyWheel Settings")),
                ]),
            },
            // Adobe After Effects
            Profile {
                name: "Adobe After Effects".to_string(),
                executable: "AfterFX.exe".to_string(),
                sector_assignments: HashMap::from([
                    (0, ConfiguredCommand::legacy("easy_ease", "Easy Ease")),
                    (1, ConfiguredCommand::legacy("pre_compose", "Pre-Compose")),
                    (2, ConfiguredCommand::legacy("trim_paths", "Trim Paths")),
                    (3, ConfiguredCommand::legacy("duplicate", "Duplicate")),
                    (4, ConfiguredCommand::legacy("parent", "Parent")),
                    (5, ConfiguredCommand::legacy("graph_editor", "Graph Editor")),
                    (7, ConfiguredCommand::legacy("settings", "EasyWheel Settings")),
                ]),
            },
            // Adobe Photoshop
            Profile {
                name: "Adobe Photoshop".to_string(),
                executable: "Photoshop.exe".to_string(),
                sector_assignments: HashMap::from([
                    (0, ConfiguredCommand::legacy("duplicate", "Duplicate")),
                    (1, ConfiguredCommand::legacy("open_explorer", "Open Explorer")),
                    (7, ConfiguredCommand::legacy("settings", "EasyWheel Settings")),
                ]),
            },
            // Adobe Premiere Pro
            Profile {
                name: "Adobe Premiere Pro".to_string(),
                executable: "Premiere Pro.exe".to_string(),
                sector_assignments: HashMap::from([
                    (0, ConfiguredCommand::legacy("duplicate", "Duplicate")),
                    (1, ConfiguredCommand::legacy("easy_ease", "Easy Ease")),
                    (7, ConfiguredCommand::legacy("settings", "EasyWheel Settings")),
                ]),
            },
            // Visual Studio Code
            Profile {
                name: "VS Code".to_string(),
                executable: "Code.exe".to_string(),
                sector_assignments: HashMap::from([
                    (0, ConfiguredCommand::legacy("open_explorer", "Open Explorer")),
                    (1, ConfiguredCommand::legacy("browser", "Browser")),
                    (2, ConfiguredCommand::legacy("calculator", "Calculator")),
                    (7, ConfiguredCommand::legacy("settings", "EasyWheel Settings")),
                ]),
            },
            // Google Chrome
            Profile {
                name: "Chrome".to_string(),
                executable: "chrome.exe".to_string(),
                sector_assignments: HashMap::from([
                    (0, ConfiguredCommand::legacy("browser", "Browser")),
                    (1, ConfiguredCommand::legacy("clipboard", "Clipboard")),
                    (7, ConfiguredCommand::legacy("settings", "EasyWheel Settings")),
                ]),
            },
            // Blender
            Profile {
                name: "Blender".to_string(),
                executable: "blender.exe".to_string(),
                sector_assignments: HashMap::from([
                    (0, ConfiguredCommand::legacy("duplicate", "Duplicate")),
                    (7, ConfiguredCommand::legacy("settings", "EasyWheel Settings")),
                ]),
            },
        ];

        AppConfig {
            schema_version: SCHEMA_VERSION,
            global,
            profiles,
            action_library,
        }
    }
}
