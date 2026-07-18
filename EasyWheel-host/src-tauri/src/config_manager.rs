//! Configuration lifecycle management for EasyWheel Host.
//!
//! `ConfigManager` is the single authority over `AppConfig`. It loads the
//! configuration from disk on startup, validates it, writes a default config
//! when none exists, and exposes a `reload()` hook for future hot-reload
//! support.
//!
//! # Config File Location
//!
//! `%APPDATA%\EasyWheelAE\config.json`
//!
//! Resolved at runtime via the [`dirs`] crate so the path is never hardcoded.
//! The directory is created automatically if it does not exist.
//!
//! # Threading Model
//!
//! `AppConfig` is stored in a module-level `OnceLock<Mutex<AppConfig>>`,
//! consistent with the `InputManager` pattern already established in this
//! codebase. The mutex is held only for a `clone()` in `get()`, so contention
//! is negligible at runtime.
//!
//! # Error Handling
//!
//! No error from this module propagates to the caller as a fatal failure:
//!
//! - File not found → default config is generated and saved.
//! - Parse error → default config is generated and saved; corrupt file is
//!   preserved with a `.bak` extension for debugging.
//! - Save error → logged as a warning; application continues.
//!
//! # Activation Key Parsing
//!
//! `rdev::Key` does not implement `Serialize`/`Deserialize`. Keys are stored
//! in the config as human-readable strings (e.g. `"Alt"`, `"F1"`) and
//! converted to `rdev::Key` by [`ConfigManager::parse_rdev_key`] at load time.

use std::path::PathBuf;
use std::sync::{Mutex, OnceLock};

use rdev::Key;

use crate::models::config::AppConfig;

// ---------------------------------------------------------------------------
// Module-level state
// ---------------------------------------------------------------------------

/// Shared configuration state. Initialised exactly once by `load()`.
static CONFIG: OnceLock<Mutex<AppConfig>> = OnceLock::new();

/// List of subscriber callbacks notified on configuration changes.
static SUBSCRIBERS: Mutex<Vec<fn()>> = Mutex::new(Vec::new());

// ---------------------------------------------------------------------------
// ConfigManager
// ---------------------------------------------------------------------------

/// Manages the full lifecycle of `AppConfig`.
///
/// `ConfigManager` is a unit struct — all state is held in the module-level
/// `CONFIG` static so it can be accessed from any module without passing a
/// reference.
pub struct ConfigManager;

impl ConfigManager {
    /// Registers a subscriber callback function that will be executed whenever
    /// the configuration is updated or reloaded.
    pub fn subscribe(callback: fn()) {
        let mut guard = SUBSCRIBERS.lock().unwrap_or_else(|e| e.into_inner());
        guard.push(callback);
    }

    /// Invokes all registered subscriber callback functions.
    fn notify_subscribers() {
        let guard = SUBSCRIBERS.lock().unwrap_or_else(|e| e.into_inner());
        for sub in guard.iter() {
            sub();
        }
    }
    // -----------------------------------------------------------------------
    // Public API
    // -----------------------------------------------------------------------

