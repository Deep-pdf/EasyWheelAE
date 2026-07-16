/// Global application state for EasyWheel Host.
///
/// Registered with the Tauri runtime via `app.manage(AppState::new())` during
/// application setup. Accessed in commands via `tauri::State<AppState>`.
///
/// # Extensibility
///
/// This struct is the single authoritative location for shared application
/// state. Fields are added here as each phase introduces new runtime state.
/// No other module may introduce global singletons — all shared state must
/// live in `AppState`. Planned additions:
///
/// - Phase 3: `hotkey_active: Mutex<bool>`
/// - Phase 3: `overlay_visible: Mutex<bool>`
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
