use std::process::Command;
use serde::Deserialize;
use crate::models::command_context::CommandContext;
use crate::providers::provider::CommandProvider;

/// Command provider for built-in Windows shell actions and utilities.
pub struct WindowsProvider;

#[derive(Debug, Clone, Deserialize)]
struct LaunchAppParams {
    path: String,
    arguments: Option<String>,
    working_directory: Option<String>,
    run_as_admin: Option<bool>,
}

#[derive(Debug, Clone, Deserialize)]
struct OpenWebsiteParams {
    url: String,
    browser: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
struct OpenPathParams {
    path: String,
}

#[derive(Debug, Clone, Deserialize)]
struct RunScriptParams {
    path: String,
    arguments: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
struct SendShortcutParams {
    keys: Vec<String>,
}

impl CommandProvider for WindowsProvider {
    fn can_execute(&self, action_id: &str) -> bool {
        self.supported_actions().contains(&action_id)
    }

    fn provider_name(&self) -> &'static str {
        "WindowsProvider"
    }

    fn supported_actions(&self) -> Vec<&'static str> {
        vec![
            // Legacy Actions
            "open_explorer",
            "calculator",
            "browser",
            "clipboard",
            "settings",
            // Parameterized Commands
            "launch_app",
            "open_website",
            "open_folder",
            "open_file",
            "run_script",
            "send_shortcut",
        ]
    }

    fn execute(&self, context: &CommandContext) -> Result<(), String> {
        println!(
            "[WindowsProvider] Info: Executing action '{}' (profile: '{}', executable: '{}')",
            context.action_id, context.current_profile, context.executable_name
        );

        match context.action_id.as_str() {
            // Legacy Actions
            "open_explorer" => {
                #[cfg(target_os = "windows")]
                {
                    Command::new("explorer.exe")
                        .spawn()
                        .map_err(|e| format!("Failed to launch explorer: {}", e))?;
                }
                Ok(())
            }
            "calculator" => {
                #[cfg(target_os = "windows")]
                {
                    Command::new("calc.exe")
                        .spawn()
                        .map_err(|e| format!("Failed to launch calculator: {}", e))?;
                }
                Ok(())
            }
            "browser" => {
                #[cfg(target_os = "windows")]
                {
                    Command::new("explorer.exe")
                        .arg("https://www.google.com")
                        .spawn()
                        .map_err(|e| format!("Failed to open browser: {}", e))?;
                }
                Ok(())
            }
            "clipboard" => {
                #[cfg(target_os = "windows")]
                {
                    Command::new("explorer.exe")
                        .arg("ms-settings:clipboard")
                        .spawn()
                        .map_err(|e| format!("Failed to open clipboard settings: {}", e))?;
                }
                Ok(())
            }
            "settings" => {
                if let Some(app) = crate::app_state::get_app_handle() {
                    crate::window_manager::WindowManager::show_and_focus(app);
                } else {
                    #[cfg(target_os = "windows")]
                    {
                        Command::new("explorer.exe")
                            .arg("ms-settings:")
                            .spawn()
                            .map_err(|e| format!("Failed to open Windows settings: {}", e))?;
                    }
                }
                Ok(())
            }

            // Parameterized Commands
            "launch_app" => {
                let params: LaunchAppParams = serde_json::from_value(context.parameters.clone())
                    .map_err(|e| format!("Invalid parameters for launch_app: {}", e))?;
                #[cfg(target_os = "windows")]
                {
                    let args = params.arguments.unwrap_or_default();
                    let working_dir = params.working_directory.unwrap_or_default();
                    let run_as_admin = params.run_as_admin.unwrap_or(false);
                    launch_app_windows(&params.path, &args, &working_dir, run_as_admin)?;
                }
                #[cfg(not(target_os = "windows"))]
                {
                    println!("[WindowsProvider] Stub: launch_app '{}'", params.path);
                }
                Ok(())
            }
            "open_website" => {
                let params: OpenWebsiteParams = serde_json::from_value(context.parameters.clone())
                    .map_err(|e| format!("Invalid parameters for open_website: {}", e))?;
                #[cfg(target_os = "windows")]
                {
                    let browser = params.browser.unwrap_or_else(|| "default".to_string());
                    open_website_windows(&params.url, &browser)?;
                }
                #[cfg(not(target_os = "windows"))]
                {
                    println!("[WindowsProvider] Stub: open_website '{}'", params.url);
                }
                Ok(())
            }
            "open_folder" | "open_file" => {
                let params: OpenPathParams = serde_json::from_value(context.parameters.clone())
                    .map_err(|e| format!("Invalid parameters for open_folder/open_file: {}", e))?;
                #[cfg(target_os = "windows")]
                {
                    open_path_windows(&params.path)?;
                }
                #[cfg(not(target_os = "windows"))]
                {
                    println!("[WindowsProvider] Stub: open_path '{}'", params.path);
                }
                Ok(())
            }
            "run_script" => {
                let params: RunScriptParams = serde_json::from_value(context.parameters.clone())
                    .map_err(|e| format!("Invalid parameters for run_script: {}", e))?;
                #[cfg(target_os = "windows")]
                {
                    let args = params.arguments.unwrap_or_default();
                    run_script_windows(&params.path, &args)?;
                }
                #[cfg(not(target_os = "windows"))]
                {
                    println!("[WindowsProvider] Stub: run_script '{}'", params.path);
                }
                Ok(())
            }
            "send_shortcut" => {
                let params: SendShortcutParams = serde_json::from_value(context.parameters.clone())
                    .map_err(|e| format!("Invalid parameters for send_shortcut: {}", e))?;
                #[cfg(target_os = "windows")]
                {
                    send_shortcut_windows(&params.keys)?;
                }
                #[cfg(not(target_os = "windows"))]
                {
                    println!("[WindowsProvider] Stub: send_shortcut '{:?}'", params.keys);
                }
                Ok(())
            }

            _ => Err(format!("Unsupported action '{}'", context.action_id)),
        }
    }
}