    /// Loads the configuration from disk and stores it in the module-level
    /// static.
    ///
    /// Must be called **once**, before any other module accesses the config.
    /// Subsequent calls are no-ops because `OnceLock` prevents re-initialisation.
    ///
    /// On any failure (missing file, invalid JSON, missing APPDATA directory):
    /// - The default `AppConfig` is used.
    /// - It is saved to disk so the next launch succeeds without regeneration.
    ///
    /// # Panics
    ///
    /// Never panics. All error paths produce logged warnings and fall back
    /// to the default configuration.
    pub fn load() {
        // OnceLock: subsequent calls are no-ops.
        if CONFIG.get().is_some() {
            return;
        }

        let config = match Self::config_path() {
            Some(path) => {
                if path.exists() {
                    Self::read_from_disk(&path)
                } else {
                    // Try migrating from legacy config.json if it exists
                    let mut legacy_path = path.clone();
                    legacy_path.set_file_name("config.json");
                    if legacy_path.exists() {
                        println!("[ConfigManager] Info: Migrating legacy config.json to easywheel.json...");
                        if let Err(e) = std::fs::rename(&legacy_path, &path) {
                            eprintln!("[ConfigManager] Warning: Failed to rename legacy config: {e}");
                        }
                    }

                    if path.exists() {
                        Self::read_from_disk(&path)
                    } else {
                        println!(
                            "[ConfigManager] Info: Config file not found. \
                             Generating default configuration."
                        );
                        let default = AppConfig::default();
                        Self::write_to_disk(&path, &default);
                        default
                    }
                }
            }
            None => {
                eprintln!(
                    "[ConfigManager] Warning: Could not resolve %%APPDATA%% directory. \
                     Using in-memory default configuration."
                );
                AppConfig::default()
            }
        };

        CONFIG.get_or_init(|| Mutex::new(config));

        println!("[ConfigManager] Info: Configuration loaded successfully.");
        Self::notify_subscribers();
    }

    /// Returns a cloned snapshot of the current `AppConfig`.
    ///
    /// The mutex is held only for the duration of the `clone()` call.
    /// Safe to call from any thread at any time after `load()`.
    ///
    /// # Panics
    ///
    /// Panics only if `load()` was never called — a programmer error
    /// that will surface immediately in development.
    pub fn get() -> AppConfig {
        CONFIG
            .get()
            .expect("[ConfigManager] Fatal: get() called before load(). \
                     Call ConfigManager::load() during application setup.")
            .lock()
            .unwrap_or_else(|e| e.into_inner())
            .clone()
    }

    /// Persists the current in-memory configuration to disk.
    ///
    /// Logs a warning on failure. The application continues running with
    /// the in-memory state regardless of whether the save succeeded.
    #[allow(dead_code)]
    pub fn save() {
        let config = Self::get();
        match Self::config_path() {
            Some(path) => {
                Self::write_to_disk(&path, &config);
                println!("[ConfigManager] Info: Configuration saved.");
            }
            None => {
                eprintln!(
                    "[ConfigManager] Warning: Cannot save configuration — \
                     %%APPDATA%% directory is unavailable."
                );
            }
        }
    }

    /// Replaces the in-memory configuration with `config` and persists it.
    ///
    /// This is the Settings UI save path. Called by the `save_config` Tauri
    /// command after the frontend has validated and submitted a new config.
    ///
    /// Steps:
    /// 1. Write `config` into the `CONFIG` static (blocks briefly on the mutex).
    /// 2. Persist to `%APPDATA%\EasyWheelAE\config.json`.
    ///
    /// Returns `Err(String)` only if the APPDATA directory is unavailable.
    /// A disk write failure is logged but treated as non-fatal so the
    /// in-memory state remains updated.
    pub fn update_and_save(config: AppConfig) -> Result<(), String> {
        // Step 1 — Update the in-memory snapshot.
        if let Some(mutex) = CONFIG.get() {
            let mut guard = mutex.lock().unwrap_or_else(|e| e.into_inner());
            *guard = config;
        } else {
            // CONFIG not yet initialised — this should never happen since
            // lib.rs calls load() before anything else.
            return Err("ConfigManager not initialised. Call load() first.".to_string());
        }

        // Step 2 — Persist to disk.
        match Self::config_path() {
            Some(path) => {
                let snapshot = Self::get();
                Self::write_to_disk(&path, &snapshot);
                println!("[ConfigManager] Info: Configuration updated and saved via Settings UI.");
                Self::notify_subscribers();
                Ok(())
            }
            None => Err(
                "Cannot save — %APPDATA% directory is unavailable.".to_string()
            ),
        }
    }

