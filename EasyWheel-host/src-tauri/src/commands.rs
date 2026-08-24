//! Tauri command implementations for EasyWheel Host.
//!
//! All `#[tauri::command]` functions must be defined in this module.
//! They are registered in `lib.rs` via `tauri::generate_handler![]`.
//!
//! # Command Inventory
//!
//! | Command              | Caller              | Purpose                             |
//! |----------------------|---------------------|-------------------------------------|
//! | `get_pointer_state`  | overlay (60 Hz)     | Raw cursor tracking state           |
//! | `get_geometry_state` | overlay (60 Hz)     | Derived wheel geometry              |
//! | `get_config`         | settings on mount   | Full config snapshot                |
//! | `save_config`        | settings Save btn   | Validate + persist + rebuild        |
//! | `reload_config`      | tray / settings     | Re-read config.json from disk       |
//! | `get_running_apps`   | settings new profile| Enumerate running processes         |
//! | `open_settings`      | action executor     | Show + focus the settings window    |

use serde::Serialize;

use crate::action_manager::ActionManager;
use crate::config_manager::ConfigManager;
use crate::geometry_manager::{GeometryManager, GeometryState};
use crate::input_manager::{InputManager, PointerState};
use crate::models::config::AppConfig;
use crate::window_manager::WindowManager;

// ---------------------------------------------------------------------------
// Overlay commands (Phase 3 / 4) — unchanged
// ---------------------------------------------------------------------------

/// Returns a snapshot of the current pointer tracking state.
///
/// Retained from Phase 3. The overlay frontend may call this when it needs
/// raw physical coordinates independently of the geometry pipeline.
#[tauri::command]
pub fn get_pointer_state() -> PointerState {
    InputManager::get_state()
}

/// Returns the current geometry state derived from the active pointer session.
///
/// Called by the overlay frontend at ~60 FPS via `requestAnimationFrame`.
#[tauri::command]
pub fn get_geometry_state() -> GeometryState {
    GeometryManager::compute()
}

// ---------------------------------------------------------------------------
// Settings commands (Phase 6)
// ---------------------------------------------------------------------------

/// Returns the full current `AppConfig` as a JSON-serialisable value.
///
/// Called once on Settings window mount. The frontend deserialises this into
/// its `ConfigContext` state and presents the values for editing.
#[tauri::command]
pub fn get_config() -> AppConfig {
    ConfigManager::get()
}

/// Validates `config`, persists it to disk, and rebuilds the action pipeline.
///
/// # Steps
///
/// 1. Validate the incoming config (profile uniqueness, radius invariants, etc.)
/// 2. Call `ConfigManager::update_and_save(config)` to write to disk.
/// 3. Call `ActionManager::rebuild()` so the next wheel action uses the new data.
///
/// # Errors
///
/// Returns `Err(String)` with a user-readable message on validation failure
/// or when the config directory is unavailable. The frontend surfaces this
/// message in a `ValidationMessage` component.
#[tauri::command]
pub fn save_config(config: AppConfig) -> Result<(), String> {
    // Validate before touching any state.
    validate_config(&config)?;

    // Atomically replace in-memory config and persist to disk.
    ConfigManager::update_and_save(config)?;

    // Reset the action pipeline so the next execution uses the new config.
    ActionManager::rebuild();

    Ok(())
}

/// Reloads the configuration from disk without any frontend interaction.
///
/// Called by the "Reload Configuration" tray menu item and optionally by
/// the Settings UI after detecting an external config file change.
#[tauri::command]
pub fn reload_config() -> Result<(), String> {
    ConfigManager::reload();
    ActionManager::rebuild();
    println!("[Commands] Info: Configuration reloaded on demand.");
    Ok(())
}

/// Represents a unique running process visible to the Settings UI.
///
/// Returned by `get_running_apps` for the "New Profile from Running App" flow.
/// Deduplicated by executable filename (case-insensitive) so the same app
/// launched multiple times appears only once.
#[derive(Debug, Clone, Serialize)]
pub struct RunningApp {
    /// Display name: the executable basename without the `.exe` extension.
    pub name: String,
    /// Filename of the executable (e.g. `"AfterFX.exe"`).
    pub executable: String,
    /// Full path to the executable on disk.
    pub path: String,
}

