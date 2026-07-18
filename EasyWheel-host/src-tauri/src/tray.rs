use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Runtime,
};

use crate::window_manager::WindowManager;

/// Manages the system tray icon, context menu, and all tray event dispatch.
///
/// `TrayManager` is a unit struct. It holds no instance state because the
/// Tauri runtime takes ownership of the tray icon once `build()` is called
/// and keeps it alive for the entire application lifetime.
///
/// # Responsibilities
///
/// - Constructing the tray icon with the correct icon asset
/// - Building the context menu with all required items
/// - Registering the menu event handler
/// - Registering the tray icon click event handler
/// - Dispatching events to the appropriate action handlers
///
/// # Out of Scope
///
/// This module does not manage windows directly. All window operations
/// are delegated to `WindowManager` to maintain single responsibility.
pub struct TrayManager;

impl TrayManager {
    /// Creates the system tray icon and registers all event handlers.
    ///
    /// This function must be called once during application setup, after
    /// `WindowManager::hide()` has been called. The created tray icon is
    /// owned by the Tauri runtime — this function does not return a handle.
    ///
    /// # Errors
    ///
    /// Returns a `tauri::Error` if the icon asset is invalid, the menu
    /// cannot be constructed, or the OS rejects tray icon creation.
    /// The caller must treat this as fatal and surface the error upward.
    pub fn create<R: Runtime>(app: &AppHandle<R>) -> tauri::Result<()> {
        let menu = Self::build_menu(app)?;
        let icon = Self::load_icon(app);

        TrayIconBuilder::new()
            .icon(icon)
            .menu(&menu)
            .tooltip("EasyWheel Host")
            // Disable the default behaviour of showing the menu on left-click.
            // Left-click is handled explicitly to restore the settings window.
            .show_menu_on_left_click(false)
            .on_menu_event(|app, event| {
                TrayManager::handle_menu_event(app, event.id.as_ref());
            })
            .on_tray_icon_event(|tray, event| {
                let handle = tray.app_handle().clone();
                TrayManager::handle_tray_event(&handle, &event);
            })
            .build(app)?;

        println!("[EasyWheel Host] Info: System tray created successfully.");
        Ok(())
    }

    /// Constructs the context menu shown on right-click.
    ///
    /// Menu layout:
    /// ```text
    /// EasyWheel Host          ← disabled title row
    /// ─────────────────────
    /// ⚙  Open Settings
    /// ↺  Reload Configuration
    /// 🔄  Restart Host
    /// ─────────────────────
    /// ❌  Exit
    /// ```
    fn build_menu<R: Runtime>(app: &AppHandle<R>) -> tauri::Result<Menu<R>> {
        let title = MenuItem::with_id(app, "title", "EasyWheel Host", false, None::<&str>)?;
        let sep1 = PredefinedMenuItem::separator(app)?;
        let open_settings =
            MenuItem::with_id(app, "open_settings", "⚙  Open Settings", true, None::<&str>)?;
        let reload_config =
            MenuItem::with_id(app, "reload_config", "↺  Reload Configuration", true, None::<&str>)?;
        let restart =
            MenuItem::with_id(app, "restart", "🔄  Restart Host", true, None::<&str>)?;
        let sep2 = PredefinedMenuItem::separator(app)?;
        let exit = MenuItem::with_id(app, "exit", "❌  Exit", true, None::<&str>)?;

        Menu::with_items(
            app,
            &[&title, &sep1, &open_settings, &reload_config, &restart, &sep2, &exit],
        )
    }

    /// Loads the tray icon as an owned `Image<'static>` for the tray builder.
    ///
    /// `TrayIconBuilder::icon()` requires `Image<'static>`. The app's default
    /// window icon is a borrowed reference tied to the `AppHandle` lifetime, so
    /// the RGBA pixel data is copied into a `Vec<u8>` and the image is
    /// reconstructed as fully owned via `Image::new_owned`.
    ///
    /// Panics with a clear diagnostic if no icon is configured — a missing tray
    /// icon is a packaging error that must surface loudly during development.
    fn load_icon<R: Runtime>(app: &AppHandle<R>) -> tauri::image::Image<'static> {
        let source = app.default_window_icon().expect(
            "Fatal: No default window icon found. \
             Verify that bundle.icon is set in tauri.conf.json.",
        );
        tauri::image::Image::new_owned(
            source.rgba().to_vec(),
            source.width(),
            source.height(),
        )
    }

    /// Dispatches tray context menu item selection events.
    fn handle_menu_event<R: Runtime>(app: &AppHandle<R>, id: &str) {
        match id {
            "open_settings" => {
                println!("[EasyWheel Host] Info: Tray menu — 'Open Settings' selected.");
                WindowManager::show_and_focus(app);
            }
            "reload_config" => {
                println!("[EasyWheel Host] Info: Tray menu — 'Reload Configuration' selected.");
                crate::config_manager::ConfigManager::reload();
                crate::action_manager::ActionManager::rebuild();
                println!("[EasyWheel Host] Info: Configuration reloaded.");
            }
            "restart" => {
                println!("[EasyWheel Host] Info: Tray menu — 'Restart Host' selected.");
                app.restart();
            }
            "exit" => {
                println!("[EasyWheel Host] Info: Tray menu — 'Exit' selected. Terminating process.");
                app.exit(0);
            }
            _ => {}
        }
    }

    /// Dispatches tray icon mouse events.
    ///
    /// Left-click (button released): restores and focuses the main window.
    /// Right-click: handled natively by Tauri which opens the context menu.
    /// All other events (hover, double-click, drag) are intentionally ignored.
    fn handle_tray_event<R: Runtime>(app: &AppHandle<R>, event: &TrayIconEvent) {
        if let TrayIconEvent::Click {
            button,
            button_state,
            ..
        } = event
        {
            if *button == MouseButton::Left && *button_state == MouseButtonState::Up {
                println!("[EasyWheel Host] Info: Tray icon left-clicked — restoring window.");
                WindowManager::show_and_focus(app);
            }
        }
    }
}
