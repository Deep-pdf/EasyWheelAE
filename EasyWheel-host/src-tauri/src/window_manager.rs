use tauri::{AppHandle, Manager, Runtime, WebviewWindow};

/// Manages all lifecycle operations for the main application window.
///
/// `WindowManager` is a unit struct — it holds no state because the
/// authoritative window reference is owned by the Tauri runtime and
/// retrieved on demand via `AppHandle::get_webview_window`.
///
/// # Design Rule
///
/// No other module in the backend may call `WebviewWindow` APIs directly.
/// All show, hide, focus, and event-registration operations must route
/// through this module to keep window concerns in one place.
pub struct WindowManager;

/// The Tauri window label for the main application window, as defined
/// in `tauri.conf.json`. This constant is the single source of truth —
/// changing the window label in config requires only updating this value.
const MAIN_WINDOW_LABEL: &str = "main";

impl WindowManager {
    /// Hides the main window without terminating the application.
    ///
    /// Logs a warning rather than panicking if the window is not found,
    /// because `hide` may be called during early startup before Tauri has
    /// fully initialised the window.
    pub fn hide<R: Runtime>(app: &AppHandle<R>) {
        match Self::get_window(app) {
            Some(window) => {
                if let Err(e) = window.hide() {
                    eprintln!("[EasyWheel Host] Error: Failed to hide main window — {e}");
                } else {
                    println!("[EasyWheel Host] Info: Main window hidden.");
                }
            }
            None => {
                eprintln!(
                    "[EasyWheel Host] Warning: hide() called but window '{}' was not found.",
                    MAIN_WINDOW_LABEL
                );
            }
        }
    }

    /// Shows the main window and brings it to the foreground with input focus.
    ///
    /// The correct sequence on Windows is `show()` before `set_focus()`.
    /// Reversing the order causes the window to render without receiving
    /// keyboard focus on certain Windows configurations.
    pub fn show_and_focus<R: Runtime>(app: &AppHandle<R>) {
        match Self::get_window(app) {
            Some(window) => {
                if let Err(e) = window.show() {
                    eprintln!("[EasyWheel Host] Error: Failed to show main window — {e}");
                    return;
                }
                if let Err(e) = window.set_focus() {
                    eprintln!("[EasyWheel Host] Error: Failed to focus main window — {e}");
                } else {
                    println!("[EasyWheel Host] Info: Main window restored and focused.");
                }
            }
            None => {
                eprintln!(
                    "[EasyWheel Host] Warning: show_and_focus() called but window '{}' was not found.",
                    MAIN_WINDOW_LABEL
                );
            }
        }
    }

    /// Intercepts the window close button and hides the window instead of
    /// destroying it.
    ///
    /// This mirrors the behaviour of Discord, Steam, and PowerToys: pressing
    /// the `×` button does not exit the application — it returns it to the
    /// system tray. The only way to terminate is via the tray "Exit" item.
    ///
    /// # Implementation Note
    ///
    /// `CloseRequestApi::prevent_close()` instructs the OS to cancel the
    /// pending WM_CLOSE message. The window is then hidden programmatically.
    /// This must be registered before the window is first shown to guarantee
    /// the handler is in place for every subsequent close attempt.
    pub fn register_close_handler<R: Runtime>(app: &AppHandle<R>) {
        match Self::get_window(app) {
            Some(window) => {
                let handle = app.clone();
                window.on_window_event(move |event| {
                    if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                        api.prevent_close();
                        WindowManager::hide(&handle);
                    }
                });
                println!("[EasyWheel Host] Info: Close interceptor registered on main window.");
            }
            None => {
                eprintln!(
                    "[EasyWheel Host] Warning: register_close_handler() called but window '{}' was not found.",
                    MAIN_WINDOW_LABEL
                );
            }
        }
    }

    /// Retrieves the main window from the Tauri runtime by its label.
    ///
    /// Returns `None` if the window has not yet been created or has been
    /// destroyed. Callers are responsible for handling the `None` case.
    fn get_window<R: Runtime>(app: &AppHandle<R>) -> Option<WebviewWindow<R>> {
        app.get_webview_window(MAIN_WINDOW_LABEL)
    }
}