/// Returns a deduplicated, sorted list of currently running processes.
///
/// On Windows, uses `CreateToolhelp32Snapshot` + `QueryFullProcessImageNameW`
/// to enumerate process IDs and resolve full paths. Processes that cannot be
/// opened (elevated system processes) are silently skipped — this is expected
/// and safe.
///
/// Returns an empty `Vec` on non-Windows targets (no-op stub).
#[tauri::command]
pub fn get_running_apps() -> Vec<RunningApp> {
    #[cfg(target_os = "windows")]
    {
        get_running_apps_windows()
    }
    #[cfg(not(target_os = "windows"))]
    {
        vec![]
    }
}

/// Shows and focuses the Settings (main) window.
///
/// Idempotent — safe to call when the window is already visible.
/// Used by the `open_settings` action definition in the action library.
#[tauri::command]
pub fn open_settings(app: tauri::AppHandle) {
    WindowManager::show_and_focus(&app);
}

/// Opens a native dialog to pick an executable file (.exe).
#[tauri::command]
pub fn pick_executable() -> Option<String> {
    rfd::FileDialog::new()
        .add_filter("Executable", &["exe"])
        .pick_file()
        .map(|p| p.to_string_lossy().into_owned())
}

/// Opens a native dialog to pick any file.
#[tauri::command]
pub fn pick_file() -> Option<String> {
    rfd::FileDialog::new()
        .pick_file()
        .map(|p| p.to_string_lossy().into_owned())
}

/// Opens a native dialog to pick a folder.
#[tauri::command]
pub fn pick_folder() -> Option<String> {
    rfd::FileDialog::new()
        .pick_folder()
        .map(|p| p.to_string_lossy().into_owned())
}

// ---------------------------------------------------------------------------
// Private — Windows process enumeration
// ---------------------------------------------------------------------------

#[cfg(target_os = "windows")]
fn get_running_apps_windows() -> Vec<RunningApp> {
    use std::collections::HashMap;
    use std::path::Path;

    use winapi::shared::minwindef::DWORD;
    use winapi::um::handleapi::{CloseHandle, INVALID_HANDLE_VALUE};
    use winapi::um::processthreadsapi::OpenProcess;
    use winapi::um::tlhelp32::{
        CreateToolhelp32Snapshot, Process32FirstW, Process32NextW, PROCESSENTRY32W,
        TH32CS_SNAPPROCESS,
    };
    use winapi::um::winbase::QueryFullProcessImageNameW;
    use winapi::um::winnt::PROCESS_QUERY_LIMITED_INFORMATION;

    // PROCESS_NAME_WIN32 = 0: Win32 path format (not NT device path).
    const PROCESS_NAME_WIN32: DWORD = 0;

    /// System process basenames excluded from the results.
    /// These are background services that users never interact with via a wheel.
    const EXCLUDED: &[&str] = &[
        "svchost.exe",
        "runtimebroker.exe",
        "wininit.exe",
        "winlogon.exe",
        "csrss.exe",
        "smss.exe",
        "lsass.exe",
        "services.exe",
        "system",
        "registry",
        "secure system",
        "memory compression",
        "dwm.exe",
        "fontdrvhost.exe",
        "sihost.exe",
        "taskhostw.exe",
        "searchindexer.exe",
        "spoolsv.exe",
        "audiodg.exe",
        "ctfmon.exe",
        "conhost.exe",
        "cmd.exe",
        "powershell.exe",
    ];

    let mut apps: HashMap<String, RunningApp> = HashMap::new();

    let snapshot = unsafe { CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0) };
    if snapshot == INVALID_HANDLE_VALUE {
        eprintln!("[Commands] Warning: CreateToolhelp32Snapshot failed.");
        return vec![];
    }

    let mut entry = PROCESSENTRY32W {
        dwSize: std::mem::size_of::<PROCESSENTRY32W>() as u32,
        // SAFETY: All fields are numeric / pointer types; zeroed is valid.
        ..unsafe { std::mem::zeroed() }
    };

    let mut ok = unsafe { Process32FirstW(snapshot, &mut entry) };
    while ok != 0 {
        let pid = entry.th32ProcessID;

        // Open the process with minimum required privileges.
        let handle = unsafe { OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, 0, pid) };
        if !handle.is_null() {
            let mut buf = vec![0u16; 520]; // 260 wide chars × 2 bytes
            let mut size = 260u32;

            let success = unsafe {
                QueryFullProcessImageNameW(handle, PROCESS_NAME_WIN32, buf.as_mut_ptr(), &mut size)
            };
            unsafe { CloseHandle(handle) };

            if success != 0 && size > 0 {
                let full_path = String::from_utf16_lossy(&buf[..size as usize]);
                let exe_file = Path::new(&full_path)
                    .file_name()
                    .map(|n| n.to_string_lossy().into_owned())
                    .unwrap_or_default();

                let key = exe_file.to_ascii_lowercase();

                // Skip excluded system processes.
                if !key.is_empty() && !EXCLUDED.contains(&key.as_str()) {
                    let display_name = exe_file
                        .strip_suffix(".exe")
                        .or_else(|| exe_file.strip_suffix(".EXE"))
                        .unwrap_or(&exe_file)
                        .to_string();

                    apps.entry(key).or_insert_with(|| RunningApp {
                        name: display_name,
                        executable: exe_file,
                        path: full_path,
                    });
                }
            }
        }

        ok = unsafe { Process32NextW(snapshot, &mut entry) };
    }

    unsafe { CloseHandle(snapshot) };

    let mut result: Vec<RunningApp> = apps.into_values().collect();
    result.sort_by_key(|a| a.name.to_ascii_lowercase());
    result
}

