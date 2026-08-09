//! Foreground application detection for EasyWheel Host.
//!
//! `ForegroundApplicationService` reads the executable filename of the
//! currently focused application window using the Win32 API chain:
//!
//! ```text
//! GetForegroundWindow()
//!     ↓
//! GetWindowThreadProcessId()   →  process ID (PID)
//!     ↓
//! OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION)
//!     ↓
//! QueryFullProcessImageNameW() →  full image path
//!     ↓
//! Path::file_name()            →  "AfterFX.exe"
//! ```
//!
//! # Fallback Behaviour
//!
//! If any step in the chain fails — including the case where the foreground
//! window is the EasyWheel overlay itself — the function returns
//! `"explorer.exe"`. This causes `ProfileManager` to load the Desktop
//! profile, which is always the safest fallback.
//!
//! # Responsibilities
//!
//! - Read the currently focused application's executable filename.
//! - Return it as a plain `String` (e.g. `"AfterFX.exe"`).
//!
//! # Out of Scope
//!
//! This module does not perform profile resolution, action lookup, or any
//! form of window title reading. Window titles are explicitly excluded as an
//! identification mechanism.

/// Fallback executable returned when detection fails.
const FALLBACK_EXECUTABLE: &str = "explorer.exe";

/// Detects the foreground application by executable name.
///
/// `ForegroundApplicationService` is a unit struct — it holds no state.
/// Every call performs a fresh OS query.
pub struct ForegroundApplicationService;

impl ForegroundApplicationService {
    /// Returns the executable filename of the currently focused window.
    ///
    /// Examples: `"AfterFX.exe"`, `"Code.exe"`, `"chrome.exe"`.
    ///
    /// Returns `"explorer.exe"` on any failure so the Desktop profile is
    /// always selected as the safe fallback.
    pub fn get_executable() -> String {
        #[cfg(target_os = "windows")]
        {
            Self::get_executable_windows()
        }

        #[cfg(target_os = "linux")]
        {
            Self::get_executable_linux()
        }

        #[cfg(not(any(target_os = "windows", target_os = "linux")))]
        {
            FALLBACK_EXECUTABLE.to_string()
        }
    }

    // -----------------------------------------------------------------------
    // Windows implementation
    // -----------------------------------------------------------------------

