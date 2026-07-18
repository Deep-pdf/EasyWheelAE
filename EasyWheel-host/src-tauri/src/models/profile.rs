//! `Profile` — per-application sector-to-action assignment map.
//!
//! A `Profile` binds a specific foreground application (identified by its
//! executable filename) to a set of sector assignments. Each sector index
//! maps to an action ID that is looked up in the global action library at
//! execution time.
//!
//! # Design Rules
//!
//! - Profiles are identified by **executable filename**, never window title.
//! - Sector assignments store **action IDs**, never `ActionDefinition` structs.
//! - The Desktop profile (`executable == "explorer.exe"`) is the mandatory
//!   fallback. `ProfileManager` guarantees it always exists.
//! - Not every sector needs an assignment. An absent sector key means
//!   "no action" for that sector — this is a valid, intentional state.

use std::collections::HashMap;

use serde::{Deserialize, Serialize};

/// A per-application wheel profile.
///
/// Owned by [`crate::models::config::AppConfig::profiles`] and managed by
/// [`crate::profile_manager::ProfileManager`].
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Profile {
    /// Human-readable name shown in the Settings UI.
    ///
    /// Example: `"Desktop"`, `"Adobe After Effects"`, `"VS Code"`
    pub name: String,

    /// Executable filename used to identify the foreground application.
    ///
    /// Comparison is **case-insensitive** on Windows.
    ///
    /// Example: `"explorer.exe"`, `"AfterFX.exe"`, `"Code.exe"`
    pub executable: String,

    /// Mapping from sector index (0 to SECTOR_COUNT-1) to action ID.
    ///
    /// Absent keys mean the sector has no assigned action — no warning is
    /// emitted for intentionally unassigned sectors.
    ///
    /// Example: `{ 0: "easy_ease", 2: "trim_paths", 5: "graph_editor" }`
    pub sector_assignments: HashMap<u8, String>,
}
