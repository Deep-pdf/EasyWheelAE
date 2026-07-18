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
//! `ActionRegistry` and `ProfileManager` are lazily initialised on the first
//! call to `execute_for_sector` using a `OnceLock`. They are rebuilt from the
//! current `ConfigManager` snapshot at that point. This means a
//! `ConfigManager::reload()` followed by the next action execution will pick
//! up the new config automatically via the `OnceLock` pattern:
//!
//! > **Note**: For true hot-reload the `OnceLock` would need to be replaced
//! > with a `RwLock`. That is deferred to Phase 6 (Settings UI save path).
//! > For Phase 5 the config is loaded once at startup and remains static.

use std::sync::{Mutex, OnceLock};

use crate::{
    action_registry::ActionRegistry,
    foreground_application::ForegroundApplicationService,
    config_manager::ConfigManager,
    models::action::ActionDefinition,
    profile_manager::ProfileManager,
};

// ---------------------------------------------------------------------------
// Module-level state — lazy init on first execution
// ---------------------------------------------------------------------------

/// Lazily initialised action registry, built from the config on first use.
static REGISTRY: OnceLock<ActionRegistry> = OnceLock::new();

/// Lazily initialised profile manager, built from the config on first use.
static PROFILES: OnceLock<Mutex<ProfileManager>> = OnceLock::new();

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
    /// - No assignment for sector: logged warning, no action executed.
    /// - Action ID not in registry: logged warning, no action executed.
    /// - Never panics.
    pub fn execute_for_sector(sector: u8) {
        // Dead-zone sentinel: user released inside the centre circle.
        // This is an intentional "no action" state — no warning needed.
        if sector == 255 {
            println!("[ActionManager] Info: Released in dead zone — no action.");
            return;
        }

        // Step 1 — Detect foreground application.
        let exe = ForegroundApplicationService::get_executable();
        println!("[ActionManager] Info: Foreground executable detected: '{}'.", exe);

        // Step 2 — Resolve the active profile.
        let profiles = Self::profiles();
        let guard = profiles.lock().unwrap_or_else(|e| e.into_inner());
        let profile = guard.resolve(&exe);

        println!(
            "[ActionManager] Info: Active profile: '{}'.",
            profile.name
        );

        // Step 3 — Look up the action ID for this sector.
        let action_id = match profile.sector_assignments.get(&sector) {
            Some(id) => id.clone(),
            None => {
                println!(
                    "[ActionManager] Info: Profile '{}' has no assignment for sector {}. \
                     No action executed.",
                    profile.name, sector
                );
                return;
            }
        };

        // Release the profile manager lock before the registry lookup.
        drop(guard);

        // Step 4 — Resolve the action definition from the registry.
        let registry = Self::registry();
        match registry.get(&action_id) {
            Some(definition) => {
                println!(
                    "[ActionManager] Profile: {} | Sector: {} | Action: {} | Display: {}",
                    exe, sector, definition.id, definition.display_name
                );
                Self::execute_action(definition);
            }
            None => {
                eprintln!(
                    "[ActionManager] Warning: Action '{}' assigned to sector {} \
                     in profile '{}' does not exist in the action library. \
                     Check config.json for a typo.",
                    action_id, sector, exe
                );
            }
        }
    }

    // -----------------------------------------------------------------------
    // Private helpers
    // -----------------------------------------------------------------------

    /// Returns the lazily initialised `ActionRegistry`.
    fn registry() -> &'static ActionRegistry {
        REGISTRY.get_or_init(|| {
            let config = ConfigManager::get();
            ActionRegistry::new(config.action_library)
        })
    }

    /// Returns the lazily initialised `ProfileManager`.
    fn profiles() -> &'static Mutex<ProfileManager> {
        PROFILES.get_or_init(|| {
            let config = ConfigManager::get();
            Mutex::new(ProfileManager::new(config.profiles))
        })
    }

    /// Executes the given action definition.
    ///
    /// Phase 5: placeholder implementation — prints the action name to the
    /// terminal. No Adobe integration, no system calls.
    ///
    /// Future phases will dispatch to a real execution backend (script runner,
    /// IPC client, shell command, etc.) based on `definition.parameters`.
    fn execute_action(definition: &ActionDefinition) {
        println!(
            "[ActionManager] Executing Action: {} ({})",
            definition.display_name, definition.id
        );
    }
}
