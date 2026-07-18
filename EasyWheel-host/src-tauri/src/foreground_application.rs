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

        #[cfg(not(target_os = "windows"))]
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
}
