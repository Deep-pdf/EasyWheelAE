use std::collections::HashMap;
use std::sync::{Arc, Mutex, OnceLock};
use std::sync::mpsc::{channel, Sender};
use std::thread;
use std::net::TcpListener;
use std::time::Duration;
use std::sync::atomic::{AtomicBool, Ordering};
use serde::{Deserialize, Serialize};
use tungstenite::{accept, Message};

pub static RUNNING: AtomicBool = AtomicBool::new(true);

#[cfg(target_os = "windows")]
use winapi::shared::windef::HWND;
#[cfg(target_os = "windows")]
use winapi::um::winuser::{
    EnumWindows, GetClassNameW, GetWindowTextW, GetWindowThreadProcessId,
    IsWindowVisible, SetForegroundWindow, ShowWindow, SW_RESTORE, SW_SHOW, IsIconic,
};
#[cfg(target_os = "windows")]
use winapi::um::handleapi::CloseHandle;
#[cfg(target_os = "windows")]
use winapi::um::processthreadsapi::OpenProcess;
#[cfg(target_os = "windows")]
use winapi::um::winbase::QueryFullProcessImageNameW;
#[cfg(target_os = "windows")]
use winapi::um::winnt::PROCESS_QUERY_LIMITED_INFORMATION;

// ---------------------------------------------------------------------------
// Public data types
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Wire messages
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Per-connection session stored in shared state
// ---------------------------------------------------------------------------

struct BrowserSession {
    /// Channel used to push outgoing messages to the writer thread.
    outbox: Sender<String>,
    tabs: Vec<BrowserTab>,
}

// ---------------------------------------------------------------------------
// Shared bridge state
// ---------------------------------------------------------------------------

struct BridgeState {
    sessions: HashMap<String, BrowserSession>,
    /// Pending activation responses keyed by tabId.
    pending: HashMap<u32, Sender<Result<(), String>>>,
}

impl BridgeState {
    fn new() -> Self {
        Self {
            sessions: HashMap::new(),
            pending: HashMap::new(),
        }
    }
}

// ---------------------------------------------------------------------------
// BrowserBridge — the public API
// ---------------------------------------------------------------------------

pub struct BrowserBridge {
    state: Arc<Mutex<BridgeState>>,
}

static BRIDGE: OnceLock<BrowserBridge> = OnceLock::new();

