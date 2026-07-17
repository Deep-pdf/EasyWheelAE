/// Global application state for EasyWheel Host.
///
/// Registered with the Tauri runtime via `app.manage(AppState::new())` during
/// application setup. Accessed in commands via `tauri::State<AppState>`.
///
/// # Extensibility
///
/// This struct is the single authoritative location for cross-module shared
/// state. Single-owner state (e.g., overlay visibility, hotkey key-down flag)
/// lives as atomics inside the module that owns it, not here.
///
/// Planned additions:
///
/// - Phase 5: `settings: Mutex<Settings>`
pub struct AppState;

impl AppState {
    /// Creates a new `AppState`.
    pub fn new() -> Self {
        Self
    }
}

impl Default for AppState {
    fn default() -> Self {
        Self::new()
    }
}