    /// Reloads the configuration from disk into the in-memory store.
    ///
    /// Exposes the hook required for future hot-reload support (Phase 6).
    /// No file watcher is installed — this must be called explicitly.
    ///
    /// On parse failure the existing in-memory config is preserved.
    #[allow(dead_code)]
    pub fn reload() {
        let Some(path) = Self::config_path() else {
            eprintln!(
                "[ConfigManager] Warning: Reload skipped — \
                 %%APPDATA%% directory is unavailable."
            );
            return;
        };

        if !path.exists() {
            eprintln!(
                "[ConfigManager] Warning: Reload skipped — \
                 config file does not exist at {:?}.",
                path
            );
            return;
        }

        let fresh = Self::read_from_disk(&path);

        if let Some(mutex) = CONFIG.get() {
            {
                let mut guard = mutex.lock().unwrap_or_else(|e| e.into_inner());
                *guard = fresh;
            }
            println!("[ConfigManager] Info: Configuration reloaded from disk.");
            Self::notify_subscribers();
        } else {
            eprintln!(
                "[ConfigManager] Warning: Reload called before initial load — \
                 ignoring."
            );
        }
    }

    /// Parses a config string key name into an `rdev::Key`.
    ///
    /// Covers all keys that are reasonable activation choices. Unknown
    /// strings return `None`; the caller decides the fallback.
    pub fn parse_rdev_key(name: &str) -> Option<Key> {
        match name {
            // Modifiers
            "Alt"          => Some(Key::Alt),
            "AltGr"        => Some(Key::AltGr),
            "ShiftLeft"    => Some(Key::ShiftLeft),
            "ShiftRight"   => Some(Key::ShiftRight),
            "ControlLeft"  => Some(Key::ControlLeft),
            "ControlRight" => Some(Key::ControlRight),
            "MetaLeft"     => Some(Key::MetaLeft),
            "MetaRight"    => Some(Key::MetaRight),
            // Function keys
            "F1"  => Some(Key::F1),
            "F2"  => Some(Key::F2),
            "F3"  => Some(Key::F3),
            "F4"  => Some(Key::F4),
            "F5"  => Some(Key::F5),
            "F6"  => Some(Key::F6),
            "F7"  => Some(Key::F7),
            "F8"  => Some(Key::F8),
            "F9"  => Some(Key::F9),
            "F10" => Some(Key::F10),
            "F11" => Some(Key::F11),
            "F12" => Some(Key::F12),
            // Common keys
            "Space"        => Some(Key::Space),
            "Tab"          => Some(Key::Tab),
            "Escape"       => Some(Key::Escape),
            "CapsLock"     => Some(Key::CapsLock),
            "Backspace"    => Some(Key::Backspace),
            "Return"       => Some(Key::Return),
            "Delete"       => Some(Key::Delete),
            "Home"         => Some(Key::Home),
            "End"          => Some(Key::End),
            "PageUp"       => Some(Key::PageUp),
            "PageDown"     => Some(Key::PageDown),
            "UpArrow"      => Some(Key::UpArrow),
            "DownArrow"    => Some(Key::DownArrow),
            "LeftArrow"    => Some(Key::LeftArrow),
            "RightArrow"   => Some(Key::RightArrow),
            // Letters (uppercase config strings map to lowercase rdev variants)
            "KeyA" => Some(Key::KeyA), "KeyB" => Some(Key::KeyB),
            "KeyC" => Some(Key::KeyC), "KeyD" => Some(Key::KeyD),
            "KeyE" => Some(Key::KeyE), "KeyF" => Some(Key::KeyF),
            "KeyG" => Some(Key::KeyG), "KeyH" => Some(Key::KeyH),
            "KeyI" => Some(Key::KeyI), "KeyJ" => Some(Key::KeyJ),
            "KeyK" => Some(Key::KeyK), "KeyL" => Some(Key::KeyL),
            "KeyM" => Some(Key::KeyM), "KeyN" => Some(Key::KeyN),
            "KeyO" => Some(Key::KeyO), "KeyP" => Some(Key::KeyP),
            "KeyQ" => Some(Key::KeyQ), "KeyR" => Some(Key::KeyR),
            "KeyS" => Some(Key::KeyS), "KeyT" => Some(Key::KeyT),
            "KeyU" => Some(Key::KeyU), "KeyV" => Some(Key::KeyV),
            "KeyW" => Some(Key::KeyW), "KeyX" => Some(Key::KeyX),
            "KeyY" => Some(Key::KeyY), "KeyZ" => Some(Key::KeyZ),
            // Digits
            "Num0" => Some(Key::Num0), "Num1" => Some(Key::Num1),
            "Num2" => Some(Key::Num2), "Num3" => Some(Key::Num3),
            "Num4" => Some(Key::Num4), "Num5" => Some(Key::Num5),
            "Num6" => Some(Key::Num6), "Num7" => Some(Key::Num7),
            "Num8" => Some(Key::Num8), "Num9" => Some(Key::Num9),
            // Unrecognised
            _ => None,
        }
    }

