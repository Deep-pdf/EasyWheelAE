use std::ffi::OsString;
use std::os::windows::ffi::OsStringExt;
use winapi::shared::windef::HWND;
use winapi::um::winuser::{
    EnumWindows, GetClassNameW, GetForegroundWindow, GetWindowThreadProcessId,
    IsWindowVisible, SetForegroundWindow, ShowWindow, SW_RESTORE,
};
use winapi::um::handleapi::CloseHandle;
use winapi::um::processthreadsapi::OpenProcess;
use winapi::um::winbase::QueryFullProcessImageNameW;
use winapi::um::winnt::PROCESS_QUERY_LIMITED_INFORMATION;
use std::process::Command;

use uiautomation::{UIAutomation, UIElement, types::ControlType, patterns::{SelectionItemPattern, ValuePattern}};

#[derive(Clone)]
pub struct BrowserTab {
    pub window_handle: usize,
    pub browser: String,
    pub title: String,
    pub url: String,
    pub domain: String,
    pub tab_index: usize,
    pub is_active: bool,
    pub is_focused_window: bool,
    pub element: UIElement,
}

pub trait BrowserProvider: Send + Sync {
    fn browser_name(&self) -> &'static str;
    fn process_name(&self) -> &'static str;
    fn window_class_name(&self) -> &'static str;

    fn find_matching_tabs(&self, target_host: &str) -> Result<Vec<BrowserTab>, String>;
    fn activate_tab(&self, tab: &BrowserTab) -> Result<(), String>;
    fn open_url(&self, url: &str) -> Result<(), String>;
}

// -------------------------------------------------------------------------
// Win32 EnumWindows Helper
// -------------------------------------------------------------------------

struct EnumState {
    process_name: String,
    class_name: String,
    hwnds: Vec<HWND>,
}

unsafe extern "system" fn enum_windows_callback(hwnd: HWND, lparam: winapi::shared::minwindef::LPARAM) -> winapi::shared::minwindef::BOOL {
    let state = &mut *(lparam as *mut EnumState);

    if IsWindowVisible(hwnd) != 0 {
        let mut class_buf = vec![0u16; 256];
        let len = GetClassNameW(hwnd, class_buf.as_mut_ptr(), class_buf.len() as i32);
        if len > 0 {
            let class_str = String::from_utf16_lossy(&class_buf[..len as usize]);
            if class_str == state.class_name {
                let mut pid = 0;
                GetWindowThreadProcessId(hwnd, &mut pid);
                if pid != 0 {
                    if let Some(proc_name) = get_process_name(pid) {
                        if proc_name.to_ascii_lowercase() == state.process_name.to_ascii_lowercase() {
                            state.hwnds.push(hwnd);
                        }
                    }
                }
            }
        }
    }
    1
}

fn get_process_name(pid: u32) -> Option<String> {
    unsafe {
        let handle = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, 0, pid);
        if handle.is_null() {
            return None;
        }
        let mut buf = vec![0u16; 260];
        let mut size = buf.len() as u32;
        let ok = QueryFullProcessImageNameW(handle, 0, buf.as_mut_ptr(), &mut size);
        CloseHandle(handle);

        if ok != 0 {
            let path_str = String::from_utf16_lossy(&buf[..size as usize]);
            if let Some(filename) = std::path::Path::new(&path_str).file_name() {
                return Some(filename.to_string_lossy().into_owned());
            }
        }
        None
    }
}

fn get_browser_windows(process_name: &str, class_name: &str) -> Vec<HWND> {
    let mut state = EnumState {
        process_name: process_name.to_string(),
        class_name: class_name.to_string(),
        hwnds: Vec::new(),
    };
    unsafe {
        EnumWindows(Some(enum_windows_callback), &mut state as *mut EnumState as _);
    }
    state.hwnds
}

// -------------------------------------------------------------------------
// General Tab Search Implementation
// -------------------------------------------------------------------------

