//! Tauri command implementations for EasyWheel Host.
//!
//! All `#[tauri::command]` functions must be defined in this module.
//! They are registered in `lib.rs` via `tauri::generate_handler![]`.
//!
//! This module exists as an explicit architectural boundary. No commands
//! may be defined in `lib.rs`, `main.rs`, or any other module. This ensures
//! the command surface area is always auditable from a single location.

use crate::input_manager::{InputManager, PointerState};

/// Returns a snapshot of the current pointer tracking state.
///
/// Called by the overlay frontend at ~60 FPS via `requestAnimationFrame`.
/// The Rust side is synchronous — it acquires the `InputManager` mutex,
/// clones `PointerState`, and returns immediately. IPC serialisation to
/// JSON is handled automatically by Tauri.
///
/// The frontend uses the returned values to:
/// - Render the debug readout (origin, current, delta, distance).
/// - Position the SVG origin dot, cursor dot, and connecting line.
#[tauri::command]
pub fn get_pointer_state() -> PointerState {
    InputManager::get_state()
}

