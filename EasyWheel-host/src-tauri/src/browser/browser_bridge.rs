use std::collections::HashMap;
use std::sync::{Arc, Mutex, OnceLock};
use std::sync::mpsc::{channel, Sender};
use std::thread;
use std::net::TcpListener;
use std::time::Duration;
use serde::{Deserialize, Serialize};
use tungstenite::{accept, Message};

#[cfg(target_os = "windows")]
use winapi::shared::windef::HWND;
#[cfg(target_os = "windows")]
use winapi::um::winuser::{
    EnumWindows, GetClassNameW, GetWindowTextW, GetWindowThreadProcessId,
    IsWindowVisible, SetForegroundWindow, ShowWindow, SW_RESTORE,
};
#[cfg(target_os = "windows")]
use winapi::um::handleapi::CloseHandle;
#[cfg(target_os = "windows")]
use winapi::um::processthreadsapi::OpenProcess;
#[cfg(target_os = "windows")]
use winapi::um::winbase::QueryFullProcessImageNameW;
#[cfg(target_os = "windows")]
use winapi::um::winnt::PROCESS_QUERY_LIMITED_INFORMATION;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BrowserTab {
    #[serde(rename = "tabId")]
    pub tab_id: u32,
    #[serde(rename = "windowId")]
    pub window_id: u32,
    pub title: String,
    pub url: String,
    pub domain: String,
    pub active: bool,
    #[serde(rename = "lastAccessed")]
    pub last_accessed: Option<f64>,
}

#[derive(Deserialize)]
#[serde(tag = "type")]
enum ExtensionMessage {
    #[serde(rename = "TABS_UPDATE")]
    TabsUpdate {
        browser: String,
        tabs: Vec<BrowserTab>,
    },
    #[serde(rename = "ACTIVATE_TAB_RESULT")]
    ActivateTabResult {
        #[serde(rename = "tabId")]
        tab_id: u32,
        success: bool,
        error: Option<String>,
    },
    #[serde(rename = "PONG")]
    Pong,
}

#[derive(Serialize)]
#[serde(tag = "type")]
enum HostCommand {
    #[serde(rename = "ACTIVATE_TAB")]
    ActivateTab {
        #[serde(rename = "tabId")]
        tab_id: u32,
        #[serde(rename = "windowId")]
        window_id: u32,
    },
}

pub struct BrowserSession {
    pub sender: Sender<String>,
    pub tabs: Vec<BrowserTab>,
}

pub struct BrowserBridge {
    state: Arc<Mutex<HashMap<String, BrowserSession>>>,
    pending_activations: Arc<Mutex<HashMap<u32, Sender<Result<(), String>>>>>,
}

static BRIDGE: OnceLock<BrowserBridge> = OnceLock::new();

pub fn extract_host(url: &str) -> &str {
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

pub fn get_base_domain(host: &str) -> &str {
    let parts: Vec<&str> = host.split('.').collect();
    if parts.len() > 2 {
        let last = parts[parts.len() - 1];
        let second_last = parts[parts.len() - 2];
        if (last == "uk" && second_last == "co") ||
           (last == "br" && second_last == "com") ||
           (last == "au" && second_last == "net") ||
           (last == "uk" && second_last == "org") {
            if parts.len() >= 3 {
                let start_idx = parts.len() - 3;
                return &host[host.find(parts[start_idx]).unwrap()..];
            }
        }
        let start_idx = parts.len() - 2;
        return &host[host.find(parts[start_idx]).unwrap()..];
    }
    host
}

pub fn match_domain(configured_url: &str, tab_url: &str) -> bool {
    let conf_host = extract_host(configured_url).to_lowercase();
    let tab_host = extract_host(tab_url).to_lowercase();
    if conf_host.is_empty() || tab_host.is_empty() {
        return false;
    }
    let conf_base = get_base_domain(&conf_host);
    let tab_base = get_base_domain(&tab_host);
    conf_base == tab_base
}

// -------------------------------------------------------------------------
// Win32 Helper functions to bring browser window to the foreground natively
// -------------------------------------------------------------------------

#[cfg(target_os = "windows")]
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

#[cfg(target_os = "windows")]
struct FocusState {
    process_names: Vec<String>,
    class_name: String,
    title_substring: String,
    focused: bool,
}

#[cfg(target_os = "windows")]
unsafe extern "system" fn focus_callback(hwnd: HWND, lparam: winapi::shared::minwindef::LPARAM) -> winapi::shared::minwindef::BOOL {
    let state = &mut *(lparam as *mut FocusState);
    if state.focused {
        return 0; // stop enumeration
    }

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
                        let proc_lower = proc_name.to_ascii_lowercase();
                        if state.process_names.iter().any(|p| p == &proc_lower) {
                            let mut title_buf = vec![0u16; 512];
                            let title_len = GetWindowTextW(hwnd, title_buf.as_mut_ptr(), title_buf.len() as i32);
                            let title_str = String::from_utf16_lossy(&title_buf[..title_len as usize]).to_lowercase();
                            
                            if title_str.contains(&state.title_substring) {
                                ShowWindow(hwnd, SW_RESTORE);
                                SetForegroundWindow(hwnd);
                                state.focused = true;
                                return 0; // stop enumeration
                            }
                        }
                    }
                }
            }
        }
    }
    1
}

