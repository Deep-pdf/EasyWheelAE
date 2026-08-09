#[cfg(target_os = "windows")]
use winapi::shared::windef::HWND;
#[cfg(target_os = "windows")]
use winapi::um::winuser::{EnumWindows, GetClassNameW, GetWindowTextW, IsWindowVisible};

#[cfg(target_os = "windows")]
struct State {
    all_windows: Vec<(HWND, String, String)>,
}

#[cfg(target_os = "windows")]
unsafe extern "system" fn enum_callback(
    hwnd: HWND,
    lparam: winapi::shared::minwindef::LPARAM,
) -> winapi::shared::minwindef::BOOL {
    let state = &mut *(lparam as *mut State);
    if IsWindowVisible(hwnd) != 0 {
        let mut class_buf = vec![0u16; 256];
        let len = GetClassNameW(hwnd, class_buf.as_mut_ptr(), class_buf.len() as i32);
        if len > 0 {
            let class_str = String::from_utf16_lossy(&class_buf[..len as usize]);

            let mut title_buf = vec![0u16; 512];
            let title_len = GetWindowTextW(hwnd, title_buf.as_mut_ptr(), title_buf.len() as i32);
            let title_str = String::from_utf16_lossy(&title_buf[..title_len as usize]);

            state.all_windows.push((hwnd, class_str, title_str));
        }
    }
    1
}

#[cfg(target_os = "windows")]
fn main() {
    println!("=== EASYWHEEL DIAGNOSE START ===");

    #[link(name = "ole32")]
    extern "system" {
        fn CoInitialize(pvReserved: *mut std::ffi::c_void) -> i32;
    }
    unsafe {
        let _ = CoInitialize(std::ptr::null_mut());
    }

    let mut state = State {
        all_windows: Vec::new(),
    };
    unsafe {
        EnumWindows(Some(enum_callback), &mut state as *mut State as _);
    }

    println!("Total visible windows: {}", state.all_windows.len());
    println!("\nVisible windows containing 'Chrome' or having class 'Chrome_WidgetWin_1':");

    for (hwnd, class_str, title_str) in &state.all_windows {
        if class_str.contains("Chrome")
            || title_str.contains("Chrome")
            || title_str.contains("Google")
        {
            println!(
                "  HWND: {:?}, Class: '{}', Title: '{}'",
                hwnd, class_str, title_str
            );
        }
    }

    println!("\n=== DIAGNOSE END ===");
}

#[cfg(not(target_os = "windows"))]
fn main() {
    println!("diagnose tool is only supported on Windows.");
}
