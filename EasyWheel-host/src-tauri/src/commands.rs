//! Tauri command implementations for EasyWheel Host.
//!
//! All `#[tauri::command]` functions must be defined in this module.
//! They are registered in `lib.rs` via `tauri::generate_handler![]`.
//!
//! This module exists as an explicit architectural boundary. No commands
//! may be defined in `lib.rs`, `main.rs`, or any other module. This ensures
//! the command surface area is always auditable from a single location.
//!
//! # Phase 2
//!
//! No commands are implemented in Phase 2. The tray and window lifecycle
//! are driven entirely from the Rust backend — the frontend has no need
//! to invoke Rust commands at this stage.
//!
//! # Phase 3+ (planned)
//!
//! Commands for hotkey registration, overlay control, and settings
//! read/write will be added here.