#[cfg(target_os = "windows")]
fn launch_app_windows(path: &str, args: &str, working_dir: &str, run_as_admin: bool) -> Result<(), String> {
    use std::os::windows::ffi::OsStrExt;
    use std::ffi::OsStr;
    use winapi::um::shellapi::ShellExecuteW;
    use winapi::um::winuser::SW_SHOWNORMAL;

    if run_as_admin {
        let verb: Vec<u16> = OsStr::new("runas").encode_wide().chain(std::iter::once(0)).collect();
        let file: Vec<u16> = OsStr::new(path).encode_wide().chain(std::iter::once(0)).collect();
        let params: Vec<u16> = OsStr::new(args).encode_wide().chain(std::iter::once(0)).collect();
        let dir: Vec<u16> = if working_dir.is_empty() {
            vec![0]
        } else {
            OsStr::new(working_dir).encode_wide().chain(std::iter::once(0)).collect()
        };

        let res = unsafe {
            ShellExecuteW(
                std::ptr::null_mut(),
                verb.as_ptr(),
                file.as_ptr(),
                if args.is_empty() { std::ptr::null() } else { params.as_ptr() },
                if working_dir.is_empty() { std::ptr::null() } else { dir.as_ptr() },
                SW_SHOWNORMAL,
            )
        };
        if (res as usize) > 32 {
            Ok(())
        } else {
            Err(format!("ShellExecuteW 'runas' failed with error code: {}", res as usize))
        }
    } else {
        let mut cmd = Command::new(path);
        if !args.is_empty() {
            for arg in args.split_whitespace() {
                cmd.arg(arg);
            }
        }
        if !working_dir.is_empty() {
            cmd.current_dir(working_dir);
        }
        cmd.spawn().map_err(|e| format!("Failed to spawn process: {}", e))?;
        Ok(())
    }
}

