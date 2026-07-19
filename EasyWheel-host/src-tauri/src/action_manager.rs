//! Action execution orchestrator for EasyWheel Host.
//!
//! `ActionManager` is the sole entry point for action execution. It owns the
//! pipeline from "user released the wheel" to "action result printed to the
//! terminal".
//!
//! # Execution Pipeline
//!
//! ```text
//! execute_for_sector(sector)
//!     ↓
//! ForegroundApplicationService::get_executable()   →  "AfterFX.exe"
//!     ↓
//! ProfileManager::resolve("AfterFX.exe")           →  After Effects profile
//!     ↓
//! profile.sector_assignments.get(sector)           →  "trim_paths"
//!     ↓
//! ActionRegistry::get("trim_paths")                →  ActionDefinition
//!     ↓
//! execute_action(&definition)                      →  println! to terminal
//! ```
//!
//! # Design Rules
//!
//! - `ActionManager` never matches on sector indices directly.
//! - The mapping from sector to action is determined entirely by the profile.
//! - Every step is logged. Every error is recovered — never a panic.
//!
//! # State
//!
//! `ActionRegistry` and `ProfileManager` are lazily initialised on first use
//! and can be rebuilt at runtime via `ActionManager::rebuild()`. This is
//! required by the Phase 6 Settings UI save path: after `save_config` writes
//! the new config to disk, it calls `rebuild()` so the next wheel action
//! uses the updated profiles and actions immediately — no restart required.

use std::sync::Mutex;

use crate::{
    action_registry::ActionRegistry,
    foreground_application::ForegroundApplicationService,
    config_manager::ConfigManager,
    models::action::ActionDefinition,
    profile_manager::ProfileManager,
};

// ---------------------------------------------------------------------------
// Module-level state — Mutex<Option<T>> pattern supports runtime rebuild.
//
// On first use, `None` is detected and the value is initialised from the
// current `ConfigManager` snapshot. `rebuild()` resets both to `None`,
// causing the next execution to re-initialise from the freshly-loaded config.
// ---------------------------------------------------------------------------

/// Action registry — lazily initialised and rebuildable.
static REGISTRY: Mutex<Option<ActionRegistry>> = Mutex::new(None);

/// Profile manager — lazily initialised and rebuildable.
static PROFILES: Mutex<Option<ProfileManager>> = Mutex::new(None);

// ---------------------------------------------------------------------------
// ActionManager
// ---------------------------------------------------------------------------

/// Orchestrates the sector → profile → action → execute pipeline.
///
/// `ActionManager` is a unit struct — all state is held in module-level
/// statics initialised lazily on first execution.
pub struct ActionManager;

impl ActionManager {
    /// Executes the action assigned to `sector` in the active profile.
    ///
    /// # Arguments
    ///
    /// - `sector` — The sector index selected by the user (0 to SECTOR_COUNT-1).
    ///   The sentinel value `255` (dead zone) is rejected early with no logging,
    ///   because the dead zone is a normal, intentional "no action" state.
    ///
    /// # Error Handling
    ///
    /// - Dead zone (sector == 255): silent early return.
    /// - No assignment for sector: logged info, no action executed.
    /// - Action ID not in registry: logged warning, no action executed.
    /// - Never panics.
    pub fn execute_for_sector(sector: u8) {
        if sector == 255 {
            println!("[ActionManager] Info: Released in dead zone — no action.");
            return;
        }

        // Step 1 — Detect foreground application.
        let exe = ForegroundApplicationService::get_executable();
        println!("[ActionManager] Info: Foreground executable: '{}'.", exe);

        // Step 2 — Resolve the active profile.
        let profile_name;
        let action_id;
        {
            let mut guard = PROFILES.lock().unwrap_or_else(|e| e.into_inner());
            if guard.is_none() {
                let config = ConfigManager::get();
                *guard = Some(ProfileManager::new(config.profiles));
            }
            let pm = guard.as_ref().unwrap();
            let profile = pm.resolve(&exe);
            profile_name = profile.name.clone();
            action_id = profile.sector_assignments.get(&sector).cloned();
        }

        println!("[ActionManager] Info: Active profile: '{}'.", profile_name);

        // Step 3 — Look up the action ID for this sector.
        let action_id = match action_id {
            Some(id) => id,
            None => {
                println!(
                    "[ActionManager] Info: Profile '{}' has no assignment for sector {}. \
                     No action executed.",
                    profile_name, sector
                );
                return;
            }
        };

        // Step 4 — Resolve the action definition from the registry.
        let mut guard = REGISTRY.lock().unwrap_or_else(|e| e.into_inner());
        if guard.is_none() {
            let config = ConfigManager::get();
            *guard = Some(ActionRegistry::new(config.action_library));
        }

        match guard.as_ref().unwrap().get(&action_id) {
            Some(definition) => {
                println!(
                    "[ActionManager] Profile: {} | Sector: {} | Action: {} | Display: {}",
                    profile_name, sector, definition.id, definition.display_name
                );
                Self::execute_action(sector, &profile_name, &exe, definition);
            }
            None => {
                eprintln!(
                    "[ActionManager] Warning: Action '{}' assigned to sector {} \
                     in profile '{}' does not exist in the action library. \
                     Check config.json for a typo.",
                    action_id, sector, profile_name
                );
            }
        }
    }

    /// Resets both lazy statics to `None`, forcing re-initialisation from the
    /// current `ConfigManager` on the next `execute_for_sector` call.
    ///
    /// Must be called by the `save_config` Tauri command after writing the new
    /// configuration to disk. This ensures the overlay picks up the new
    /// profiles and action library without requiring an application restart.
    pub fn rebuild() {
        if let Ok(mut r) = REGISTRY.lock() {
            *r = None;
        }
        if let Ok(mut p) = PROFILES.lock() {
            *p = None;
        }
        println!("[ActionManager] Info: Statics reset — will re-initialise from config on next execution.");
    }

    /// Executes the given action definition by forwarding to the dispatcher.
    fn execute_action(
        sector: u8,
        profile_name: &str,
        exe: &str,
        definition: &ActionDefinition,
    ) {
        let timestamp = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis() as u64;

        let context = crate::models::command_context::CommandContext {
            action_id: definition.id.clone(),
            selected_sector: sector,
            current_profile: profile_name.to_string(),
            executable_name: exe.to_string(),
            timestamp,
            modifier_keys: Vec::new(),
            mouse_position: None,
            selection: None,
        };

        if let Err(e) = crate::command_dispatcher::CommandDispatcher::dispatch(context) {
            eprintln!("[ActionManager] Error: Command dispatch failed: {}", e);
        }
    }
}
