//! Global hotkey listener for EasyWheel Host.
//!
//! `HotkeyManager` installs a system-wide low-level keyboard hook using
//! `rdev`, which uses `SetWindowsHookEx(WH_KEYBOARD_LL)` on Windows.
//! The hook fires for every key event regardless of which application has
//! focus.
//!
//! # Threading model
//!
//! `rdev::listen` blocks the calling thread and requires a Windows message
//! loop on that thread to deliver hook events. `HotkeyManager::register`
//! spawns a dedicated `hotkey-listener` thread to avoid blocking the Tauri
//! setup thread. The spawned thread runs for the entire application lifetime.
//!
//! # Activation chord
//!
//! The activation gesture is a **modifier + key chord** defined in
//! `host_config`:
//!
//! - `ACTIVATION_MODIFIER` — must be held down first (e.g. `Key::Alt`).
//! - `ACTIVATION_KEY`      — the trigger key pressed while the modifier is
//!   held (e.g. `Key::F1`).
//!
//! The overlay shows on the rising edge of `ACTIVATION_KEY` (only while
//! `ACTIVATION_MODIFIER` is down). It hides when either key is released.
//! This module never defines its own key values.

use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;

use rdev::{listen, Event, EventType, Key};
use tauri::{AppHandle, Runtime};

use crate::{config_manager::ConfigManager, overlay_manager::OverlayManager};

/// Tracks whether the modifier key (e.g. Alt) is currently held down.
///
/// Set on `KeyPress` of `ACTIVATION_MODIFIER`, cleared on its `KeyRelease`.
/// The atomicity prevents races between the hotkey thread and any future
/// background thread that might read this value.
static MODIFIER_DOWN: AtomicBool = AtomicBool::new(false);

/// Tracks whether the activation chord is currently active (both modifier
/// and trigger key are held).
///
/// Prevents repeated `show()` calls caused by Windows key-repeat messages.
/// Cleared on `KeyRelease` of either key so the next rising edge is
/// recognised again correctly.
static KEY_DOWN: AtomicBool = AtomicBool::new(false);

/// Active modifier and trigger keys currently parsed from configuration.
/// Updated at runtime dynamically without restarting the event listener thread.
#[cfg(target_os = "windows")]
static ACTIVE_KEYS: Mutex<(Key, Key)> = Mutex::new((Key::Alt, Key::F1));
#[cfg(not(target_os = "windows"))]
static ACTIVE_KEYS: Mutex<(Key, Key)> = Mutex::new((Key::ControlLeft, Key::Space));

/// Manages the global keyboard listener.
///
/// `HotkeyManager` is a unit struct — it holds no instance state.
/// The listener runs on a background thread managed by the OS scheduler.
///
/// # Responsibilities
///
/// - Register the system-wide keyboard listener.
/// - Track modifier state independently of the trigger key.
/// - Detect the rising edge of the activation chord.
/// - Detect release of either key and hide the overlay.
/// - Delegate all overlay operations to `OverlayManager`.
///
/// # Out of Scope
///
/// This module does not manage windows, maintain application state,
/// perform geometry calculations, or define any key values.
pub struct HotkeyManager;

impl HotkeyManager {
    /// Installs the global keyboard listener on a dedicated background thread.
    ///
    /// Resolves the activation key chord from `ConfigManager` and subscribes to
    /// configuration updates so they are hot-reloaded dynamically.
    pub fn register<R: Runtime + 'static>(app: &AppHandle<R>) {
        let handle = app.clone();

        // Load initial keys into the static variable.
        Self::update_keys();

