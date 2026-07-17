//! Overlay window lifecycle management for EasyWheel Host.
//!
//! `OverlayManager` is the sole authority over the transparent overlay
//! window. No other module may call `WebviewWindow` APIs on the overlay
//! directly — all operations must route through this module.

use std::sync::atomic::{AtomicBool, Ordering};

use tauri::{AppHandle, Manager, Runtime, WebviewWindow};

/// Tauri window label for the overlay, as declared in `tauri.conf.json`.
/// This is the single source of truth — update both if the label changes.
const OVERLAY_LABEL: &str = "overlay";

/// Tracks whether the overlay is currently visible.
///
/// Stored as a module-level atomic to avoid requiring a `Mutex` round-trip
/// on every hotkey event. `Relaxed` ordering is sufficient because there is
/// no dependent memory access that must be ordered relative to this flag.
static VISIBLE: AtomicBool = AtomicBool::new(false);

/// Manages all lifecycle operations for the overlay window.
///
/// `OverlayManager` is a unit struct — it holds no instance state because
/// the overlay window is owned by the Tauri runtime and retrieved on demand
/// via `AppHandle::get_webview_window`.
///
/// # Responsibilities
///
/// - **Create**: verify the overlay window exists and ensure it is hidden.
/// - **Show**: make the overlay visible; no-op if already visible.
/// - **Hide**: make the overlay invisible; no-op if already hidden.
///
/// # Out of Scope
///
/// This module does not interpret hotkey events, manage application state,
/// or render any content. Content is owned entirely by the frontend.
pub struct OverlayManager;

impl OverlayManager {
    /// Verifies the overlay window exists and ensures it starts hidden.
    ///
    /// Called once during application setup, after Tauri has constructed
    /// all windows declared in `tauri.conf.json`. Logs a non-fatal error
    /// if the window is unexpectedly absent so the application can continue.
    pub fn create<R: Runtime>(app: &AppHandle<R>) {
        match Self::get_window(app) {
            Some(window) => {
                if let Err(e) = window.hide() {
                    eprintln!(
                        "[EasyWheel Host] Error: Failed to hide overlay during create — {e}"
                    );
                } else {
                    println!("[EasyWheel Host] Info: Overlay created.");
                }
            }
            None => {
                eprintln!(
                    "[EasyWheel Host] Error: Overlay window '{}' not found. \
                     Verify label in tauri.conf.json.",
                    OVERLAY_LABEL
                );
            }
        }
    }

    /// Shows the overlay window.
    ///
    /// No-op if the overlay is already visible. Logs the transition on
    /// success and an error message on failure; never panics.
    pub fn show<R: Runtime>(app: &AppHandle<R>) {
        if VISIBLE.load(Ordering::Relaxed) {
            return;
        }

        match Self::get_window(app) {
            Some(window) => {
                if let Err(e) = window.show() {
                    eprintln!("[EasyWheel Host] Error: Failed to show overlay — {e}");
                } else {
                    VISIBLE.store(true, Ordering::Relaxed);
                    println!("[EasyWheel Host] Info: Overlay visible.");
                }
            }
            None => {
                eprintln!(
                    "[EasyWheel Host] Warning: show() called but overlay window '{}' not found.",
                    OVERLAY_LABEL
                );
            }
        }
    }

    /// Hides the overlay window.
    ///
    /// No-op if the overlay is already hidden. Logs the transition on
    /// success and an error message on failure; never panics.
    pub fn hide<R: Runtime>(app: &AppHandle<R>) {
        if !VISIBLE.load(Ordering::Relaxed) {
            return;
        }

        match Self::get_window(app) {
            Some(window) => {
                if let Err(e) = window.hide() {
                    eprintln!("[EasyWheel Host] Error: Failed to hide overlay — {e}");
                } else {
                    VISIBLE.store(false, Ordering::Relaxed);
                    println!("[EasyWheel Host] Info: Overlay hidden.");
                }
            }
            None => {
                eprintln!(
                    "[EasyWheel Host] Warning: hide() called but overlay window '{}' not found.",
                    OVERLAY_LABEL
                );
            }
        }
    }

    /// Retrieves the overlay window from the Tauri runtime by its label.
    fn get_window<R: Runtime>(app: &AppHandle<R>) -> Option<WebviewWindow<R>> {
        app.get_webview_window(OVERLAY_LABEL)
    }
}
