//! Global action registry for EasyWheel Host.
//!
//! `ActionRegistry` owns the complete map of every action that EasyWheel
//! can execute. It is constructed once from the `action_library` loaded by
//! `ConfigManager` and consulted by `ActionManager` at execution time.
//!
//! # Design Rules
//!
//! - The registry is the **only** place `ActionDefinition` structs live at
//!   runtime. Profiles reference action IDs, never definitions.
//! - Lookup by ID is O(1) via an internal `HashMap`.
//! - An unknown ID causes a logged warning. The caller decides whether to
//!   skip or report the missing action.
//!
//! # Extensibility
//!
//! The registry is built from `Vec<ActionDefinition>`, so loading additional
//! actions from a plugin system or user-defined library in a future phase
//! requires no structural change — simply extend the source vec before
//! constructing the registry.

use std::collections::HashMap;

use crate::models::action::ActionDefinition;

/// Owns and indexes every registered action by its stable ID.
pub struct ActionRegistry {
    /// Internal index: action ID → `ActionDefinition`.
    actions: HashMap<String, ActionDefinition>,
}

impl ActionRegistry {
    /// Constructs an `ActionRegistry` from a flat list of action definitions.
    ///
    /// Duplicate IDs are silently overwritten by the last entry — this should
    /// not occur in a well-formed config but is handled gracefully.
    pub fn new(actions: Vec<ActionDefinition>) -> Self {
        let map = actions
            .into_iter()
            .map(|a| (a.id.clone(), a))
            .collect::<HashMap<_, _>>();

        println!(
            "[ActionRegistry] Info: Registered {} action(s).",
            map.len()
        );

        Self { actions: map }
    }

    /// Returns a reference to the `ActionDefinition` with the given ID.
    ///
    /// Returns `None` if no action with that ID exists in the registry.
    /// The caller is responsible for logging a meaningful warning.
    pub fn get(&self, id: &str) -> Option<&ActionDefinition> {
        self.actions.get(id)
    }

    /// Returns the total number of registered actions.
    #[allow(dead_code)]
    pub fn len(&self) -> usize {
        self.actions.len()
    }

    /// Returns `true` if the registry contains no actions.
    #[allow(dead_code)]
    pub fn is_empty(&self) -> bool {
        self.actions.is_empty()
    }
}