#[cfg(target_os = "windows")]
fn open_website_windows(url: &str, browser: &str) -> Result<(), String> {
    use std::os::windows::ffi::OsStrExt;
    use std::ffi::OsStr;
    use winapi::um::shellapi::ShellExecuteW;
    use winapi::um::winuser::SW_SHOWNORMAL;

    let browser_lower = browser.to_ascii_lowercase();
    let exe = match browser_lower.as_str() {
        "chrome" => Some("chrome.exe"),
        "edge" => Some("msedge.exe"),
        "firefox" => Some("firefox.exe"),
        _ => None,
    };

    if let Some(browser_exe) = exe {
        Command::new(browser_exe)
            .arg(url)
            .spawn()
            .map_err(|e| format!("Failed to launch browser '{}': {}", browser_exe, e))?;
    } else {
        let verb: Vec<u16> = OsStr::new("open").encode_wide().chain(std::iter::once(0)).collect();
        let file: Vec<u16> = OsStr::new(url).encode_wide().chain(std::iter::once(0)).collect();
        
        let res = unsafe {
            ShellExecuteW(
                std::ptr::null_mut(),
                verb.as_ptr(),
                file.as_ptr(),
                std::ptr::null(),
                std::ptr::null(),
                SW_SHOWNORMAL,
            )
        };
        if (res as usize) <= 32 {
            return Err(format!("ShellExecuteW failed to open website: error code {}", res as usize));
        }
    }
    Ok(())
}

#[cfg(target_os = "windows")]
fn open_path_windows(path: &str) -> Result<(), String> {
    use std::os::windows::ffi::OsStrExt;
    use std::ffi::OsStr;
    use winapi::um::shellapi::ShellExecuteW;
    use winapi::um::winuser::SW_SHOWNORMAL;

    let verb: Vec<u16> = OsStr::new("open").encode_wide().chain(std::iter::once(0)).collect();
    let file: Vec<u16> = OsStr::new(path).encode_wide().chain(std::iter::once(0)).collect();
    
    let res = unsafe {
        ShellExecuteW(
            std::ptr::null_mut(),
            verb.as_ptr(),
            file.as_ptr(),
            std::ptr::null(),
            std::ptr::null(),
            SW_SHOWNORMAL,
        )
    };
    if (res as usize) <= 32 {
        return Err(format!("ShellExecuteW failed to open path: error code {}", res as usize));
    }
    Ok(())
}

#[cfg(target_os = "windows")]
fn run_script_windows(path: &str, args: &str) -> Result<(), String> {
    use std::os::windows::ffi::OsStrExt;
    use std::ffi::OsStr;
    use winapi::um::shellapi::ShellExecuteW;
    use winapi::um::winuser::SW_SHOWNORMAL;

    let verb: Vec<u16> = OsStr::new("open").encode_wide().chain(std::iter::once(0)).collect();
    let file: Vec<u16> = OsStr::new(path).encode_wide().chain(std::iter::once(0)).collect();
    let params: Vec<u16> = OsStr::new(args).encode_wide().chain(std::iter::once(0)).collect();
    
    let res = unsafe {
        ShellExecuteW(
            std::ptr::null_mut(),
            verb.as_ptr(),
            file.as_ptr(),
            if args.is_empty() { std::ptr::null() } else { params.as_ptr() },
            std::ptr::null(),
            SW_SHOWNORMAL,
        )
    };
    if (res as usize) <= 32 {
        return Err(format!("ShellExecuteW failed to run script: error code {}", res as usize));
    }
    Ok(())
}

#[cfg(target_os = "windows")]
fn send_shortcut_windows(key_names: &[String]) -> Result<(), String> {
    use rdev::{simulate, EventType};

    let mut keys = Vec::new();
    for name in key_names {
        if let Some(key) = crate::config_manager::ConfigManager::parse_rdev_key(name) {
            keys.push(key);
        } else {
            return Err(format!("Unknown key name '{}' in shortcut.", name));
        }
    }

    for &key in &keys {
        if let Err(e) = simulate(&EventType::KeyPress(key)) {
            return Err(format!("Failed to press key {:?}: {:?}", key, e));
        }
        std::thread::sleep(std::time::Duration::from_millis(5));
    }

    for &key in keys.iter().rev() {
        if let Err(e) = simulate(&EventType::KeyRelease(key)) {
            return Err(format!("Failed to release key {:?}: {:?}", key, e));
        }
        std::thread::sleep(std::time::Duration::from_millis(5));
    }

    Ok(())
}
