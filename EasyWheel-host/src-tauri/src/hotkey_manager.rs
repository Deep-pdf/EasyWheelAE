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
    /// Resolves the activation key chord from `ConfigManager` at call time.
    /// Falls back to `Alt + F1` with a warning if either key string is
    /// unrecognised. The resolved keys are captured by value into the listener
    /// closure, so config changes take effect only after a restart (Phase 6
    /// will add dynamic reload support).
    pub fn register<R: Runtime + 'static>(app: &AppHandle<R>) {
        let handle = app.clone();

        // Resolve activation keys from the runtime config.
        let config = ConfigManager::get();

        let modifier = ConfigManager::parse_rdev_key(&config.global.activation_modifier)
            .unwrap_or_else(|| {
                eprintln!(
                    "[HotkeyManager] Warning: Unrecognised activation_modifier '{}'. \
                     Falling back to Alt.",
                    config.global.activation_modifier
                );
                Key::Alt
            });

        let trigger = ConfigManager::parse_rdev_key(&config.global.activation_key)
            .unwrap_or_else(|| {
                eprintln!(
                    "[HotkeyManager] Warning: Unrecognised activation_key '{}'. \
                     Falling back to F1.",
                    config.global.activation_key
                );
                Key::F1
            });

        match std::thread::Builder::new()
            .name("hotkey-listener".into())
            .spawn(move || Self::run_listener(handle, modifier, trigger))
        {
            Ok(_) => {
                println!(
                    "[HotkeyManager] Info: Hotkey registered. \
                     Listening for {:?} + {:?}.",
                    modifier, trigger,
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

    /// Runs `rdev::listen` on the calling thread.
    ///
    /// `rdev::listen` blocks indefinitely and processes OS keyboard hook
    /// messages via an internal `GetMessage`/`DispatchMessage` loop on
    /// Windows. It only returns on a fatal hook error.
    fn run_listener<R: Runtime + 'static>(handle: AppHandle<R>, modifier: Key, trigger: Key) {
        if let Err(e) = listen(move |event: Event| {
            Self::handle_event(&handle, &event, modifier, trigger);
        }) {
            eprintln!(
                "[HotkeyManager] Error: Global keyboard listener terminated unexpectedly — \
                 {e:?}. Hotkey activation is no longer available."
            );
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
    fn handle_event<R: Runtime>(app: &AppHandle<R>, event: &Event, modifier: Key, trigger: Key) {
        match &event.event_type {
            // -----------------------------------------------------------
            // Modifier key tracking
            // -----------------------------------------------------------
            EventType::KeyPress(key) if *key == modifier => {
                MODIFIER_DOWN.store(true, Ordering::Relaxed);
            }
            EventType::KeyRelease(key) if *key == modifier => {
                MODIFIER_DOWN.store(false, Ordering::Relaxed);
                // If the chord was active, releasing the modifier dismisses
                // the overlay even if the trigger key is still physically held.
                if KEY_DOWN.swap(false, Ordering::Relaxed) {
                    println!("[HotkeyManager] Info: Modifier released — hiding overlay.");
                    OverlayManager::hide(app);
                }
            }

            // -----------------------------------------------------------
            // Trigger key — only fires when modifier is already held
            // -----------------------------------------------------------
            EventType::KeyPress(key) if *key == trigger => {
                if MODIFIER_DOWN.load(Ordering::Relaxed) {
                    // swap(true) returns previous value; only act on the rising edge.
                    if !KEY_DOWN.swap(true, Ordering::Relaxed) {
                        println!("[HotkeyManager] Info: Hotkey chord pressed (modifier + trigger).");
                        OverlayManager::show(app);
                    }
                }
            }
            EventType::KeyRelease(key) if *key == trigger => {
                // swap(false) returns previous value; only act if chord was active.
                if KEY_DOWN.swap(false, Ordering::Relaxed) {
                    println!("[HotkeyManager] Info: Trigger key released — hiding overlay.");
                    OverlayManager::hide(app);
                }
            }

            _ => {}
        }
    }
}