// ---------------------------------------------------------------------------
// Private — Config validation
// ---------------------------------------------------------------------------

/// Validates an `AppConfig` submitted by the Settings UI before persisting.
///
/// Returns `Ok(())` on success, `Err(message)` with a user-readable
/// description of the first validation failure encountered.
fn validate_config(config: &AppConfig) -> Result<(), String> {
    let g = &config.global;

    // Wheel geometry invariants.
    if g.wheel_radius <= 0.0 {
        return Err("Wheel radius must be greater than 0.".to_string());
    }
    if g.dead_zone_radius <= 0.0 {
        return Err("Dead zone radius must be greater than 0.".to_string());
    }
    if g.wheel_radius <= g.dead_zone_radius {
        return Err(
            "Wheel radius must be greater than dead zone radius.".to_string()
        );
    }

    // Wheel opacity check.
    if g.wheel_opacity < 0.0 || g.wheel_opacity > 1.0 {
        return Err("Wheel opacity must be between 0.0 and 1.0.".to_string());
    }

    // Sector count must be at least 4 and divide 360 evenly.
    if g.sector_count < 4 {
        return Err("Sector count must be at least 4.".to_string());
    }
    if !360u32.is_multiple_of(u32::from(g.sector_count)) {
        return Err(format!(
            "Invalid sector count {}. Must evenly divide 360 (e.g. 4, 6, 8, 12, 16).",
            g.sector_count
        ));
    }

    // Validate hotkeys
    if ConfigManager::parse_rdev_key(&g.activation_modifier).is_none() {
        return Err(format!("Invalid activation modifier key '{}'.", g.activation_modifier));
    }
    if ConfigManager::parse_rdev_key(&g.activation_key).is_none() {
        return Err(format!("Invalid activation trigger key '{}'.", g.activation_key));
    }

    // Validate colors (must be hex format e.g. #RGB, #RGBA, #RRGGBB, #RRGGBBAA)
    let validate_color = |color: &str, field_name: &str| -> Result<(), String> {
        let trimmed = color.trim();
        if !trimmed.starts_with('#') {
            return Err(format!("{} '{}' must start with '#'.", field_name, color));
        }
        let len = trimmed.len();
        if len != 4 && len != 5 && len != 7 && len != 9 {
            return Err(format!("{} '{}' must be in hex format: #RGB, #RGBA, #RRGGBB, or #RRGGBBAA.", field_name, color));
        }
        if !trimmed[1..].chars().all(|c| c.is_ascii_hexdigit()) {
            return Err(format!("{} '{}' contains invalid hex characters.", field_name, color));
        }
        Ok(())
    };
    validate_color(&g.highlight_color, "Highlight color")?;
    validate_color(&g.default_color, "Default color")?;

    // Profile name uniqueness and non-emptiness.
    let mut seen_names = std::collections::HashSet::new();
    let mut seen_exes = std::collections::HashSet::new();
    for profile in &config.profiles {
        let trimmed = profile.name.trim();
        if trimmed.is_empty() {
            return Err("Profile name cannot be empty.".to_string());
        }
        if !seen_names.insert(trimmed.to_ascii_lowercase()) {
            return Err(format!("Duplicate profile name: '{}'.", profile.name));
        }

        let exe_trimmed = profile.executable.trim();
        if exe_trimmed.is_empty() {
            return Err(format!(
                "Profile '{}' has an empty executable name.",
                profile.name
            ));
        }

        // Validate duplicate executables mapping
        let parts: Vec<&str> = exe_trimmed.split(',').map(|s| s.trim()).collect();
        for part in parts {
            let part_lower = part.to_ascii_lowercase();
            if part_lower.is_empty() {
                continue;
            }
            if !seen_exes.insert(part_lower.clone()) {
                return Err(format!(
                    "Duplicate target executable '{}' is mapped in multiple profiles (found in '{}').",
                    part, profile.name
                ));
            }
        }
    }

    // Sector assignments must reference existing action IDs or be valid parameterized commands.
    let valid_ids: std::collections::HashSet<&str> = config
        .action_library
        .iter()
        .map(|a| a.id.as_str())
        .collect();

    for profile in &config.profiles {
        for (sector, cmd) in &profile.sector_assignments {
            let cmd_id = &cmd.command_id;
            let params = &cmd.parameters;

            match cmd_id.as_str() {
                "launch_app" => {
                    #[derive(serde::Deserialize)]
                    struct Temp { path: String }
                    let p: Temp = serde_json::from_value(params.clone())
                        .map_err(|e| format!("Profile '{}', sector {}: launch_app parameters are invalid: {}", profile.name, sector, e))?;
                    if p.path.trim().is_empty() {
                        return Err(format!("Profile '{}', sector {}: Executable path cannot be empty.", profile.name, sector));
                    }
                    let has_separator = p.path.contains('\\') || p.path.contains('/');
                    if has_separator {
                        let path = std::path::Path::new(&p.path);
                        if !path.exists() || !path.is_file() {
                            return Err(format!("Profile '{}', sector {}: Executable path '{}' does not exist or is not a file.", profile.name, sector, p.path));
                        }
                    }
                }
                "open_website" => {
                    #[derive(serde::Deserialize)]
                    struct Temp { url: String }
                    let p: Temp = serde_json::from_value(params.clone())
                        .map_err(|e| format!("Profile '{}', sector {}: open_website parameters are invalid: {}", profile.name, sector, e))?;
                    if p.url.trim().is_empty() {
                        return Err(format!("Profile '{}', sector {}: Website URL cannot be empty.", profile.name, sector));
                    }
                    if !p.url.starts_with("http://") && !p.url.starts_with("https://") {
                        return Err(format!("Profile '{}', sector {}: Invalid URL format '{}'. URL must start with http:// or https://.", profile.name, sector, p.url));
                    }
                }
                "open_folder" => {
                    #[derive(serde::Deserialize)]
                    struct Temp { path: String }
                    let p: Temp = serde_json::from_value(params.clone())
                        .map_err(|e| format!("Profile '{}', sector {}: open_folder parameters are invalid: {}", profile.name, sector, e))?;
                    if p.path.trim().is_empty() {
                        return Err(format!("Profile '{}', sector {}: Folder path cannot be empty.", profile.name, sector));
                    }
                    let path = std::path::Path::new(&p.path);
                    if !path.exists() || !path.is_dir() {
                        return Err(format!("Profile '{}', sector {}: Folder path '{}' does not exist or is not a directory.", profile.name, sector, p.path));
                    }
                }
                "open_file" => {
                    #[derive(serde::Deserialize)]
                    struct Temp { path: String }
                    let p: Temp = serde_json::from_value(params.clone())
                        .map_err(|e| format!("Profile '{}', sector {}: open_file parameters are invalid: {}", profile.name, sector, e))?;
                    if p.path.trim().is_empty() {
                        return Err(format!("Profile '{}', sector {}: File path cannot be empty.", profile.name, sector));
                    }
                    let path = std::path::Path::new(&p.path);
                    if !path.exists() || !path.is_file() {
                        return Err(format!("Profile '{}', sector {}: File path '{}' does not exist or is not a file.", profile.name, sector, p.path));
                    }
                }
                "run_script" => {
                    #[derive(serde::Deserialize)]
                    struct Temp { path: String }
                    let p: Temp = serde_json::from_value(params.clone())
                        .map_err(|e| format!("Profile '{}', sector {}: run_script parameters are invalid: {}", profile.name, sector, e))?;
                    if p.path.trim().is_empty() {
                        return Err(format!("Profile '{}', sector {}: Script path cannot be empty.", profile.name, sector));
                    }
                    let path = std::path::Path::new(&p.path);
                    if !path.exists() || !path.is_file() {
                        return Err(format!("Profile '{}', sector {}: Script file path '{}' does not exist or is not a file.", profile.name, sector, p.path));
                    }
                }
                "send_shortcut" => {
                    #[derive(serde::Deserialize)]
                    struct Temp { keys: Vec<String> }
                    let p: Temp = serde_json::from_value(params.clone())
                        .map_err(|e| format!("Profile '{}', sector {}: send_shortcut parameters are invalid: {}", profile.name, sector, e))?;
                    if p.keys.is_empty() {
                        return Err(format!("Profile '{}', sector {}: Keyboard shortcut keys cannot be empty.", profile.name, sector));
                    }
                    for key in &p.keys {
                        if crate::config_manager::ConfigManager::parse_rdev_key(key).is_none() {
                            return Err(format!("Profile '{}', sector {}: Keyboard shortcut contains invalid key '{}'.", profile.name, sector, key));
                        }
                    }
                }
                "after_effects_command" => {
                    #[derive(serde::Deserialize)]
                    struct Temp { command: String }
                    let p: Temp = serde_json::from_value(params.clone())
                        .map_err(|e| format!("Profile '{}', sector {}: after_effects_command parameters are invalid: {}", profile.name, sector, e))?;
                    if p.command.trim().is_empty() {
                        return Err(format!("Profile '{}', sector {}: After Effects command selection cannot be empty.", profile.name, sector));
                    }
                }
                "photoshop_command" => {
                    #[derive(serde::Deserialize)]
                    struct Temp { command: String }
                    let p: Temp = serde_json::from_value(params.clone())
                        .map_err(|e| format!("Profile '{}', sector {}: photoshop_command parameters are invalid: {}", profile.name, sector, e))?;
                    if p.command.trim().is_empty() {
                        return Err(format!("Profile '{}', sector {}: Photoshop command selection cannot be empty.", profile.name, sector));
                    }
                }
                _ => {
                    let is_ae_command = profile.name == "Adobe After Effects" && crate::command_registry::has_command(cmd_id);
                    if !is_ae_command && !valid_ids.contains(cmd_id.as_str()) {
                        return Err(format!(
                            "Profile '{}', sector {}: References unknown action/command ID '{}'.",
                            profile.name, sector, cmd_id
                        ));
                    }
                }
            }
        }
    }

    Ok(())
}