        match std::thread::Builder::new()
            .name("hotkey-listener".into())
            .spawn(move || Self::run_listener(handle))
        {
            Ok(_) => {
                println!(
                    "[HotkeyManager] Info: Hotkey registered."
                );
            }
            Err(e) => {
                eprintln!(
                    "[HotkeyManager] Error: Failed to spawn hotkey listener thread — {e}. \
                     Hotkey activation will be unavailable."
                );
            }
        }
    }

    /// Reloads activation keys from the current configuration.
    ///
    /// Triggered automatically on configuration save or reload since it is registered
    /// as a subscriber to `ConfigManager` updates.
    pub fn update_keys() {
        let config = ConfigManager::get();

        #[cfg(target_os = "windows")]
        let (default_mod, default_trigger) = (Key::Alt, Key::F1);
        #[cfg(not(target_os = "windows"))]
        let (default_mod, default_trigger) = (Key::ControlLeft, Key::Space);

        let modifier = ConfigManager::parse_rdev_key(&config.global.activation_modifier)
            .unwrap_or_else(|| {
                eprintln!(
                    "[HotkeyManager] Warning: Unrecognised activation_modifier '{}'. \
                     Falling back to default.",
                    config.global.activation_modifier
                );
                default_mod
            });

        let trigger = ConfigManager::parse_rdev_key(&config.global.activation_key)
            .unwrap_or_else(|| {
                eprintln!(
                    "[HotkeyManager] Warning: Unrecognised activation_key '{}'. \
                     Falling back to default.",
                    config.global.activation_key
                );
                default_trigger
            });

        {
            let mut guard = ACTIVE_KEYS.lock().unwrap_or_else(|e| e.into_inner());
            *guard = (modifier, trigger);
        }

        println!(
            "[HotkeyManager] Info: Active hotkey updated to {:?} + {:?}",
            modifier, trigger
        );
    }

    /// Runs `rdev::listen` on the calling thread.
    ///
    /// `rdev::listen` blocks indefinitely and processes OS keyboard hook
    /// messages via an internal `GetMessage`/`DispatchMessage` loop on
    /// Windows. It only returns on a fatal hook error.
    fn run_listener<R: Runtime + 'static>(handle: AppHandle<R>) {
        println!("[HotkeyManager:DIAG] Starting rdev::listen() on thread {:?}...", std::thread::current().id());
        if let Err(e) = listen(move |event: Event| {
            Self::handle_event(&handle, &event);
        }) {
            eprintln!(
                "[HotkeyManager:DIAG] Fatal: Global keyboard listener terminated with error: {e:?}"
            );
        }
    }

    /// Helper to test if a key matches the target modifier, accounting for
    /// left/right variants across platform keymaps.
    fn matches_modifier(key: Key, target: Key) -> bool {
        if key == target {
            return true;
        }
        match target {
            Key::ControlLeft | Key::ControlRight => matches!(key, Key::ControlLeft | Key::ControlRight),
            Key::Alt | Key::AltGr => matches!(key, Key::Alt | Key::AltGr),
            Key::ShiftLeft | Key::ShiftRight => matches!(key, Key::ShiftLeft | Key::ShiftRight),
            Key::MetaLeft | Key::MetaRight => matches!(key, Key::MetaLeft | Key::MetaRight),
            _ => false,
        }
    }

    /// Processes a single keyboard event from the global hook.
    ///
    /// # Modifier tracking
    ///
    /// `KeyPress(modifier)` sets `MODIFIER_DOWN`.
    /// `KeyRelease(modifier)` clears it and, if the chord was active, hides
    /// the overlay immediately so releasing the modifier alone is sufficient
    /// to dismiss the wheel.
    ///
    /// # Trigger key
    ///
    /// `KeyPress(trigger)` shows the overlay only when `MODIFIER_DOWN` is set
    /// and this is the rising edge (key-repeat messages are discarded).
    /// `KeyRelease(trigger)` hides the overlay regardless of modifier state.
    fn handle_event<R: Runtime>(app: &AppHandle<R>, event: &Event) {
        let (modifier, trigger) = {
            let guard = ACTIVE_KEYS.lock().unwrap_or_else(|e| e.into_inner());
            *guard
        };

        match &event.event_type {
            EventType::KeyPress(key) => {
                let is_mod = Self::matches_modifier(*key, modifier);
                let is_trig = *key == trigger;
                let mod_down = MODIFIER_DOWN.load(Ordering::Relaxed);
                println!(
                    "[HotkeyManager:DIAG] KeyPress: {:?} (name: {:?}) | Target: ({:?}, {:?}) | is_mod: {} | is_trig: {} | mod_down: {}",
                    key, event.name, modifier, trigger, is_mod, is_trig, mod_down
                );
                if is_mod {
                    MODIFIER_DOWN.store(true, Ordering::Relaxed);
                    println!("[HotkeyManager:DIAG] MODIFIER_DOWN set to true");
                }
                if is_trig {
                    if mod_down {
                        if !KEY_DOWN.swap(true, Ordering::Relaxed) {
                            println!("[HotkeyManager:DIAG] Trigger matched and modifier held! Calling OverlayManager::show()");
                            OverlayManager::show(app);
                        }
                    } else {
                        println!("[HotkeyManager:DIAG] Trigger pressed but MODIFIER_DOWN is false");
                    }
                }
            }
            EventType::KeyRelease(key) => {
                let is_mod = Self::matches_modifier(*key, modifier);
                let is_trig = *key == trigger;
                println!(
                    "[HotkeyManager:DIAG] KeyRelease: {:?} | is_mod: {} | is_trig: {}",
                    key, is_mod, is_trig
                );
                if is_mod {
                    MODIFIER_DOWN.store(false, Ordering::Relaxed);
                    println!("[HotkeyManager:DIAG] MODIFIER_DOWN cleared to false");
                    if KEY_DOWN.swap(false, Ordering::Relaxed) {
                        println!("[HotkeyManager:DIAG] Modifier released while active, hiding overlay");
                        OverlayManager::hide(app);
                    }
                }
                if is_trig && KEY_DOWN.swap(false, Ordering::Relaxed) {
                    println!("[HotkeyManager:DIAG] Trigger released while active, hiding overlay");
                    OverlayManager::hide(app);
                }
            }
            _ => {}
        }
    }
}
