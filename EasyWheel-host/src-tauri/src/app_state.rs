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
/// Configuration state is owned by `ConfigManager` via a module-level
/// `OnceLock<Mutex<AppConfig>>`. It is not stored here because it must be
/// accessible from threads that do not have access to the Tauri `AppHandle`.
use tauri::AppHandle;
use std::sync::OnceLock;

/// Global Tauri application handle reference.
static APP_HANDLE: OnceLock<AppHandle> = OnceLock::new();

/// Sets the global application handle.
pub fn set_app_handle(handle: AppHandle) {
    let _ = APP_HANDLE.set(handle);
}

/// Retrieves the global application handle, if set.
pub fn get_app_handle() -> Option<&'static AppHandle> {
    APP_HANDLE.get()
}

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
