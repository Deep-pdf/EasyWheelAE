// Module declarations. Each module has a single, well-defined responsibility.
// No business logic is permitted in this file beyond application orchestration.
mod action_manager;
mod action_registry;
mod app_state;
mod commands;
mod config_manager;
mod foreground_application;
mod geometry_manager;
mod hotkey_manager;
mod input_manager;
mod models;
mod overlay_manager;
mod profile_manager;
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
/// 1. **Load Configuration** — must be first. Every subsequent module reads
///    runtime values (hotkey, dead-zone, sector count) from `ConfigManager`.
/// 2. **Register AppState** — must be before any Tauri command is invoked so
///    `tauri::State<AppState>` is resolvable.
/// 3. **Register close interceptor** — must be registered before the window
///    is first shown to guarantee the handler covers every show/hide cycle.
/// 4. **Hide main window** — doubly guaranteed by `"visible": false` in
///    `tauri.conf.json`. The code-level hide is a defensive second layer.
/// 5. **Create system tray** — makes the application visible to the user.
/// 6. **Create overlay** — must exist before the hotkey listener starts.
/// 7. **Register hotkey** — last, because it begins dispatching events
///    immediately and reads the parsed key values from `ConfigManager`.
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let handle = app.handle().clone();

            println!("[EasyWheel Host] Info: Application started.");

            // Step 1 — Load configuration. Must be first so all subsequent
            // modules can read runtime values without a circular dependency.
            config_manager::ConfigManager::load();

            // Step 2 — Register global application state.
            app.manage(app_state::AppState::new());

            // Step 3 — Intercept window close events before any window is shown.
            window_manager::WindowManager::register_close_handler(&handle);

            // Step 4 — Hide the main window. The window was created by Tauri
            // with "visible": false, so this is a defensive guarantee.
            window_manager::WindowManager::hide(&handle);

            // Step 5 — Create the system tray. Propagate failure as fatal.
            tray::TrayManager::create(&handle).map_err(|e| {
                eprintln!("[EasyWheel Host] Fatal: System tray creation failed — {e}");
                e
            })?;

            // Step 6 — Verify the overlay window and ensure it starts hidden.
            overlay_manager::OverlayManager::create(&handle);

            // Step 7 — Install the global keyboard hook. Non-fatal on failure.
            // Reads the activation key chord from ConfigManager (already loaded).
            hotkey_manager::HotkeyManager::register(&handle);

            println!(
                "[EasyWheel Host] Info: Initialisation complete. Running in system tray."
            );
            Ok(())
        })
        // Commands are registered here as the handler list grows in future phases.
        .invoke_handler(tauri::generate_handler![
            commands::get_pointer_state,
            commands::get_geometry_state,
        ])
        .run(tauri::generate_context!())
        .expect("Fatal: Tauri application failed to start.");
}
