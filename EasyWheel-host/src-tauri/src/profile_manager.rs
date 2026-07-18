//! Per-application profile resolution for EasyWheel Host.
//!
//! `ProfileManager` owns the ordered list of application profiles loaded from
//! `AppConfig`. At execution time it resolves the active profile by matching
//! the foreground application's executable name against each profile's
//! `executable` field.
//!
//! # Resolution Order
//!
//! 1. Exact match (case-insensitive) against `profile.executable`.
//! 2. If no match is found, the **Desktop profile** (`explorer.exe`) is
//!    returned as the mandatory fallback.
//!
//! # Desktop Profile Guarantee
//!
//! The Desktop profile must always exist. `ProfileManager::new` enforces this:
//! if the loaded config does not contain a profile with
//! `executable == "explorer.exe"` (case-insensitive), an empty default
//! Desktop profile is injected with a warning. This prevents any code path
//! that calls `resolve()` from receiving `None`.
//!
//! # Case-Insensitivity
//!
//! Windows executable names are case-insensitive at the filesystem level.
//! All comparisons are performed after calling `.to_ascii_lowercase()` on
//! both sides, so `"AfterFX.exe"` matches `"afterfx.exe"` in the config.

use crate::models::profile::Profile;

/// The executable filename used to identify the Desktop (fallback) profile.
const DESKTOP_EXECUTABLE: &str = "explorer.exe";

/// Owns the list of application profiles and resolves the active one.
pub struct ProfileManager {
    /// All loaded profiles. The Desktop profile is always present at index 0.
    profiles: Vec<Profile>,
    /// Cached index of the Desktop profile within `profiles`.
    /// Stored to make the fallback O(1) rather than O(n).
    desktop_index: usize,
}

impl ProfileManager {
    /// Constructs a `ProfileManager` from the profiles in `AppConfig`.
    ///
    /// If no Desktop profile exists in the supplied list, an empty one is
    /// injected at position 0 and a warning is logged. This upholds the
    /// invariant that `resolve()` always returns a valid profile reference.
    pub fn new(mut profiles: Vec<Profile>) -> Self {
        // Locate the Desktop profile (case-insensitive).
        let desktop_pos = profiles.iter().position(|p| {
            p.executable.to_ascii_lowercase() == DESKTOP_EXECUTABLE
        });

        let desktop_index = match desktop_pos {
            Some(i) => {
                println!(
                    "[ProfileManager] Info: Loaded {} profile(s). \
                     Desktop profile found at index {}.",
                    profiles.len(),
                    i
                );
                i
            }
            None => {
                // Inject a minimal Desktop profile so resolve() is always safe.
                eprintln!(
                    "[ProfileManager] Warning: No Desktop profile found in configuration. \
                     Injecting an empty default Desktop profile."
                );
                profiles.insert(
                    0,
                    Profile {
                        name: "Desktop".to_string(),
                        executable: DESKTOP_EXECUTABLE.to_string(),
                        sector_assignments: std::collections::HashMap::new(),
                    },
                );
                0
            }
        };

        Self {
            profiles,
            desktop_index,
        }
    }

    /// Resolves the active profile for the given foreground executable name.
    ///
    /// Performs a case-insensitive linear scan. For the expected number of
    /// profiles (< 50) this is faster than a hash map in practice due to
    /// cache locality and branch prediction.
    ///
    /// Returns the Desktop profile when no specific profile matches.
    pub fn resolve(&self, executable: &str) -> &Profile {
        let exe_lower = executable.to_ascii_lowercase();

        let matched = self
            .profiles
            .iter()
            .find(|p| {
                p.executable
                    .split(',')
                    .any(|part| part.trim().eq_ignore_ascii_case(&exe_lower))
            });

        match matched {
            Some(profile) => {
                println!(
                    "[ProfileManager] Info: Profile matched — '{}' for '{}'.",
                    profile.name, executable
                );
                profile
            }
            None => {
                println!(
                    "[ProfileManager] Info: No profile for '{}'. \
                     Falling back to Desktop profile.",
                    executable
                );
                // SAFETY: `desktop_index` is always valid — guaranteed by `new()`.
                &self.profiles[self.desktop_index]
            }
        }
    }
}
