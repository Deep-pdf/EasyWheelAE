// Module declarations. Each module has a single, well-defined responsibility.
// No business logic is permitted in this file beyond application orchestration.
mod app_state;
mod commands;
mod host_config;
mod hotkey_manager;
mod input_manager;
mod overlay_manager;
mod tray;
mod window_manager;

// `Manager` must be explicitly imported for `app.manage()` to resolve.
// Rust requires trait methods to be in scope at the call site.
use tauri::Manager;

/// Initialises and runs the EasyWheel Host Tauri application.
///
/// This function is the sole entry point for the Tauri runtime. It is called
/// from `main.rs` on desktop. The `mobile` attribute is retained for forward
/// compatibility with the Tauri mobile build system.
///
/// # Initialisation Order
///
/// The setup sequence is strictly ordered. Each step depends on the previous:
///
/// 1. **Register AppState** — must be first so that `tauri::State<AppState>`
///    is resolvable from any command invoked after setup completes.
/// 2. **Register close interceptor** — must be registered before the window
///    is first shown to guarantee the handler covers every show/hide cycle.
/// 3. **Hide main window** — doubly guaranteed by `"visible": false` in
///    `tauri.conf.json`. The code-level hide is a defensive second layer.
/// 4. **Create system tray** — makes the application visible to the user.
/// 5. **Create overlay** — must exist before the hotkey listener starts.
/// 6. **Register hotkey** — last, because it begins dispatching events
///    immediately. The overlay must be ready to receive them.
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let handle = app.handle().clone();

            println!("[EasyWheel Host] Info: Application started.");

            // Step 1 — Register global application state.
            app.manage(app_state::AppState::new());

            // Step 2 — Intercept window close events before any window is shown.
            window_manager::WindowManager::register_close_handler(&handle);

            // Step 3 — Hide the main window. The window was created by Tauri
            // with "visible": false, so this is a defensive guarantee.
            window_manager::WindowManager::hide(&handle);

            // Step 4 — Create the system tray. Propagate failure as fatal.
            tray::TrayManager::create(&handle).map_err(|e| {
                eprintln!("[EasyWheel Host] Fatal: System tray creation failed — {e}");
                e
            })?;

            // Step 5 — Verify the overlay window and ensure it starts hidden.
            overlay_manager::OverlayManager::create(&handle);

            // Step 6 — Install the global keyboard hook. Non-fatal on failure.
            hotkey_manager::HotkeyManager::register(&handle);

            println!(
                "[EasyWheel Host] Info: Initialisation complete. Running in system tray."
            );
            Ok(())
        })
        // Commands are registered here as the handler list grows in future phases.
        .invoke_handler(tauri::generate_handler![commands::get_pointer_state])
        .run(tauri::generate_context!())
        .expect("Fatal: Tauri application failed to start.");
}
