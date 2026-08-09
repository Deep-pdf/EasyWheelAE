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

#[cfg(target_os = "windows")]
const FALLBACK_NAME: &str = "Desktop";
#[cfg(target_os = "windows")]
const FALLBACK_EXECUTABLE: &str = "explorer.exe";

#[cfg(not(target_os = "windows"))]
const FALLBACK_NAME: &str = "Linux Desktop";
#[cfg(not(target_os = "windows"))]
const FALLBACK_EXECUTABLE: &str = "desktop";

/// Owns the list of application profiles and resolves the active one.
pub struct ProfileManager {
    /// All loaded profiles.
    profiles: Vec<Profile>,
    /// Cached index of the platform fallback profile within `profiles`.
    fallback_index: usize,
}

impl ProfileManager {
    /// Constructs a `ProfileManager` from the profiles in `AppConfig`.
    ///
    /// If no platform fallback profile exists in the supplied list, a default
    /// platform profile is injected at position 0. This upholds the invariant
    /// that `resolve()` always returns a valid profile reference.
    pub fn new(mut profiles: Vec<Profile>) -> Self {
        let fallback_pos = profiles.iter().position(|p| {
            p.name.eq_ignore_ascii_case(FALLBACK_NAME)
                || p.executable.eq_ignore_ascii_case(FALLBACK_EXECUTABLE)
        });

        let fallback_index = match fallback_pos {
            Some(i) => i,
            None => {
                #[cfg(target_os = "windows")]
                {
                    profiles.insert(
                        0,
                        Profile {
                            name: FALLBACK_NAME.to_string(),
                            executable: FALLBACK_EXECUTABLE.to_string(),
                            sector_assignments: std::collections::HashMap::new(),
                            version: 1,
                            last_modified: String::new(),
                            last_modified_by: "Host".to_string(),
                        },
                    );
                    0
                }
                #[cfg(not(target_os = "windows"))]
                {
                    use crate::models::profile::ConfiguredCommand;
                    use std::collections::HashMap;
                    let linux_desktop = Profile {
                        name: "Linux Desktop".to_string(),
                        executable: "desktop, plasmashell, gnome-shell, xfce4-panel".to_string(),
                        sector_assignments: HashMap::from([
                            (
                                0,
                                ConfiguredCommand::legacy("open_explorer", "File Manager"),
                            ),
                            (1, ConfiguredCommand::legacy("browser", "Browser")),
                            (2, ConfiguredCommand::legacy("calculator", "Calculator")),
                            (3, ConfiguredCommand::legacy("clipboard", "Clipboard")),
                            (
                                7,
                                ConfiguredCommand::legacy("settings", "EasyWheel Settings"),
                            ),
                        ]),
                        version: 1,
                        last_modified: String::new(),
                        last_modified_by: "Host".to_string(),
                    };
                    profiles.insert(0, linux_desktop);
                    0
                }
            }
        };

        Self {
            profiles,
            fallback_index,
        }
    }

    /// Resolves the active profile for the given foreground executable name.
    ///
    /// Performs a case-insensitive match against each profile's `executable` field,
    /// supporting full paths (e.g. `/usr/bin/firefox`), filenames (e.g. `firefox`),
    /// `.exe` extensions, and comma-separated lists.
    ///
    /// Returns the platform fallback profile (e.g. `Linux Desktop` on Linux,
    /// `Desktop` on Windows) when no application profile matches.
    pub fn resolve(&self, executable: &str) -> &Profile {
        let matched = self
            .profiles
            .iter()
            .find(|p| Self::matches_executable(&p.executable, executable));

        match matched {
            Some(profile) => profile,
            None => {
                // SAFETY: `fallback_index` is always valid — guaranteed by `new()`.
                &self.profiles[self.fallback_index]
            }
        }
    }