/// Returns the cached After Effects command registry.
#[tauri::command]
pub fn get_command_registry() -> Result<Vec<crate::command_registry::AECommand>, String> {
    Ok(crate::command_registry::get_commands().clone())
}

/// Extracts the native Windows application icon from an executable/file path
/// using a deterministic cache in `%APPDATA%\EasyWheelAE\icons\`.
#[tauri::command]
pub fn get_app_icon(path: String) -> Result<String, String> {
    #[cfg(target_os = "windows")]
    {
        get_cached_or_extracted_icon(&path).ok_or_else(|| format!("Could not extract icon for path: {}", path))
    }
    #[cfg(not(target_os = "windows"))]
    {
        Err("Icon extraction is only supported on Windows".to_string())
    }
}

#[cfg(target_os = "windows")]
fn get_cached_or_extracted_icon(path: &str) -> Option<String> {
    if path.trim().is_empty() {
        return None;
    }

    let norm_path = path.trim().to_lowercase().replace('\\', "/");

    // Simple 64-bit FNV-1a hash for deterministic filenames
    let mut hash: u64 = 0xcbf29ce484222325;
    for byte in norm_path.bytes() {
        hash ^= u64::from(byte);
        hash = hash.wrapping_mul(0x100000001b3);
    }
    let hash_str = format!("{:016x}", hash);

    let cache_dir = dirs::data_dir().map(|mut p| {
        p.push("EasyWheelAE");
        p.push("icons");
        p
    });

    if let Some(dir) = &cache_dir {
        let cache_file = dir.join(format!("{}.txt", hash_str));
        if cache_file.exists() {
            if let Ok(cached_data) = std::fs::read_to_string(&cache_file) {
                if !cached_data.trim().is_empty() {
                    return Some(cached_data);
                }
            }
        }
    }

    // Extraction on cache miss
    let extracted = extract_windows_icon(path)?;

    if let Some(dir) = cache_dir {
        let _ = std::fs::create_dir_all(&dir);
        let cache_file = dir.join(format!("{}.txt", hash_str));
        let _ = std::fs::write(cache_file, &extracted);
    }

    Some(extracted)
}

