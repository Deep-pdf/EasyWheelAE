use std::sync::atomic::{AtomicU64, Ordering};
use std::time::{SystemTime, UNIX_EPOCH};

/// Current supported protocol version.
pub const PROTOCOL_VERSION: u32 = 1;

/// Generates a unique request ID.
pub fn generate_request_id() -> String {
    static COUNTER: AtomicU64 = AtomicU64::new(0);
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_nanos())
        .unwrap_or(0);
    let count = COUNTER.fetch_add(1, Ordering::SeqCst);
    format!("{:x}-{:x}", now, count)
}

/// Formats the current time in ISO8601 format.
#[cfg(target_os = "windows")]
pub fn get_iso8601_timestamp() -> String {
    use winapi::um::sysinfoapi::GetSystemTime;
    use winapi::um::minwinbase::SYSTEMTIME;

    let mut st = SYSTEMTIME {
        wYear: 0,
        wMonth: 0,
        wDayOfWeek: 0,
        wDay: 0,
        wHour: 0,
        wMinute: 0,
        wSecond: 0,
        wMilliseconds: 0,
    };
    unsafe {
        GetSystemTime(&mut st);
    }
    format!(
        "{:04}-{:02}-{:02}T{:02}:{:02}:{:02}.{:03}Z",
        st.wYear, st.wMonth, st.wDay, st.wHour, st.wMinute, st.wSecond, st.wMilliseconds
    )
}

#[cfg(not(target_os = "windows"))]
pub fn get_iso8601_timestamp() -> String {
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default();
    let secs = now.as_secs();
    let ms = now.subsec_millis();
    format!("timestamp-{}", secs * 1000 + ms as u64)
}
