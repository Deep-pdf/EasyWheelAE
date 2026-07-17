//! Tauri command implementations for EasyWheel Host.
//!
//! All `#[tauri::command]` functions must be defined in this module.
//! They are registered in `lib.rs` via `tauri::generate_handler![]`.
//!
//! This module exists as an explicit architectural boundary. No commands
//! may be defined in `lib.rs`, `main.rs`, or any other module. This ensures
//! the command surface area is always auditable from a single location.

use crate::geometry_manager::{GeometryManager, GeometryState};
use crate::input_manager::{InputManager, PointerState};

/// Returns a snapshot of the current pointer tracking state.
///
/// Retained from Phase 3. The overlay frontend may call this when it needs
/// raw physical coordinates independently of the geometry pipeline.
/// IPC serialisation to JSON is handled automatically by Tauri.
#[tauri::command]
pub fn get_pointer_state() -> PointerState {
    InputManager::get_state()
}

/// Returns the current geometry state derived from the active pointer session.
///
/// Called by the overlay frontend at ~60 FPS via `requestAnimationFrame`.
/// Internally calls `GeometryManager::compute()`, which reads a fresh
/// `PointerState` snapshot, applies `atan2` + sector mapping, and returns
/// a `GeometryState` containing both the origin coordinates (for wheel
/// centering) and all derived geometry (for sector highlighting).
///
/// A single call per frame is sufficient — `GeometryState` includes
/// `origin_x`/`origin_y` so the frontend does not need to also invoke
/// `get_pointer_state` to position the wheel.
#[tauri::command]
pub fn get_geometry_state() -> GeometryState {
    GeometryManager::compute()
}