#[cfg(target_os = "windows")]
fn extract_windows_icon(path: &str) -> Option<String> {
    use std::ffi::OsStr;
    use std::os::windows::ffi::OsStrExt;
    use winapi::shared::minwindef::DWORD;
    use winapi::um::shellapi::{SHGetFileInfoW, SHFILEINFOW, SHGFI_ICON, SHGFI_LARGEICON};
    use winapi::um::winuser::{DestroyIcon, GetIconInfo, ICONINFO};
    use winapi::um::wingdi::{
        CreateCompatibleDC, DeleteDC, DeleteObject, GetDIBits, GetObjectW,
        BITMAP, BITMAPINFOHEADER, BI_RGB, DIB_RGB_COLORS,
    };
    use winapi::um::processenv::ExpandEnvironmentStringsW;

    if path.trim().is_empty() {
        return None;
    }

    let path_os = OsStr::new(path);
    let path_w: Vec<u16> = path_os.encode_wide().chain(std::iter::once(0)).collect();

    let mut expanded_w = vec![0u16; 2048];
    let len = unsafe {
        ExpandEnvironmentStringsW(path_w.as_ptr(), expanded_w.as_mut_ptr(), expanded_w.len() as DWORD)
    };
    let target_w = if len > 0 && (len as usize) <= expanded_w.len() {
        &expanded_w[..len as usize - 1]
    } else {
        &path_w[..path_w.len() - 1]
    };
    let target_w_null: Vec<u16> = target_w.iter().copied().chain(std::iter::once(0)).collect();

    let mut shfi: SHFILEINFOW = unsafe { std::mem::zeroed() };
    let res = unsafe {
        SHGetFileInfoW(
            target_w_null.as_ptr(),
            0,
            &mut shfi,
            std::mem::size_of::<SHFILEINFOW>() as u32,
            SHGFI_ICON | SHGFI_LARGEICON,
        )
    };

    if res == 0 || shfi.hIcon.is_null() {
        return None;
    }
    let hicon = shfi.hIcon;

    let mut icon_info: ICONINFO = unsafe { std::mem::zeroed() };
    if unsafe { GetIconInfo(hicon, &mut icon_info) } == 0 {
        unsafe { DestroyIcon(hicon); }
        return None;
    }

    let hbm_color = icon_info.hbmColor;
    let hbm_mask = icon_info.hbmMask;

    if hbm_color.is_null() {
        unsafe {
            if !hbm_mask.is_null() { DeleteObject(hbm_mask as _); }
            DestroyIcon(hicon);
        }
        return None;
    }

    let mut bmp: BITMAP = unsafe { std::mem::zeroed() };
    unsafe {
        GetObjectW(hbm_color as _, std::mem::size_of::<BITMAP>() as i32, &mut bmp as *mut _ as _);
    }

    let width = bmp.bmWidth;
    let height = bmp.bmHeight;

    if width <= 0 || height <= 0 {
        unsafe {
            DeleteObject(hbm_color as _);
            if !hbm_mask.is_null() { DeleteObject(hbm_mask as _); }
            DestroyIcon(hicon);
        }
        return None;
    }

    let hdc = unsafe { CreateCompatibleDC(std::ptr::null_mut()) };
    let mut bmi = BITMAPINFOHEADER {
        biSize: std::mem::size_of::<BITMAPINFOHEADER>() as u32,
        biWidth: width,
        biHeight: -height, // top-down
        biPlanes: 1,
        biBitCount: 32,
        biCompression: BI_RGB,
        biSizeImage: 0,
        biXPelsPerMeter: 0,
        biYPelsPerMeter: 0,
        biClrUsed: 0,
        biClrImportant: 0,
    };

    let mut pixels = vec![0u8; (width * height * 4) as usize];
    let read_res = unsafe {
        GetDIBits(
            hdc,
            hbm_color as _,
            0,
            height as u32,
            pixels.as_mut_ptr() as _,
            &mut bmi as *mut _ as _,
            DIB_RGB_COLORS,
        )
    };

    unsafe {
        DeleteDC(hdc);
        DeleteObject(hbm_color as _);
        if !hbm_mask.is_null() { DeleteObject(hbm_mask as _); }
        DestroyIcon(hicon);
    }

    if read_res == 0 {
        return None;
    }

    // Fix up alpha channel if Windows icon returned 0 in alpha byte for 32-bit icon
    let has_alpha = pixels.chunks_exact(4).any(|p| p[3] != 0);
    if !has_alpha {
        for p in pixels.chunks_exact_mut(4) {
            p[3] = 255;
        }
    }

    let bmp_data = build_32bit_bmp(width as u32, height as u32, &pixels);
    let b64 = base64_encode(&bmp_data);
    Some(format!("data:image/bmp;base64,{}", b64))
}