fn find_active_tab_url(win_element: &UIElement) -> Option<String> {
    let edit_matcher = win_element.create_matcher().control_type(ControlType::Edit);
    let edits = edit_matcher.find_all().unwrap_or_default();

    for edit in &edits {
        if let Ok(auto_id) = edit.get_automation_id() {
            if auto_id == "address_sec" || auto_id == "urlbar" {
                if let Ok(val_pattern) = edit.get_pattern::<ValuePattern>() {
                    if let Ok(val) = val_pattern.get_value() {
                        let trimmed = val.trim();
                        if !trimmed.is_empty() {
                            return Some(trimmed.to_string());
                        }
                    }
                }
            }
        }
    }

    for edit in &edits {
        if let Ok(val_pattern) = edit.get_pattern::<ValuePattern>() {
            if let Ok(val) = val_pattern.get_value() {
                let trimmed = val.trim();
                if trimmed.contains("://") || (trimmed.contains('.') && !trimmed.contains(' ') && trimmed.len() > 3) {
                    return Some(trimmed.to_string());
                }
            }
        }
    }

    for edit in &edits {
        if let Ok(val_pattern) = edit.get_pattern::<ValuePattern>() {
            if let Ok(val) = val_pattern.get_value() {
                let trimmed = val.trim();
                if !trimmed.is_empty() {
                    return Some(trimmed.to_string());
                }
            }
        }
    }

    None
}

fn extract_host(url: &str) -> &str {
    let mut s = url;
    if s.starts_with("http://") {
        s = &s[7..];
    } else if s.starts_with("https://") {
        s = &s[8..];
    }
    if let Some(pos) = s.find('/') {
        s = &s[..pos];
    }
    if let Some(pos) = s.find(':') {
        s = &s[..pos];
    }
    s
}

fn host_matches(host1: &str, host2: &str) -> bool {
    let h1 = host1.to_ascii_lowercase();
    let h2 = host2.to_ascii_lowercase();
    h1 == h2 || h1.ends_with(&format!(".{}", h2)) || h2.ends_with(&format!(".{}", h1))
}

fn matches_target(tab_url: &str, tab_title: &str, target_host: &str) -> bool {
    if !tab_url.is_empty() {
        let extracted = extract_host(tab_url);
        return host_matches(extracted, target_host);
    }
    let clean_target = target_host.replace("www.", "");
    let base_name = clean_target.split('.').next().unwrap_or(&clean_target);
    if base_name.len() < 3 {
        tab_title.to_lowercase().contains(&clean_target.to_lowercase())
    } else {
        tab_title.to_lowercase().contains(&base_name.to_lowercase())
    }
}

fn find_tabs_in_browser(
    provider: &dyn BrowserProvider,
    target_host: &str,
) -> Result<Vec<BrowserTab>, String> {
    let hwnds = get_browser_windows(provider.process_name(), provider.window_class_name());
    let focused_hwnd = unsafe { GetForegroundWindow() };

    let automation = UIAutomation::new().map_err(|e| format!("Failed to initialize UIA: {}", e))?;
    let mut all_tabs = Vec::new();

    for hwnd in hwnds {
        let win_element = match automation.element_from_handle(hwnd as _) {
            Ok(el) => el,
            Err(_) => continue,
        };

        let tab_matcher = win_element.create_matcher().control_type(ControlType::TabItem);
        let tab_elements = tab_matcher.find_all().unwrap_or_default();
        let is_focused_window = hwnd == focused_hwnd;
        let active_url = find_active_tab_url(&win_element);

        for (idx, tab_elem) in tab_elements.into_iter().enumerate() {
            let title = tab_elem.get_name().unwrap_or_default();
            let is_active = if let Ok(pattern) = tab_elem.get_pattern::<SelectionItemPattern>() {
                pattern.is_selected().unwrap_or(false)
            } else {
                false
            };

            let url = if is_active {
                active_url.clone().unwrap_or_default()
            } else {
                String::new()
            };

            let domain = if !url.is_empty() {
                extract_host(&url).to_string()
            } else {
                String::new()
            };

            if matches_target(&url, &title, target_host) {
                all_tabs.push(BrowserTab {
                    window_handle: hwnd as usize,
                    browser: provider.browser_name().to_string(),
                    title,
                    url,
                    domain,
                    tab_index: idx,
                    is_active,
                    is_focused_window,
                    element: tab_elem,
                });
            }
        }
    }

    Ok(all_tabs)
}