#[cfg(target_os = "windows")]
pub fn focus_window(browser: &str, tab_title: &str) -> bool {
    let browser_lower = browser.to_ascii_lowercase();
    let (process_names, class_name) = match browser_lower.as_str() {
        "chrome" => (vec!["chrome.exe".to_string()], "Chrome_WidgetWin_1".to_string()),
        "edge" => (vec!["msedge.exe".to_string()], "Chrome_WidgetWin_1".to_string()),
        "brave" => (vec!["brave.exe".to_string()], "Chrome_WidgetWin_1".to_string()),
        "opera" => (vec!["opera.exe".to_string(), "launcher.exe".to_string()], "Chrome_WidgetWin_1".to_string()),
        "firefox" => (vec!["firefox.exe".to_string()], "MozillaWindowClass".to_string()),
        _ => (vec![], "".to_string()),
    };

    if process_names.is_empty() {
        return false;
    }

    // Clean target tab title to compare (e.g. to lowercase)
    let title_substring = tab_title.to_lowercase();

    // We retry up to 5 times with a 30ms sleep because tab switching in the browser
    // is async and the window title might take a few milliseconds to update to the new tab.
    for _ in 0..5 {
        let mut state = FocusState {
            process_names: process_names.clone(),
            class_name: class_name.clone(),
            title_substring: title_substring.clone(),
            focused: false,
        };

        unsafe {
            EnumWindows(Some(focus_callback), &mut state as *mut FocusState as _);
        }

        if state.focused {
            return true;
        }
        thread::sleep(Duration::from_millis(30));
    }
    false
}

