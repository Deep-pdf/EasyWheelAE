//! `ActionDefinition` — the data model for a single registered action.
//!
//! Every action that EasyWheel can execute is described by one
//! `ActionDefinition`. Instances live in the global action library inside
//! `AppConfig` and are referenced by ID from sector assignments inside
//! `Profile`.
//!
//! # Design Rules
//!
//! - Actions are **never** duplicated inside profiles. Profiles reference IDs.
//! - The `id` field is the stable, programmatic key. Never use `display_name`
//!   as a lookup key.
//! - Fields marked `Option<…>` are reserved for future phases. They must be
//!   preserved during serialisation even when `None`.

use serde::{Deserialize, Serialize};

/// A fully described, serialisable action definition.
///
/// Owned by [`crate::models::config::AppConfig::action_library`] and indexed
/// by [`crate::action_registry::ActionRegistry`].
///
/// # Future Extension Points
///
/// - `icon`:       Asset path or name, resolved by the Settings UI.
/// - `shortcut`:   Optional override keyboard shortcut string.
/// - `parameters`: Freeform JSON for action-specific configuration (e.g.,
///   script path, API endpoint, target window class).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ActionDefinition {
    /// Stable programmatic identifier. Snake-case. Never changes after
    /// creation. Used as the foreign key inside `Profile::sector_assignments`.
    ///
    /// Example: `"easy_ease"`, `"open_explorer"`, `"calculator"`
    pub id: String,

    /// Human-readable label shown in the Settings UI and execution log.
    ///
    /// Example: `"Easy Ease"`, `"Open Explorer"`, `"Calculator"`
    pub display_name: String,

    /// One-sentence description of what the action does. Displayed as a
    /// tooltip or subtitle in the Settings UI.
    pub description: String,

    /// Logical grouping for Settings UI organisation.
    ///
    /// Examples: `"After Effects"`, `"System"`, `"Application"`
    pub category: String,

    /// Reserved — icon asset identifier for the Settings UI.
    /// `None` until Phase 7 (icon system).
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub icon: Option<String>,

    /// Reserved — optional keyboard shortcut string.
    /// `None` until Phase 8 (shortcut editor).
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub shortcut: Option<String>,

    /// Reserved — action-specific freeform parameters.
    /// `None` until Phase 9 (parameterised actions).
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub parameters: Option<serde_json::Value>,
}