#[cfg(target_os = "windows")]
fn build_32bit_bmp(width: u32, height: u32, pixels_bgra: &[u8]) -> Vec<u8> {
    let file_header_size = 14u32;
    let v5_header_size = 108u32;
    let offset_bits = file_header_size + v5_header_size;
    let image_size = (width * height * 4) as u32;
    let file_size = offset_bits + image_size;

    let mut out = Vec::with_capacity(file_size as usize);

    // BITMAPFILEHEADER
    out.extend_from_slice(b"BM");
    out.extend_from_slice(&file_size.to_le_bytes());
    out.extend_from_slice(&0u16.to_le_bytes());
    out.extend_from_slice(&0u16.to_le_bytes());
    out.extend_from_slice(&offset_bits.to_le_bytes());

    // BITMAPV5HEADER (108 bytes)
    out.extend_from_slice(&v5_header_size.to_le_bytes());
    out.extend_from_slice(&(width as i32).to_le_bytes());
    out.extend_from_slice(&(-(height as i32)).to_le_bytes()); // top-down
    out.extend_from_slice(&1u16.to_le_bytes());               // planes
    out.extend_from_slice(&32u16.to_le_bytes());              // bit count
    out.extend_from_slice(&3u32.to_le_bytes());               // BI_BITFIELDS
    out.extend_from_slice(&image_size.to_le_bytes());
    out.extend_from_slice(&0i32.to_le_bytes());
    out.extend_from_slice(&0i32.to_le_bytes());
    out.extend_from_slice(&0u32.to_le_bytes());
    out.extend_from_slice(&0u32.to_le_bytes());
    // Channel masks
    out.extend_from_slice(&0x00FF0000u32.to_le_bytes());      // Red mask
    out.extend_from_slice(&0x0000FF00u32.to_le_bytes());      // Green mask
    out.extend_from_slice(&0x000000FFu32.to_le_bytes());      // Blue mask
    out.extend_from_slice(&0xFF000000u32.to_le_bytes());      // Alpha mask
    out.extend_from_slice(b"sRGB");                           // CSType
    out.extend_from_slice(&[0u8; 36]);                        // Endpoints
    out.extend_from_slice(&0u32.to_le_bytes());               // Gamma Red
    out.extend_from_slice(&0u32.to_le_bytes());               // Gamma Green
    out.extend_from_slice(&0u32.to_le_bytes());               // Gamma Blue
    out.extend_from_slice(&4u32.to_le_bytes());               // Intent (LCS_GM_IMAGES)
    out.extend_from_slice(&[0u8; 12]);                        // Profile padding

    // Pixel data (BGRA)
    out.extend_from_slice(pixels_bgra);
    out
}

fn base64_encode(data: &[u8]) -> String {
    const CHARSET: &[u8; 64] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut result = String::with_capacity((data.len() + 2) / 3 * 4);

    for chunk in data.chunks(3) {
        let b0 = chunk[0] as u32;
        let b1 = if chunk.len() > 1 { chunk[1] as u32 } else { 0 };
        let b2 = if chunk.len() > 2 { chunk[2] as u32 } else { 0 };
        let triplet = (b0 << 16) | (b1 << 8) | b2;

        result.push(CHARSET[((triplet >> 18) & 0x3F) as usize] as char);
        result.push(CHARSET[((triplet >> 12) & 0x3F) as usize] as char);
        if chunk.len() > 1 {
            result.push(CHARSET[((triplet >> 6) & 0x3F) as usize] as char);
        } else {
            result.push('=');
        }
        if chunk.len() > 2 {
            result.push(CHARSET[(triplet & 0x3F) as usize] as char);
        } else {
            result.push('=');
        }
    }
    result
}