impl BrowserBridge {
    pub fn global() -> &'static Self {
        BRIDGE.get_or_init(|| Self {
            state: Arc::new(Mutex::new(HashMap::new())),
            pending_activations: Arc::new(Mutex::new(HashMap::new())),
        })
    }

    pub fn start() {
        let bridge = Self::global();
        let state = bridge.state.clone();
        let pending = bridge.pending_activations.clone();

        thread::spawn(move || {
            let addr = "127.0.0.1:23436";
            let listener = match TcpListener::bind(addr) {
                Ok(l) => l,
                Err(e) => {
                    eprintln!("[BrowserBridge] Error: Failed to bind WebSocket server to {} — {}", addr, e);
                    return;
                }
            };

            for stream in listener.incoming() {
                let stream = match stream {
                    Ok(s) => s,
                    Err(e) => {
                        eprintln!("[BrowserBridge] Error: Failed to accept incoming stream — {}", e);
                        continue;
                    }
                };

                let state_clone = state.clone();
                let pending_clone = pending.clone();
                thread::spawn(move || {
                    let ws = match accept(stream) {
                        Ok(w) => w,
                        Err(e) => {
                            eprintln!("[BrowserBridge] Error: Failed WebSocket handshake — {}", e);
                            return;
                        }
                    };

                    println!("[BrowserBridge] Info: Browser extension connected");

                    let ws_arc = Arc::new(Mutex::new(ws));
                    let ws_write_clone = ws_arc.clone();
                    let (tx, rx) = channel::<String>();
                    
                    let _writer_thread = thread::spawn(move || {
                        while let Ok(msg_str) = rx.recv() {
                            let mut ws_guard = ws_write_clone.lock().unwrap();
                            if let Err(e) = ws_guard.write(Message::Text(msg_str)) {
                                eprintln!("[BrowserBridge] Error writing to extension: {}", e);
                                break;
                            }
                        }
                    });

                    let mut registered_browser: Option<String> = None;

                    loop {
                        let mut ws_guard = ws_arc.lock().unwrap();
                        match ws_guard.read() {
                            Ok(msg) => {
                                drop(ws_guard); // Release lock while processing
                                if let Message::Text(text) = msg {
                                    if let Ok(ext_msg) = serde_json::from_str::<ExtensionMessage>(&text) {
                                        match ext_msg {
                                            ExtensionMessage::TabsUpdate { browser, tabs } => {
                                                let browser_lower = browser.to_ascii_lowercase();
                                                registered_browser = Some(browser_lower.clone());
                                                
                                                let mut guard = state_clone.lock().unwrap();
                                                guard.insert(
                                                    browser_lower,
                                                    BrowserSession {
                                                        sender: tx.clone(),
                                                        tabs,
                                                    },
                                                );
                                            }
                                            ExtensionMessage::ActivateTabResult { tab_id, success, error } => {
                                                let mut pending_guard = pending_clone.lock().unwrap();
                                                if let Some(sender) = pending_guard.remove(&tab_id) {
                                                    if success {
                                                        let _ = sender.send(Ok(()));
                                                    } else {
                                                        let err_msg = error.unwrap_or_else(|| "Unknown browser error".to_string());
                                                        let _ = sender.send(Err(err_msg));
                                                    }
                                                }
                                            }
                                            ExtensionMessage::Pong => {
                                                // Keep-alive pong
                                            }
                                        }
                                    }
                                }
                            }
                            Err(e) => {
                                drop(ws_guard);
                                eprintln!("[BrowserBridge] Error: Connection closed — {}", e);
                                break;
                            }
                        }
                    }

                    // Clean up registration on disconnect
                    if let Some(browser) = registered_browser {
                        let mut guard = state_clone.lock().unwrap();
                        guard.remove(&browser);
                        println!("[BrowserBridge] Info: Browser extension disconnected ({})", browser);
                    }
                });
            }
        });
    }

    pub fn find_matching_tab(&self, url: &str, browser_filter: &str) -> Option<BrowserTab> {
        println!("[BrowserBridge] Received Browser Shortcut request");
        
        let guard = self.state.lock().unwrap();
        let filter_lower = browser_filter.to_ascii_lowercase();

        let mut matching_tabs = Vec::new();

        for (browser_name, session) in guard.iter() {
            let matches_browser = match filter_lower.as_str() {
                "chrome" => browser_name == "chrome",
                "edge" => browser_name == "edge",
                "brave" => browser_name == "brave",
                "opera" => browser_name == "opera",
                "firefox" => browser_name == "firefox",
                _ => true,
            };

            if matches_browser {
                for tab in &session.tabs {
                    if match_domain(url, &tab.url) {
                        matching_tabs.push(tab.clone());
                    }
                }
            }
        }

        if matching_tabs.is_empty() {
            println!("No match found");
            return None;
        }

        // Prioritize active and MRU tabs
        matching_tabs.sort_by(|tab_a, tab_b| {
            if tab_a.active != tab_b.active {
                return tab_b.active.cmp(&tab_a.active);
            }
            let time_a = tab_a.last_accessed.unwrap_or(0.0);
            let time_b = tab_b.last_accessed.unwrap_or(0.0);
            time_b.partial_cmp(&time_a).unwrap_or(std::cmp::Ordering::Equal)
        });

        let best_tab = &matching_tabs[0];
        let host_val = extract_host(url);
        println!("Matched domain: {}", get_base_domain(&host_val.to_lowercase()));
        Some(best_tab.clone())
    }

    pub fn activate_tab(&self, tab: &BrowserTab) -> Result<(), String> {
        let guard = self.state.lock().unwrap();
        
        let mut session_found = None;
        let mut matched_browser = String::new();
        for (browser_name, session) in guard.iter() {
            if session.tabs.iter().any(|t| t.tab_id == tab.tab_id && t.window_id == tab.window_id) {
                session_found = Some(session);
                matched_browser = browser_name.clone();
                break;
            }
        }
        
        if let Some(session) = session_found {
            let cmd = HostCommand::ActivateTab {
                tab_id: tab.tab_id,
                window_id: tab.window_id,
            };
            if let Ok(cmd_str) = serde_json::to_string(&cmd) {
                let (tx, rx) = channel::<Result<(), String>>();
                {
                    let mut pending_guard = self.pending_activations.lock().unwrap();
                    pending_guard.insert(tab.tab_id, tx);
                }

                if let Err(_) = session.sender.send(cmd_str) {
                    let mut pending_guard = self.pending_activations.lock().unwrap();
                    pending_guard.remove(&tab.tab_id);
                    return Err("Failed to send activation command to extension".to_string());
                }

                // Wait for the response from the extension (timeout after 1500ms)
                match rx.recv_timeout(Duration::from_millis(1500)) {
                    Ok(Ok(())) => {
                        println!("Activated existing tab");
                        
                        // Bring window to foreground natively
                        #[cfg(target_os = "windows")]
                        {
                            let _ = focus_window(&matched_browser, &tab.title);
                        }
                        
                        return Ok(());
                    }
                    Ok(Err(err)) => {
                        println!("Activation failed: {}", err);
                        return Err(err);
                    }
                    Err(_) => {
                        let mut pending_guard = self.pending_activations.lock().unwrap();
                        pending_guard.remove(&tab.tab_id);
                        println!("Activation failed: Timeout waiting for response from extension");
                        return Err("Timeout".to_string());
                    }
                }
            }
        }
        
        Err("Browser extension session not found for tab".to_string())
    }

    pub fn open_launch_url(&self, url: &str, browser: &str) -> Result<(), String> {
        println!("Opened launch URL: {}", url);
        #[cfg(target_os = "windows")]
        {
            crate::providers::windows_provider::open_website_windows(url, browser)?;
        }
        #[cfg(not(target_os = "windows"))]
        {
            println!("[BrowserBridge] Stub: open_launch_url '{}'", url);
        }
        Ok(())
    }

    #[allow(dead_code)]
    pub fn list_tabs(&self) -> Vec<BrowserTab> {
        let guard = self.state.lock().unwrap();
        guard.values().flat_map(|session| session.tabs.clone()).collect()
    }
}