    /// Checks if a configured executable pattern matches the detected executable.
    ///
    /// Supports:
    /// - Comma-separated patterns: `"firefox, /usr/bin/firefox, firefox-bin"`
    /// - Full path comparisons: `"/usr/bin/firefox"` matches `"firefox"`
    /// - Basename comparisons: `"firefox"` matches `"/usr/bin/firefox"`
    /// - Windows/Linux extension stripping: `"firefox.exe"` matches `"firefox"`
    /// - Case-insensitive matching: `"Firefox"` matches `"firefox"`
    pub fn matches_executable(configured: &str, detected: &str) -> bool {
        let det_clean = detected.trim().to_ascii_lowercase();
        if det_clean.is_empty() {
            return false;
        }

        let det_path = std::path::Path::new(&det_clean);
        let det_file = det_path
            .file_name()
            .map(|n| n.to_string_lossy().into_owned())
            .unwrap_or_default()
            .to_ascii_lowercase();
        let det_stem = det_file
            .strip_suffix(".exe")
            .unwrap_or(&det_file)
            .to_string();

        for part in configured.split(',') {
            let part_clean = part.trim().to_ascii_lowercase();
            if part_clean.is_empty() {
                continue;
            }

            // 1. Direct match (e.g. "/usr/bin/firefox" == "/usr/bin/firefox" or "firefox" == "firefox")
            if part_clean == det_clean {
                return true;
            }

            let part_path = std::path::Path::new(&part_clean);
            let part_file = part_path
                .file_name()
                .map(|n| n.to_string_lossy().into_owned())
                .unwrap_or_default()
                .to_ascii_lowercase();

            // 2. Basename match (e.g. "/usr/bin/firefox" matches "firefox", or "firefox" matches "/usr/bin/firefox")
            if !part_file.is_empty()
                && (part_file == det_file || part_file == det_clean || part_clean == det_file)
            {
                return true;
            }

            // 3. Stem match without .exe (e.g. "firefox.exe" matches "firefox", "Code.exe" matches "code")
            let part_stem = part_file.strip_suffix(".exe").unwrap_or(&part_file);

            if !part_stem.is_empty()
                && (part_stem == det_stem || part_stem == det_file || part_stem == det_clean)
            {
                return true;
            }
        }

        false
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_matches_executable() {
        // Full path configured vs simple detected
        assert!(ProfileManager::matches_executable(
            "/usr/bin/firefox",
            "firefox"
        ));
        assert!(ProfileManager::matches_executable(
            "/usr/bin/firefox",
            "/usr/bin/firefox"
        ));
        assert!(ProfileManager::matches_executable(
            "/usr/lib/firefox/firefox",
            "firefox"
        ));

        // Simple configured vs full path detected
        assert!(ProfileManager::matches_executable(
            "firefox",
            "/usr/bin/firefox"
        ));

        // Windows exe extension vs Linux process name
        assert!(ProfileManager::matches_executable("firefox.exe", "firefox"));
        assert!(ProfileManager::matches_executable("firefox", "firefox.exe"));
        assert!(ProfileManager::matches_executable("Code.exe", "code"));

        // Comma-separated list
        assert!(ProfileManager::matches_executable(
            "chrome.exe, google-chrome, /usr/bin/google-chrome",
            "google-chrome"
        ));
        assert!(ProfileManager::matches_executable(
            "chrome.exe, google-chrome",
            "chrome"
        ));

        // Non-matches
        assert!(!ProfileManager::matches_executable(
            "blender.exe",
            "firefox"
        ));
        assert!(!ProfileManager::matches_executable(
            "/usr/bin/firefox",
            "chrome"
        ));
    }

    #[test]
    fn test_platform_fallback_resolution() {
        let firefox_profile = Profile {
            name: "firefox".to_string(),
            executable: "/usr/bin/firefox".to_string(),
            ..Default::default()
        };

        let pm = ProfileManager::new(vec![firefox_profile]);

        // Specific match
        assert_eq!(pm.resolve("firefox").name, "firefox");

        // Unmatched app -> Platform Fallback (Linux Desktop on Linux, Desktop on Windows)
        #[cfg(not(target_os = "windows"))]
        assert_eq!(pm.resolve("some_unmatched_app").name, "Linux Desktop");

        #[cfg(target_os = "windows")]
        assert_eq!(pm.resolve("some_unmatched_app").name, "Desktop");
    }
}
