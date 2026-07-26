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
use std::sync::{Mutex, OnceLock};
use std::time::Instant;

use uiautomation::{UIAutomation, UIElement, controls::ControlType, patterns::{UISelectionItemPattern, UIValuePattern}};

#[derive(Clone)]
pub struct CachedTab {
    pub window_handle: usize,
    pub browser: String,
    pub title: String,
    pub url: String,
    pub domain: String,
    pub tab_index: usize,
    pub is_active: bool,
    pub is_focused_window: bool,
}

pub trait BrowserProvider: Send + Sync {
    fn browser_name(&self) -> &'static str;
    fn process_name(&self) -> &'static str;
    fn window_class_name(&self) -> &'static str;

    fn find_matching_tabs(&self, target_host: &str) -> Result<Vec<CachedTab>, String>;
    fn activate_tab(&self, tab: &CachedTab) -> Result<(), String>;
    fn open_url(&self, url: &str) -> Result<(), String>;
}

// -------------------------------------------------------------------------
// Tab Cache System
// -------------------------------------------------------------------------

struct TabCache {
    tabs: Vec<CachedTab>,
    last_updated: Option<Instant>,
    is_scanning: std::sync::Arc<std::sync::atomic::AtomicBool>,
}

impl TabCache {
    fn new() -> Self {
        Self {
            tabs: Vec::new(),
            last_updated: None,
            is_scanning: std::sync::Arc::new(std::sync::atomic::AtomicBool::new(false)),
        }
    }
}

static CACHE: OnceLock<Mutex<TabCache>> = OnceLock::new();

fn get_cache() -> &'static Mutex<TabCache> {
    CACHE.get_or_init(|| Mutex::new(TabCache::new()))
}

pub struct BrowserTabCache;

impl BrowserTabCache {
    /// Starts an asynchronous background scan to refresh the cached browser tabs.
    pub fn start_background_scan() {
        let cache_mutex = get_cache();
        let is_scanning = {
            let guard = cache_mutex.lock().unwrap();
            guard.is_scanning.clone()
        };

        if is_scanning.compare_exchange(false, true, std::sync::atomic::Ordering::SeqCst, std::sync::atomic::Ordering::SeqCst).is_err() {
            // Scan is already in progress
            return;
        }

        std::thread::spawn(move || {
            let providers = get_providers();
            let mut all_tabs = Vec::new();

            for provider in &providers {
                match provider.find_matching_tabs("") {
                    Ok(tabs) => {
                        all_tabs.extend(tabs);
                    }
                    Err(e) => {
                        // Suppress verbose error spam, but log key failures
                        eprintln!("[BrowserTabCache] Error: Failed scanning tabs for {}: {}", provider.browser_name(), e);
                    }
                }
            }

            let mut guard = get_cache().lock().unwrap();
            guard.tabs = all_tabs;
            guard.last_updated = Some(Instant::now());
            guard.is_scanning.store(false, std::sync::atomic::Ordering::SeqCst);
        });
    }