    #[cfg(target_os = "windows")]
    fn get_executable_windows() -> String {
        use std::path::Path;

        use winapi::shared::minwindef::DWORD;
        use winapi::um::handleapi::CloseHandle;
        use winapi::um::processthreadsapi::OpenProcess;
        use winapi::um::winbase::QueryFullProcessImageNameW;
        use winapi::um::winnt::PROCESS_QUERY_LIMITED_INFORMATION;
        use winapi::um::winuser::{GetForegroundWindow, GetWindowThreadProcessId};

        // PROCESS_NAME_WIN32 = 0: use Win32 path format (not NT device path).
        // This constant is not exported by winapi 0.3; defined inline from MSDN.
        const PROCESS_NAME_WIN32: DWORD = 0;

        unsafe {
            // Step 1 — Get the foreground window handle.
            let hwnd = GetForegroundWindow();
            if hwnd.is_null() {
                eprintln!(
                    "[ForegroundApp] Warning: GetForegroundWindow returned NULL. \
                     Using fallback."
                );
                return FALLBACK_EXECUTABLE.to_string();
            }

            // Step 2 — Resolve the window's process ID.
            let mut pid: DWORD = 0;
            GetWindowThreadProcessId(hwnd, &mut pid);
            if pid == 0 {
                eprintln!(
                    "[ForegroundApp] Warning: GetWindowThreadProcessId returned 0. \
                     Using fallback."
                );
                return FALLBACK_EXECUTABLE.to_string();
            }

            // Step 3 — Open the process with minimal required access.
            // PROCESS_QUERY_LIMITED_INFORMATION is sufficient for
            // QueryFullProcessImageNameW and avoids requiring elevated privileges.
            let handle = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, 0, pid);
            if handle.is_null() {
                eprintln!(
                    "[ForegroundApp] Warning: OpenProcess failed for PID {}. \
                     Using fallback.",
                    pid
                );
                return FALLBACK_EXECUTABLE.to_string();
            }

            // Step 4 — Query the full image path as a wide string.
            // Buffer: MAX_PATH (260) wide chars is sufficient for most paths.
            // For paths beyond 260 chars (rare, requires explicit opt-in on
            // modern Windows), the call fails and we fall back gracefully.
            let mut buf = vec![0u16; 260];
            let mut size: DWORD = buf.len() as DWORD;

            let ok = QueryFullProcessImageNameW(
                handle,
                PROCESS_NAME_WIN32, // Use Win32 path format, not NT native format.
                buf.as_mut_ptr(),
                &mut size,
            );

            // Always close the process handle, even on failure.
            CloseHandle(handle);

            if ok == 0 {
                eprintln!(
                    "[ForegroundApp] Warning: QueryFullProcessImageNameW failed \
                     for PID {}. Using fallback.",
                    pid
                );
                return FALLBACK_EXECUTABLE.to_string();
            }

            // Step 5 — Decode the wide string and extract just the filename.
            let path_str = String::from_utf16_lossy(&buf[..size as usize]);
            let exe_name = Path::new(&path_str)
                .file_name()
                .map(|n| n.to_string_lossy().into_owned())
                .unwrap_or_else(|| FALLBACK_EXECUTABLE.to_string());

            exe_name
        }
    }

    // -----------------------------------------------------------------------
    // Linux implementation (X11)
    // -----------------------------------------------------------------------

    #[cfg(target_os = "linux")]
    fn get_executable_linux() -> String {
        use std::sync::Mutex;
        use std::time::{Duration, Instant};
        use x11rb::connection::Connection;
        use x11rb::protocol::xproto::{Atom, AtomEnum, ConnectionExt, Window};
        use x11rb::rust_connection::RustConnection;

        struct X11State {
            conn: RustConnection,
            root: Window,
            net_active_window: Atom,
            net_wm_pid: Atom,
        }

        struct Cache {
            last_checked: Instant,
            cached_exe: String,
        }

        const CACHE_TTL: Duration = Duration::from_millis(150);

        static CACHE: Mutex<Option<Cache>> = Mutex::new(None);
        static X11_STATE: Mutex<Option<X11State>> = Mutex::new(None);

        let now = Instant::now();

        // 1. Return cached executable if queried within CACHE_TTL window
        if let Ok(guard) = CACHE.lock() {
            if let Some(ref cache) = *guard {
                if now.duration_since(cache.last_checked) < CACHE_TTL {
                    return cache.cached_exe.clone();
                }
            }
        }

        // 2. Query X11 using reused connection & pre-interned atoms
        let mut x11_guard = match X11_STATE.lock() {
            Ok(g) => g,
            Err(p) => p.into_inner(),
        };

        if x11_guard.is_none() {
            if let Ok((conn, screen_num)) = x11rb::connect(None) {
                if let Some(screen) = conn.setup().roots.get(screen_num) {
                    let root = screen.root;
                    let net_active_window = conn
                        .intern_atom(false, b"_NET_ACTIVE_WINDOW")
                        .ok()
                        .and_then(|c| c.reply().ok())
                        .map(|r| r.atom);
                    let net_wm_pid = conn
                        .intern_atom(false, b"_NET_WM_PID")
                        .ok()
                        .and_then(|c| c.reply().ok())
                        .map(|r| r.atom);

                    if let (Some(net_active_window), Some(net_wm_pid)) =
                        (net_active_window, net_wm_pid)
                    {
                        *x11_guard = Some(X11State {
                            conn,
                            root,
                            net_active_window,
                            net_wm_pid,
                        });
                    }
                }
            }
        }

        let detected = if let Some(ref state) = *x11_guard {
            let active_window = state
                .conn
                .get_property(
                    false,
                    state.root,
                    state.net_active_window,
                    AtomEnum::WINDOW,
                    0,
                    1,
                )
                .ok()
                .and_then(|c| c.reply().ok())
                .and_then(|r| r.value32().and_then(|mut iter| iter.next()))
                .filter(|&w| w != 0);

            if let Some(win) = active_window {
                // Try reading PID from _NET_WM_PID
                let pid = state
                    .conn
                    .get_property(false, win, state.net_wm_pid, AtomEnum::CARDINAL, 0, 1)
                    .ok()
                    .and_then(|c| c.reply().ok())
                    .and_then(|r| r.value32().and_then(|mut iter| iter.next()))
                    .filter(|&p| p > 0);

                let exe = if let Some(pid) = pid {
                    std::fs::read_link(format!("/proc/{pid}/exe"))
                        .ok()
                        .and_then(|p| p.file_name().map(|n| n.to_string_lossy().into_owned()))
                } else {
                    None
                };

                // Fallback: WM_CLASS string property
                exe.or_else(|| {
                    state
                        .conn
                        .get_property(false, win, AtomEnum::WM_CLASS, AtomEnum::STRING, 0, 1024)
                        .ok()
                        .and_then(|c| c.reply().ok())
                        .and_then(|r| {
                            let parts: Vec<&str> = r
                                .value
                                .split(|&b| b == 0)
                                .filter_map(|s| std::str::from_utf8(s).ok())
                                .filter(|s| !s.is_empty())
                                .collect();
                            parts.last().map(|s| s.to_string())
                        })
                })
            } else {
                None
            }
        } else {
            None
        };

        // Fallback: Under KDE Plasma Wayland, query KWin for active window class
        let detected = detected.or_else(Self::get_kwin_active_window);

        let result = detected.unwrap_or_else(|| FALLBACK_EXECUTABLE.to_string());

        // 3. Update cache
        if let Ok(mut guard) = CACHE.lock() {
            *guard = Some(Cache {
                last_checked: now,
                cached_exe: result.clone(),
            });
        }

        result
    }

    #[cfg(target_os = "linux")]
    fn get_kwin_active_window() -> Option<String> {
        use std::process::Command;

        let python_cmd = r#"
import dbus, dbus.service, tempfile, os
from dbus.mainloop.glib import DBusGMainLoop
from gi.repository import GLib

try:
    DBusGMainLoop(set_as_default=True)
    bus = dbus.SessionBus()
    result = []
    class R(dbus.service.Object):
        def __init__(self):
            super().__init__(dbus.service.BusName('org.kde.EasyWheelApp', bus=bus), '/App')
        @dbus.service.method('org.kde.EasyWheelApp', in_signature='s', out_signature='')
        def Report(self, val):
            result.append(str(val))
            loop.quit()

    rec = R()
    loop = GLib.MainLoop()
    js = "var win = workspace.activeWindow; var name = win ? (win.resourceClass || win.desktopFileName || win.resourceName || '') : ''; callDBus('org.kde.EasyWheelApp', '/App', 'org.kde.EasyWheelApp', 'Report', name);"
    scripting = dbus.Interface(bus.get_object('org.kde.KWin', '/Scripting'), 'org.kde.kwin.Scripting')
    with tempfile.NamedTemporaryFile(mode='w', suffix='.js', delete=False) as f:
        f.write(js)
        f_path = f.name
    try:
        script_id = scripting.loadScript(f_path)
        scripting.start()
        GLib.timeout_add(150, loop.quit)
        loop.run()
        if result and result[0]:
            print(result[0])
        scripting.unloadScript(f_path)
    finally:
        if os.path.exists(f_path): os.remove(f_path)
except Exception:
    pass
"#;

        let output = Command::new("python3")
            .arg("-c")
            .arg(python_cmd)
            .output()
            .ok()?;

        if output.status.success() {
            let res = String::from_utf8_lossy(&output.stdout).trim().to_string();
            let res_lower = res.to_ascii_lowercase();
            if !res.is_empty()
                && !res_lower.contains("easywheel")
                && !res_lower.contains("easywheel-host")
            {
                return Some(res);
            }
        }

        None
    }
}