    // -----------------------------------------------------------------------
    // Private helpers
    // -----------------------------------------------------------------------

    /// Resolves the absolute path to the config file.
    ///
    /// Returns `None` if `dirs::data_dir()` is unavailable (e.g., on a
    /// headless server or non-standard Windows installation).
    fn config_path() -> Option<PathBuf> {
        dirs::data_dir().map(|mut p| {
            p.push("EasyWheelAE");
            p.push("easywheel.json");
            p
        })
    }


    /// Reads and parses `AppConfig` from `path`.
    ///
    /// On any failure (I/O or parse error):
    /// - The corrupt file is renamed to `config.json.bak` for debugging.
    /// - The default `AppConfig` is returned and saved.
    fn read_from_disk(path: &PathBuf) -> AppConfig {
        match std::fs::read_to_string(path) {
            Ok(contents) => match serde_json::from_str::<AppConfig>(&contents) {
                Ok(config) => {
                    println!(
                        "[ConfigManager] Info: Configuration loaded from {:?}.",
                        path
                    );
                    config
                }
                Err(e) => {
                    eprintln!(
                        "[ConfigManager] Warning: Failed to parse config — {e}. \
                         Renaming corrupt file and regenerating defaults."
                    );
                    Self::backup_corrupt_file(path);
                    let default = AppConfig::default();
                    Self::write_to_disk(path, &default);
                    default
                }
            },
            Err(e) => {
                eprintln!(
                    "[ConfigManager] Warning: Failed to read config file — {e}. \
                     Generating defaults."
                );
                let default = AppConfig::default();
                Self::write_to_disk(path, &default);
                default
            }
        }
    }

    /// Serialises `config` to `path` with pretty-print formatting.
    ///
    /// Creates the parent directory if it does not exist.
    /// Logs a warning on any I/O failure; never panics.
    fn write_to_disk(path: &PathBuf, config: &AppConfig) {
        // Ensure the parent directory exists.
        if let Some(parent) = path.parent() {
            if let Err(e) = std::fs::create_dir_all(parent) {
                eprintln!(
                    "[ConfigManager] Warning: Could not create config directory \
                     {:?} — {e}.",
                    parent
                );
                return;
            }
        }

        match serde_json::to_string_pretty(config) {
            Ok(json) => {
                if let Err(e) = std::fs::write(path, json) {
                    eprintln!(
                        "[ConfigManager] Warning: Failed to write config to \
                         {:?} — {e}.",
                        path
                    );
                } else {
                    println!(
                        "[ConfigManager] Info: Configuration saved to {:?}.",
                        path
                    );
                }
            }
            Err(e) => {
                eprintln!(
                    "[ConfigManager] Warning: Failed to serialise configuration — {e}."
                );
            }
        }
    }

    /// Renames a corrupt config file to `config.json.bak`.
    ///
    /// Overwrites any existing `.bak` file. Logs a warning on failure.
    fn backup_corrupt_file(path: &PathBuf) {
        let mut bak = path.clone();
        bak.set_extension("json.bak");
        if let Err(e) = std::fs::rename(path, &bak) {
            eprintln!(
                "[ConfigManager] Warning: Could not rename corrupt config \
                 file to {:?} — {e}.",
                bak
            );
        } else {
            println!(
                "[ConfigManager] Info: Corrupt config backed up to {:?}.",
                bak
            );
        }
    }
}