impl BrowserBridge {
    pub fn global() -> &'static Self {
        BRIDGE.get_or_init(|| Self {
            state: Arc::new(Mutex::new(BridgeState::new())),
        })
    }

    pub fn shutdown() {
        RUNNING.store(false, Ordering::Relaxed);
        let addr = "127.0.0.1:23436";
        if let Ok(_) = std::net::TcpStream::connect(addr) {
            println!("[BrowserBridge] Info: Sent wakeup ping to connection loop for shutdown.");
        }
    }

    pub fn is_connected(&self) -> bool {
        let guard = self.state.lock().unwrap_or_else(|e| e.into_inner());
        !guard.sessions.is_empty()
    }

    /// Start the WebSocket server in a background thread.
    pub fn start() {
        println!("[BrowserBridge] BrowserBridge starting...");

        let state = Self::global().state.clone();

        thread::spawn(move || {
            let addr = "127.0.0.1:23436";
            let listener = loop {
                if !RUNNING.load(Ordering::Relaxed) {
                    return;
                }
                match TcpListener::bind(addr) {
                    Ok(l) => break l,
                    Err(e) => {
                        eprintln!("[BrowserBridge] Warning: Cannot bind to {} — {}. Retrying in 5 seconds...", addr, e);
                        thread::sleep(Duration::from_secs(5));
                    }
                }
            };

            println!("[BrowserBridge] Listening on port 23436");

            for tcp_stream in listener.incoming() {
                if !RUNNING.load(Ordering::Relaxed) {
                    break;
                }
                let tcp_stream = match tcp_stream {
                    Ok(s) => s,
                    Err(e) => {
                        if !RUNNING.load(Ordering::Relaxed) {
                            break;
                        }
                        eprintln!("[BrowserBridge] Accept error: {}", e);
                        continue;
                    }
                };

                let state_clone = state.clone();

                thread::spawn(move || {
                    // ----------------------------------------------------------
                    // Step 1 — WebSocket handshake (NO timeout here — the OS
                    // HTTP Upgrade request must be read in full first)
                    // ----------------------------------------------------------
                    let ws = match accept(tcp_stream) {
                        Ok(w) => w,
                        Err(e) => {
                            eprintln!("[BrowserBridge] Handshake failed: {}", e);
                            return;
                        }
                    };

                    println!("[BrowserBridge] Client connected");

                    // ----------------------------------------------------------
                    // Step 2 — Set a read timeout NOW (after handshake succeeds)
                    // so the reader loop can yield without blocking the mutex.
                    // ----------------------------------------------------------
                    if let Err(e) = ws.get_ref().set_read_timeout(Some(Duration::from_millis(50))) {
                        eprintln!("[BrowserBridge] set_read_timeout failed: {}", e);
                    }

                    // ----------------------------------------------------------
                    // Step 3 — Spawn a dedicated writer thread.
                    // We give it ownership of outgoing frames via a channel.
                    // The reader thread sends strings; the writer serialises them.
                    // We share the WebSocket by splitting: the writer owns the
                    // write half through the channel + a clone of the socket ref.
                    //
                    // tungstenite doesn't support split(), so we use a second
                    // Arc<Mutex<>> specifically for writes.  The reader acquires
                    // the lock only long enough to call read(), then immediately
                    // releases it, so the writer can grab it between reads.
                    // ----------------------------------------------------------
                    let ws_arc = Arc::new(Mutex::new(ws));
                    let ws_writer = ws_arc.clone();

                    let (tx, rx) = channel::<String>();

                    thread::spawn(move || {
                        while let Ok(payload) = rx.recv() {
                            let mut guard = ws_writer.lock().unwrap();
                            if let Err(e) = guard.send(Message::Text(payload)) {
                                eprintln!("[BrowserBridge] Write error: {}", e);
                                break;
                            }
                        }
                    });

                    // ----------------------------------------------------------
                    // Step 4 — Reader loop
                    // ----------------------------------------------------------
                    let mut registered_browser: Option<String> = None;

                    loop {
                        // Acquire the lock, attempt a read, release immediately.
                        let msg = {
                            let mut guard = ws_arc.lock().unwrap();
                            guard.read()
                        };

                        match msg {
                            Ok(Message::Text(text)) => {
                                handle_incoming(
                                    &text,
                                    &tx,
                                    &state_clone,
                                    &mut registered_browser,
                                );
                            }
                            Ok(Message::Ping(data)) => {
                                // tungstenite auto-replies to Ping, but we must
                                // send the Pong manually when using the raw API.
                                let mut guard = ws_arc.lock().unwrap();
                                let _ = guard.send(Message::Pong(data));
                            }
                            Ok(_) => {
                                // Binary / Close / other — ignore
                            }
                            Err(tungstenite::Error::Io(ref e))
                                if e.kind() == std::io::ErrorKind::WouldBlock
                                    || e.kind() == std::io::ErrorKind::TimedOut =>
                            {
                                // No data within the 50 ms window — loop again.
                                // This tight loop lets the writer pick up the lock
                                // between read attempts.
                                thread::sleep(Duration::from_millis(5));
                            }
                            Err(e) => {
                                println!("[BrowserBridge] Connection closed: {}", e);
                                break;
                            }
                        }
                    }

                    // ----------------------------------------------------------
                    // Step 5 — Clean up on disconnect
                    // ----------------------------------------------------------
                    if let Some(browser) = registered_browser {
                        let mut guard = state_clone.lock().unwrap();
                        guard.sessions.remove(&browser);
                        println!("[BrowserBridge] Client disconnected ({})", browser);
                    }
                });
            }

            println!("[BrowserBridge] Server stopped");
        });
    }

    // -------------------------------------------------------------------------
    // Public API
    // -------------------------------------------------------------------------

    pub fn find_matching_tab(&self, url: &str, browser_filter: &str) -> Option<BrowserTab> {
        println!("[BrowserBridge] Received Browser Shortcut request for: {}", url);

        let guard = self.state.lock().unwrap();
        let filter_lower = browser_filter.to_ascii_lowercase();

        if guard.sessions.is_empty() {
            println!("[BrowserBridge] No extension connected — cannot match tabs");
            return None;
        }

        let mut matching_tabs: Vec<BrowserTab> = Vec::new();

        for (browser_name, session) in &guard.sessions {
            let matches_browser = match filter_lower.as_str() {
                "chrome"  => browser_name == "chrome",
                "edge"    => browser_name == "edge",
                "brave"   => browser_name == "brave",
                "opera"   => browser_name == "opera",
                "firefox" => browser_name == "firefox",
                _         => true,
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
            println!("[BrowserBridge] No matching tab found for: {}", url);
            return None;
        }

        // Prefer the currently active tab; break ties by most-recently-accessed.
        matching_tabs.sort_by(|a, b| {
            b.active.cmp(&a.active).then_with(|| {
                let ta = a.last_accessed.unwrap_or(0.0);
                let tb = b.last_accessed.unwrap_or(0.0);
                tb.partial_cmp(&ta).unwrap_or(std::cmp::Ordering::Equal)
            })
        });

        let best = &matching_tabs[0];
        println!(
            "[BrowserBridge] Matched tab: \"{}\" (tabId={} windowId={})",
            best.title, best.tab_id, best.window_id
        );
        Some(best.clone())
    }

    pub fn activate_tab(&self, tab: &BrowserTab) -> Result<(), String> {
        let (outbox_tx, result_tx) = {
            let mut guard = self.state.lock().unwrap();

            // Find the session that owns this tab.
            let mut outbox = None;
            let mut matched_browser_name = String::new();
            for (name, session) in &guard.sessions {
                if session.tabs.iter().any(|t| t.tab_id == tab.tab_id) {
                    outbox = Some(session.outbox.clone());
                    matched_browser_name = name.clone();
                    break;
                }
            }

            let outbox = match outbox {
                Some(o) => o,
                None => {
                    println!("[BrowserBridge] No extension session for tab {}", tab.tab_id);
                    return Err("No extension session for this tab".to_string());
                }
            };

            let _ = matched_browser_name; // used for logging elsewhere

            // Register a pending-response channel keyed by tabId.
            let (result_tx, result_rx_holder) = channel::<Result<(), String>>();
            guard.pending.insert(tab.tab_id, result_tx.clone());

            (outbox, (result_tx, result_rx_holder))
        };

        let (_, rx) = result_tx; // rename for clarity

        // Send the activate command to the extension.
        let cmd = HostCommand::ActivateTab {
            tab_id:    tab.tab_id,
            window_id: tab.window_id,
        };
        let cmd_str = serde_json::to_string(&cmd)
            .map_err(|e| format!("Serialise error: {}", e))?;

        println!(
            "[BrowserBridge] Sending ACTIVATE_TAB tabId={} windowId={}",
            tab.tab_id, tab.window_id
        );

        if outbox_tx.send(cmd_str).is_err() {
            let mut guard = self.state.lock().unwrap();
            guard.pending.remove(&tab.tab_id);
            return Err("Extension outbox channel closed".to_string());
        }

        // Wait up to 3 seconds for the extension to respond.
        match rx.recv_timeout(Duration::from_millis(3000)) {
            Ok(Ok(())) => {
                println!("[BrowserBridge] Tab activated successfully");

                // Bring the browser window to the foreground at OS level.
                #[cfg(target_os = "windows")]
                {
                    let browser = {
                        let guard = self.state.lock().unwrap();
                        guard.sessions.keys().next().cloned().unwrap_or_default()
                    };
                    let _ = focus_window(&browser, &tab.title);
                }

                Ok(())
            }
            Ok(Err(err)) => {
                println!("[BrowserBridge] Activation failed: {}", err);
                Err(err)
            }
            Err(_) => {
                {
                    let mut guard = self.state.lock().unwrap();
                    guard.pending.remove(&tab.tab_id);
                }
                println!("[BrowserBridge] Activation timed out (no response from extension)");
                Err("Timeout".to_string())
            }
        }
    }

    pub fn open_launch_url(&self, url: &str, browser: &str) -> Result<(), String> {
        println!("[BrowserBridge] Opening URL: {}", url);
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
}

// ---------------------------------------------------------------------------
// Message handler — called from the reader loop
// ---------------------------------------------------------------------------

fn handle_incoming(
    text: &str,
    outbox: &Sender<String>,
    state: &Arc<Mutex<BridgeState>>,
    registered_browser: &mut Option<String>,
) {
    let msg = match serde_json::from_str::<ExtensionMessage>(text) {
        Ok(m) => m,
        Err(e) => {
            eprintln!("[BrowserBridge] Unrecognised message: {} — raw: {}", e, text);
            return;
        }
    };

    match msg {
        ExtensionMessage::TabsUpdate { browser, tabs } => {
            let browser_lower = browser.to_ascii_lowercase();
            println!(
                "[BrowserBridge] TABS_UPDATE from {} ({} tabs)",
                browser_lower,
                tabs.len()
            );
            *registered_browser = Some(browser_lower.clone());

            let mut guard = state.lock().unwrap();
            guard.sessions.insert(
                browser_lower,
                BrowserSession {
                    outbox: outbox.clone(),
                    tabs,
                },
            );
        }

        ExtensionMessage::ActivateTabResult { tab_id, success, error } => {
            println!(
                "[BrowserBridge] ACTIVATE_TAB_RESULT tabId={} success={}{}",
                tab_id,
                success,
                if let Some(ref e) = error { format!(" error={}", e) } else { String::new() }
            );

            let mut guard = state.lock().unwrap();
            if let Some(sender) = guard.pending.remove(&tab_id) {
                let result = if success {
                    Ok(())
                } else {
                    Err(error.unwrap_or_else(|| "Unknown browser error".to_string()))
                };
                let _ = sender.send(result);
            }
        }

        ExtensionMessage::Pong => {
            // Keep-alive — nothing to do.
        }
    }
}

// ---------------------------------------------------------------------------
// URL / domain matching helpers
// ---------------------------------------------------------------------------

pub fn extract_host(url: &str) -> &str {
    let mut s = url;
    if s.starts_with("https://") {
        s = &s[8..];
    } else if s.starts_with("http://") {
        s = &s[7..];
    }
    if let Some(p) = s.find('/') { s = &s[..p]; }
    if let Some(p) = s.find(':') { s = &s[..p]; }
    s
}

pub fn get_base_domain(host: &str) -> &str {
    let parts: Vec<&str> = host.split('.').collect();
    if parts.len() > 2 {
        let last = parts[parts.len() - 1];
        let snd  = parts[parts.len() - 2];
        // Two-part ccTLD secondaries
        if matches!(
            (snd, last),
            ("co", "uk") | ("com", "br") | ("net", "au") | ("org", "uk")
        ) {
            if parts.len() >= 3 {
                let i = parts.len() - 3;
                return &host[host.find(parts[i]).unwrap()..];
            }
        }
        let i = parts.len() - 2;
        return &host[host.find(parts[i]).unwrap()..];
    }
    host
}

pub fn match_domain(configured_url: &str, tab_url: &str) -> bool {
    let ch = extract_host(configured_url).to_lowercase();
    let th = extract_host(tab_url).to_lowercase();
    if ch.is_empty() || th.is_empty() { return false; }
    get_base_domain(&ch) == get_base_domain(&th)
}

// ---------------------------------------------------------------------------
// Win32 window focus helpers
// ---------------------------------------------------------------------------

#[cfg(target_os = "windows")]
fn get_process_name(pid: u32) -> Option<String> {
    unsafe {
        let h = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, 0, pid);
        if h.is_null() { return None; }
        let mut buf  = vec![0u16; 260];
        let mut size = buf.len() as u32;
        let ok = QueryFullProcessImageNameW(h, 0, buf.as_mut_ptr(), &mut size);
        CloseHandle(h);
        if ok != 0 {
            let path = String::from_utf16_lossy(&buf[..size as usize]);
            return std::path::Path::new(&path)
                .file_name()
                .map(|f| f.to_string_lossy().into_owned());
        }
        None
    }
}