fn generic_activate_tab(tab: &BrowserTab) -> Result<(), String> {
    if let Ok(pattern) = tab.element.get_pattern::<SelectionItemPattern>() {
        pattern.select().map_err(|e| format!("Failed to select tab item: {}", e))?;
    } else {
        return Err("Tab element does not support SelectionItem pattern".to_string());
    }

    unsafe {
        let hwnd = tab.window_handle as HWND;
        ShowWindow(hwnd, SW_RESTORE);
        SetForegroundWindow(hwnd);
    }
    Ok(())
}

fn generic_open_url(exe_name: &str, url: &str) -> Result<(), String> {
    Command::new(exe_name)
        .arg(url)
        .spawn()
        .map_err(|e| format!("Failed to launch browser '{}': {}", exe_name, e))?;
    Ok(())
}

// -------------------------------------------------------------------------
// Browser Providers Implementation
// -------------------------------------------------------------------------

pub struct ChromeProvider;
impl BrowserProvider for ChromeProvider {
    fn browser_name(&self) -> &'static str { "Google Chrome" }
    fn process_name(&self) -> &'static str { "chrome.exe" }
    fn window_class_name(&self) -> &'static str { "Chrome_WidgetWin_1" }

    fn find_matching_tabs(&self, target_host: &str) -> Result<Vec<BrowserTab>, String> {
        find_tabs_in_browser(self, target_host)
    }

    fn activate_tab(&self, tab: &BrowserTab) -> Result<(), String> {
        generic_activate_tab(tab)
    }

    fn open_url(&self, url: &str) -> Result<(), String> {
        generic_open_url("chrome.exe", url)
    }
}

pub struct EdgeProvider;
impl BrowserProvider for EdgeProvider {
    fn browser_name(&self) -> &'static str { "Microsoft Edge" }
    fn process_name(&self) -> &'static str { "msedge.exe" }
    fn window_class_name(&self) -> &'static str { "Chrome_WidgetWin_1" }

    fn find_matching_tabs(&self, target_host: &str) -> Result<Vec<BrowserTab>, String> {
        find_tabs_in_browser(self, target_host)
    }

    fn activate_tab(&self, tab: &BrowserTab) -> Result<(), String> {
        generic_activate_tab(tab)
    }

    fn open_url(&self, url: &str) -> Result<(), String> {
        generic_open_url("msedge.exe", url)
    }
}

pub struct BraveProvider;
impl BrowserProvider for BraveProvider {
    fn browser_name(&self) -> &'static str { "Brave" }
    fn process_name(&self) -> &'static str { "brave.exe" }
    fn window_class_name(&self) -> &'static str { "Chrome_WidgetWin_1" }

    fn find_matching_tabs(&self, target_host: &str) -> Result<Vec<BrowserTab>, String> {
        find_tabs_in_browser(self, target_host)
    }

    fn activate_tab(&self, tab: &BrowserTab) -> Result<(), String> {
        generic_activate_tab(tab)
    }

    fn open_url(&self, url: &str) -> Result<(), String> {
        generic_open_url("brave.exe", url)
    }
}

pub struct FirefoxProvider;
impl BrowserProvider for FirefoxProvider {
    fn browser_name(&self) -> &'static str { "Firefox" }
    fn process_name(&self) -> &'static str { "firefox.exe" }
    fn window_class_name(&self) -> &'static str { "MozillaWindowClass" }

    fn find_matching_tabs(&self, target_host: &str) -> Result<Vec<BrowserTab>, String> {
        find_tabs_in_browser(self, target_host)
    }

    fn activate_tab(&self, tab: &BrowserTab) -> Result<(), String> {
        generic_activate_tab(tab)
    }

    fn open_url(&self, url: &str) -> Result<(), String> {
        generic_open_url("firefox.exe", url)
    }
}

pub fn get_providers() -> Vec<Box<dyn BrowserProvider>> {
    vec![
        Box::new(ChromeProvider),
        Box::new(EdgeProvider),
        Box::new(BraveProvider),
        Box::new(FirefoxProvider),
    ]
}
