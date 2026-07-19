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
mod command_dispatcher;
mod provider_registry;
mod providers;

// `Manager` must be explicitly imported for `app.manage()` to resolve.
use tauri::Manager;

/// Initialises and runs the EasyWheel Host Tauri application.
///
/// # Initialisation Order
///
/// 1. **Load Configuration** — must be first. Every subsequent module reads
///    runtime values from `ConfigManager`.
/// 2. **Register AppState** — must be before any Tauri command is invoked.
/// 3. **Register close interceptor** — must be before the window is shown.
/// 4. **Hide main window** — defensive second layer after `"visible": false`.
/// 5. **Create system tray** — makes the application visible to the user.
/// 6. **Create overlay** — must exist before the hotkey listener starts.
/// 7. **Register hotkey** — last, dispatches events immediately.
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let handle = app.handle().clone();

            println!("[EasyWheel Host] Info: Application started.");

            // Step 1 — Load configuration.
            config_manager::ConfigManager::load();

            // Subscribe managers to config updates.
            config_manager::ConfigManager::subscribe(action_manager::ActionManager::rebuild);
            config_manager::ConfigManager::subscribe(hotkey_manager::HotkeyManager::update_keys);

            // Step 2 — Register global application state.
            app.manage(app_state::AppState::new());
            app_state::set_app_handle(handle.clone());

            // Register default command execution providers.
            providers::register_defaults();

            // Step 3 — Intercept window close events.
            window_manager::WindowManager::register_close_handler(&handle);

            // Step 4 — Hide the main window.
            window_manager::WindowManager::hide(&handle);

            // Step 5 — Create the system tray.
            tray::TrayManager::create(&handle).map_err(|e| {
                eprintln!("[EasyWheel Host] Fatal: System tray creation failed — {e}");
                e
            })?;

            // Step 6 — Verify the overlay window.
            overlay_manager::OverlayManager::create(&handle);

            // Step 7 — Install the global keyboard hook.
            hotkey_manager::HotkeyManager::register(&handle);

            println!(
                "[EasyWheel Host] Info: Initialisation complete. Running in system tray."
            );
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Phase 3/4 — Overlay commands
            commands::get_pointer_state,
            commands::get_geometry_state,
            // Phase 6 — Settings commands
            commands::get_config,
            commands::save_config,
            commands::reload_config,
            commands::get_running_apps,
            commands::open_settings,
        ])
        .run(tauri::generate_context!())
        .expect("Fatal: Tauri application failed to start.");
}