#[cfg(target_os = "windows")]
struct FocusState {
    process_names:   Vec<String>,
    class_name:      String,
    title_substring: String,
    focused:         bool,
}

#[cfg(target_os = "windows")]
unsafe extern "system" fn focus_callback(
    hwnd: HWND,
    lparam: winapi::shared::minwindef::LPARAM,
) -> winapi::shared::minwindef::BOOL {
    let state = &mut *(lparam as *mut FocusState);
    if state.focused { return 0; }

    if IsWindowVisible(hwnd) != 0 {
        let mut cls = vec![0u16; 256];
        let len = GetClassNameW(hwnd, cls.as_mut_ptr(), cls.len() as i32);
        if len > 0 {
            let cls_str = String::from_utf16_lossy(&cls[..len as usize]);
            if cls_str == state.class_name {
                let mut pid = 0u32;
                GetWindowThreadProcessId(hwnd, &mut pid);
                if let Some(proc) = get_process_name(pid) {
                    let proc_l = proc.to_ascii_lowercase();
                    if state.process_names.iter().any(|p| p == &proc_l) {
                        let mut title = vec![0u16; 512];
                        let tl = GetWindowTextW(hwnd, title.as_mut_ptr(), title.len() as i32);
                        let title_s = String::from_utf16_lossy(&title[..tl as usize]).to_lowercase();
                        if title_s.contains(&state.title_substring) {
                            if IsIconic(hwnd) != 0 {
                                ShowWindow(hwnd, SW_RESTORE);
                            } else {
                                ShowWindow(hwnd, SW_SHOW);
                            }
                            SetForegroundWindow(hwnd);
                            state.focused = true;
                            return 0;
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
    let (process_names, class_name) = match browser.to_ascii_lowercase().as_str() {
        "chrome"  => (vec!["chrome.exe".to_string()],  "Chrome_WidgetWin_1".to_string()),
        "edge"    => (vec!["msedge.exe".to_string()],  "Chrome_WidgetWin_1".to_string()),
        "brave"   => (vec!["brave.exe".to_string()],   "Chrome_WidgetWin_1".to_string()),
        "opera"   => (vec!["opera.exe".to_string()],   "Chrome_WidgetWin_1".to_string()),
        "firefox" => (vec!["firefox.exe".to_string()], "MozillaWindowClass".to_string()),
        _ => return false,
    };

    let needle = tab_title.to_lowercase();

    for _ in 0..5 {
        let mut state = FocusState {
            process_names:   process_names.clone(),
            class_name:      class_name.clone(),
            title_substring: needle.clone(),
            focused:         false,
        };
        unsafe {
            EnumWindows(Some(focus_callback), &mut state as *mut FocusState as _);
        }
        if state.focused { return true; }
        thread::sleep(Duration::from_millis(30));
    }
    false
}