    /// Queries the cache for a matching tab, falling back to a synchronous scan if the cache is empty.
    pub fn get_matching_tab(configured_url: &str, browser_filter: &str) -> Option<CachedTab> {
        let target_host = extract_host(configured_url);
        if target_host.is_empty() {
            return None;
        }

        let mut guard = get_cache().lock().unwrap();

        // Fallback: if the cache was never updated, populate it synchronously
        if guard.last_updated.is_none() {
            drop(guard); // drop to avoid deadlock
            
            let providers = get_providers();
            let mut all_tabs = Vec::new();
            for provider in &providers {
                if let Ok(tabs) = provider.find_matching_tabs("") {
                    all_tabs.extend(tabs);
                }
            }
            
            let mut new_guard = get_cache().lock().unwrap();
            new_guard.tabs = all_tabs;
            new_guard.last_updated = Some(Instant::now());
            guard = new_guard;
        }

        let browser_lower = browser_filter.to_ascii_lowercase();
        let mut matching_tabs: Vec<CachedTab> = guard.tabs.iter()
            .filter(|tab| {
                let matches_browser = match browser_lower.as_str() {
                    "chrome" => tab.browser == "Google Chrome",
                    "edge" => tab.browser == "Microsoft Edge",
                    "brave" => tab.browser == "Brave",
                    "opera" => tab.browser == "Opera",
                    "firefox" => tab.browser == "Firefox",
                    _ => true,
                };

                if !matches_browser {
                    return false;
                }

                matches_target(&tab.url, &tab.title, target_host)
            })
            .cloned()
            .collect();

        if matching_tabs.is_empty() {
            return None;
        }

        // Prioritization order:
        // 1. Most Recently Used (focused browser window + active tab)
        // 2. Focused browser window
        // 3. Left-most tab (smaller tab index)
        // 4. First discovered (original list order)
        matching_tabs.sort_by(|a, b| {
            let a_mru = a.is_focused_window && a.is_active;
            let b_mru = b.is_focused_window && b.is_active;
            if a_mru != b_mru {
                return b_mru.cmp(&a_mru);
            }
            if a.is_focused_window != b.is_focused_window {
                return b.is_focused_window.cmp(&a.is_focused_window);
            }
            if a.is_active != b.is_active {
                return b.is_active.cmp(&a.is_active);
            }
            if a.tab_index != b.tab_index {
                return a.tab_index.cmp(&b.tab_index);
            }
            std::cmp::Ordering::Equal
        });

        Some(matching_tabs[0].clone())
    }
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

fn find_active_tab_url(automation: &UIAutomation, win_element: &UIElement) -> Option<String> {
    let edit_matcher = automation.create_matcher().from(win_element.clone()).control_type(ControlType::Edit);
    let edits = edit_matcher.find_all().unwrap_or_default();

    for edit in &edits {
        if let Ok(auto_id) = edit.get_automation_id() {
            if auto_id == "address_sec" || auto_id == "urlbar" {
                if let Ok(val_pattern) = edit.get_pattern::<UIValuePattern>() {
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
        if let Ok(val_pattern) = edit.get_pattern::<UIValuePattern>() {
            if let Ok(val) = val_pattern.get_value() {
                let trimmed = val.trim();
                if trimmed.contains("://") || (trimmed.contains('.') && !trimmed.contains(' ') && trimmed.len() > 3) {
                    return Some(trimmed.to_string());
                }
            }
        }
    }

    for edit in &edits {
        if let Ok(val_pattern) = edit.get_pattern::<UIValuePattern>() {
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

pub(crate) fn extract_host(url: &str) -> &str {
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

fn strip_common(s: &str) -> &str {
    let mut res = s;
    if res.starts_with("www.") {
        res = &res[4..];
    }
    if res.starts_with("m.") {
        res = &res[2..];
    }
    res
}

fn domains_match(configured_host: &str, tab_host: &str) -> bool {
    let conf = configured_host.trim().to_lowercase();
    let tab = tab_host.trim().to_lowercase();

    let conf_clean = strip_common(&conf);
    let tab_clean = strip_common(&tab);

    if conf_clean == tab_clean {
        return true;
    }

    if tab_clean.ends_with(&format!(".{}", conf_clean)) {
        return true;
    }
    if conf_clean.ends_with(&format!(".{}", tab_clean)) {
        return true;
    }

    false
}

fn matches_target(tab_url: &str, tab_title: &str, target_host: &str) -> bool {
    if target_host.is_empty() {
        return true;
    }
    if !tab_url.is_empty() {
        let extracted = extract_host(tab_url);
        return domains_match(target_host, extracted);
    }
    
    let mut clean_target = target_host.to_lowercase();
    if clean_target.starts_with("www.") {
        clean_target = clean_target[4..].to_string();
    }
    if clean_target.starts_with("m.") {
        clean_target = clean_target[2..].to_string();
    }
    
    let base_name = clean_target.split('.').next().unwrap_or(&clean_target);
    if base_name.len() < 3 {
        tab_title.to_lowercase().contains(&clean_target)
    } else {
        tab_title.to_lowercase().contains(base_name)
    }
}

fn find_tabs_in_browser(
    provider: &dyn BrowserProvider,
    target_host: &str,
) -> Result<Vec<CachedTab>, String> {
    let hwnds = get_browser_windows(provider.process_name(), provider.window_class_name());
    let focused_hwnd = unsafe { GetForegroundWindow() };

    let automation = UIAutomation::new().map_err(|e| format!("Failed to initialize UIA: {}", e))?;
    let mut all_tabs = Vec::new();

    for hwnd in hwnds {
        let win_element = match automation.element_from_handle(uiautomation::types::Handle::from(hwnd as isize as i64)) {
            Ok(el) => el,
            Err(_) => continue,
        };

        let tab_matcher = automation.create_matcher().from(win_element.clone()).control_type(ControlType::TabItem);
        let tab_elements = tab_matcher.find_all().unwrap_or_default();
        let is_focused_window = hwnd == focused_hwnd;
        let active_url = find_active_tab_url(&automation, &win_element);

        for (idx, tab_elem) in tab_elements.into_iter().enumerate() {
            let title = tab_elem.get_name().unwrap_or_default();
            let is_active = if let Ok(pattern) = tab_elem.get_pattern::<UISelectionItemPattern>() {
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
                all_tabs.push(CachedTab {
                    window_handle: hwnd as usize,
                    browser: provider.browser_name().to_string(),
                    title,
                    url,
                    domain,
                    tab_index: idx,
                    is_active,
                    is_focused_window,
                });
            }
        }
    }

    Ok(all_tabs)
}

fn generic_activate_tab(tab: &CachedTab) -> Result<(), String> {
    unsafe {
        let hwnd = tab.window_handle as HWND;
        ShowWindow(hwnd, SW_RESTORE);
        SetForegroundWindow(hwnd);
    }

    let automation = UIAutomation::new().map_err(|e| format!("Failed to initialize UIA: {}", e))?;
    let hwnd = tab.window_handle as HWND;
    let win_element = automation.element_from_handle(uiautomation::types::Handle::from(hwnd as isize as i64))
        .map_err(|e| format!("Failed to get window element: {}", e))?;

    let tab_matcher = automation.create_matcher().from(win_element).control_type(ControlType::TabItem);
    let tab_elements = tab_matcher.find_all().unwrap_or_default();

    if tab.tab_index < tab_elements.len() {
        let tab_elem = &tab_elements[tab.tab_index];
        if let Ok(pattern) = tab_elem.get_pattern::<UISelectionItemPattern>() {
            pattern.select().map_err(|e| format!("Failed to select tab item: {}", e))?;
        }
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

    fn find_matching_tabs(&self, target_host: &str) -> Result<Vec<CachedTab>, String> {
        find_tabs_in_browser(self, target_host)
    }

    fn activate_tab(&self, tab: &CachedTab) -> Result<(), String> {
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

    fn find_matching_tabs(&self, target_host: &str) -> Result<Vec<CachedTab>, String> {
        find_tabs_in_browser(self, target_host)
    }

    fn activate_tab(&self, tab: &CachedTab) -> Result<(), String> {
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

    fn find_matching_tabs(&self, target_host: &str) -> Result<Vec<CachedTab>, String> {
        find_tabs_in_browser(self, target_host)
    }

    fn activate_tab(&self, tab: &CachedTab) -> Result<(), String> {
        generic_activate_tab(tab)
    }

    fn open_url(&self, url: &str) -> Result<(), String> {
        generic_open_url("brave.exe", url)
    }
}

pub struct OperaProvider;
impl BrowserProvider for OperaProvider {
    fn browser_name(&self) -> &'static str { "Opera" }
    fn process_name(&self) -> &'static str { "opera.exe" }
    fn window_class_name(&self) -> &'static str { "Chrome_WidgetWin_1" }

    fn find_matching_tabs(&self, target_host: &str) -> Result<Vec<CachedTab>, String> {
        find_tabs_in_browser(self, target_host)
    }

    fn activate_tab(&self, tab: &CachedTab) -> Result<(), String> {
        generic_activate_tab(tab)
    }

    fn open_url(&self, url: &str) -> Result<(), String> {
        generic_open_url("launcher.exe", url)
    }
}

pub struct FirefoxProvider;
impl BrowserProvider for FirefoxProvider {
    fn browser_name(&self) -> &'static str { "Firefox" }
    fn process_name(&self) -> &'static str { "firefox.exe" }
    fn window_class_name(&self) -> &'static str { "MozillaWindowClass" }

    fn find_matching_tabs(&self, target_host: &str) -> Result<Vec<CachedTab>, String> {
        find_tabs_in_browser(self, target_host)
    }

    fn activate_tab(&self, tab: &CachedTab) -> Result<(), String> {
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
        Box::new(OperaProvider),
        Box::new(FirefoxProvider),
    ]
}
