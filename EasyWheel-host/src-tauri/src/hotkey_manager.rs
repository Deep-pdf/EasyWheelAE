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
//! # Activation key
//!
//! The activation key is read from `host_config::ACTIVATION_KEY`. This
//! module never defines its own key value.

use std::sync::atomic::{AtomicBool, Ordering};

use rdev::{listen, Event, EventType};
use tauri::{AppHandle, Runtime};

use crate::{host_config, overlay_manager::OverlayManager};

/// Tracks whether the activation key is currently held down.
///
/// Prevents repeated `show()` calls caused by Windows key-repeat messages.
/// Cleared on `KeyRelease` so the next `KeyPress` edge is recognised again.
static KEY_DOWN: AtomicBool = AtomicBool::new(false);

/// Manages the global keyboard listener.
///
/// `HotkeyManager` is a unit struct — it holds no instance state.
/// The listener runs on a background thread managed by the OS scheduler.
///
/// # Responsibilities
///
/// - Register the system-wide keyboard listener.
/// - Translate `KeyPress` and `KeyRelease` edges into overlay commands.
/// - Prevent repeated triggers while the activation key is held.
/// - Delegate all overlay operations to `OverlayManager`.
///
/// # Out of Scope
///
/// This module does not manage windows, maintain application state,
/// or define the activation key.
pub struct HotkeyManager;

impl HotkeyManager {
    /// Installs the global keyboard listener on a dedicated background thread.
    ///
    /// The listener captures `AppHandle` and uses it to drive `OverlayManager`
    /// on every qualifying key event. If the thread fails to spawn, the error
    /// is logged and the application continues running without hotkey support.
    ///
    /// # Type bounds
    ///
    /// `R: Runtime + 'static` is required because the captured `AppHandle<R>`
    /// must be `'static` to satisfy `std::thread::spawn`'s closure bound.
    pub fn register<R: Runtime + 'static>(app: &AppHandle<R>) {
        let handle = app.clone();

        match std::thread::Builder::new()
            .name("hotkey-listener".into())
            .spawn(move || Self::run_listener(handle))
        {
            Ok(_) => {
                println!(
                    "[EasyWheel Host] Info: Hotkey registered. Listening for {:?}.",
                    host_config::ACTIVATION_KEY
                );
            }
            Err(e) => {
                eprintln!(
                    "[EasyWheel Host] Error: Failed to spawn hotkey listener thread — {e}. \
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
    fn run_listener<R: Runtime + 'static>(handle: AppHandle<R>) {
        if let Err(e) = listen(move |event: Event| {
            Self::handle_event(&handle, &event);
        }) {
            eprintln!(
                "[EasyWheel Host] Error: Global keyboard listener terminated unexpectedly — \
                 {e:?}. Hotkey activation is no longer available."
            );
        }
    }

    /// Processes a single keyboard event from the global hook.
    ///
    /// Only reacts to the configured `ACTIVATION_KEY`. For `KeyPress`, the
    /// `KEY_DOWN` atomic swap ensures the overlay is shown only on the first
    /// edge — subsequent key-repeat messages are discarded. For `KeyRelease`,
    /// the swap clears the flag and triggers `hide()`.
    fn handle_event<R: Runtime>(app: &AppHandle<R>, event: &Event) {
        match &event.event_type {
            EventType::KeyPress(key) if *key == host_config::ACTIVATION_KEY => {
                // swap(true) returns previous value; only act on the rising edge.
                if !KEY_DOWN.swap(true, Ordering::Relaxed) {
                    println!("[EasyWheel Host] Info: Hotkey pressed.");
                    OverlayManager::show(app);
                }
            }
            EventType::KeyRelease(key) if *key == host_config::ACTIVATION_KEY => {
                // swap(false) returns previous value; only act if key was actually down.
                if KEY_DOWN.swap(false, Ordering::Relaxed) {
                    println!("[EasyWheel Host] Info: Hotkey released.");
                    OverlayManager::hide(app);
                }
            }
            _ => {}
        }
    }
}
