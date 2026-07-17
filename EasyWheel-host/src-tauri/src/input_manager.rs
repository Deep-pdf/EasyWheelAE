//! Mouse pointer tracking for EasyWheel Host.
//!
//! `InputManager` continuously samples the global cursor position while the
//! overlay is visible, computing delta and distance from the captured origin.
//!
//! # Threading model
//!
//! Tracking runs on a dedicated `input-tracker` thread that polls
//! `GetCursorPos` at approximately 60 Hz (16 ms sleep). The thread checks
//! `TRACKING` on each iteration and exits cleanly when `stop()` clears it.
//!
//! # Shared state
//!
//! `PointerState` is protected by a `Mutex` stored in a `OnceLock`, giving
//! a single initialisation with no global constructor overhead. The Tauri
//! command `get_pointer_state` locks, clones, and returns the state — the
//! lock is held only for a clone, so contention is negligible.
//!
//! # Coordinate system
//!
//! All coordinates are in physical screen pixels as returned by `GetCursorPos`.
//! The frontend is responsible for converting to window-local CSS pixels by
//! subtracting the window's physical position and dividing by `devicePixelRatio`.

use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Mutex, OnceLock};
use std::time::Duration;

use serde::Serialize;

#[cfg(target_os = "windows")]
use winapi::shared::windef::POINT;
#[cfg(target_os = "windows")]
use winapi::um::winuser::GetCursorPos;

// ---------------------------------------------------------------------------
// Public data model
// ---------------------------------------------------------------------------

/// Snapshot of pointer tracking data, serialised for the Tauri IPC layer.
///
/// All coordinates are physical screen pixels. Delta and distance are computed
/// relative to the origin captured at the moment tracking started.
///
/// `distance` is provided for debugging only and must not drive selection logic.
#[derive(Serialize, Clone, Default)]
pub struct PointerState {
    pub origin_x: f64,
    pub origin_y: f64,
    pub current_x: f64,
    pub current_y: f64,
    pub delta_x: f64,
    pub delta_y: f64,
    pub distance: f64,
    /// `true` while tracking is active. The frontend must not render visual
    /// elements when this is `false` to prevent flashing stale data from the
    /// previous session during the brief window between window show and the
    /// first fresh poll resolving.
    pub active: bool,
}

// ---------------------------------------------------------------------------
// Module-level state
// ---------------------------------------------------------------------------

/// Shared pointer state, initialised on first use.
static STATE: OnceLock<Mutex<PointerState>> = OnceLock::new();

/// Set to `true` while the tracker thread should keep running.
/// Cleared by `stop()` to signal a clean exit.
static TRACKING: AtomicBool = AtomicBool::new(false);

// ---------------------------------------------------------------------------
// InputManager
// ---------------------------------------------------------------------------

/// Manages the mouse tracking lifecycle.
///
/// `InputManager` is a unit struct — all state is held in module-level statics
/// so the tracker thread can access it without capturing a `self` reference.
///
/// # Responsibilities
///
/// - **`start`**: Capture origin, initialise state, spawn tracker thread.
/// - **`stop`**: Signal the tracker thread to exit.
/// - **`get_state`**: Return a snapshot of the current `PointerState`.
///
/// # Out of Scope
///
/// Angle calculation, direction detection, sector resolution, and action
/// dispatch are explicitly excluded from this module.
pub struct InputManager;

impl InputManager {
    /// Returns the module-level shared state, initialising it on first call.
    fn state() -> &'static Mutex<PointerState> {
        STATE.get_or_init(|| Mutex::new(PointerState::default()))
    }

    /// Begins pointer tracking.
    ///
    /// Reads the current cursor position as the **origin**, resets all derived
    /// fields, and spawns the tracker thread. Safe to call multiple times —
    /// if tracking is already active this is a no-op.
    pub fn start() {
        // Guard: do not spawn a second tracker if one is already running.
        if TRACKING.load(Ordering::Relaxed) {
            return;
        }

        let origin = Self::read_cursor().unwrap_or_else(|| {
            eprintln!(
                "[EasyWheel Host] Warning: Could not read cursor position for origin. \
                 Using (0, 0)."
            );
            (0.0, 0.0)
        });

        // Initialise shared state with the captured origin.
        {
            let mut guard = Self::state().lock().unwrap_or_else(|e| e.into_inner());
            *guard = PointerState {
                origin_x: origin.0,
                origin_y: origin.1,
                current_x: origin.0,
                current_y: origin.1,
                delta_x: 0.0,
                delta_y: 0.0,
                distance: 0.0,
                active: true,
            };
        }

        println!(
            "[EasyWheel Host] Info: Tracking started. Origin captured at ({:.0}, {:.0}).",
            origin.0, origin.1
        );

        TRACKING.store(true, Ordering::Relaxed);

        match std::thread::Builder::new()
            .name("input-tracker".into())
            .spawn(Self::run_tracker)
        {
            Ok(_) => {}
            Err(e) => {
                eprintln!(
                    "[EasyWheel Host] Error: Failed to spawn input-tracker thread — {e}. \
                     Pointer tracking will be unavailable."
                );
                TRACKING.store(false, Ordering::Relaxed);
            }
        }
    }

    /// Stops pointer tracking.
    ///
    /// Clears `TRACKING`. The tracker thread exits on its next loop iteration.
    /// Also marks STATE as inactive so the frontend suppresses rendering until
    /// the next `start()` call delivers fresh data.
    pub fn stop() {
        TRACKING.store(false, Ordering::Relaxed);
        // Mark inactive immediately so the frontend's next poll returns
        // active: false and stops rendering before the window hides.
        let mut guard = Self::state().lock().unwrap_or_else(|e| e.into_inner());
        guard.active = false;
        println!("[EasyWheel Host] Info: Tracking stopped.");
    }

    /// Returns a snapshot clone of the current `PointerState`.
    ///
    /// Called by the `get_pointer_state` Tauri command on the main thread.
    /// The mutex is held only for a `clone()`, so this is effectively wait-free
    /// under any realistic workload.
    pub fn get_state() -> PointerState {
        Self::state()
            .lock()
            .unwrap_or_else(|e| e.into_inner())
            .clone()
    }

    /// Main body of the `input-tracker` thread.
    ///
    /// Polls `GetCursorPos` at ~60 Hz. On each iteration:
    /// 1. Checks `TRACKING` — exits if cleared.
    /// 2. Reads the current cursor position.
    /// 3. Updates `current`, `delta`, and `distance` in shared state.
    /// 4. Sleeps for 16 ms to maintain the ~60 Hz cadence.
    fn run_tracker() {
        while TRACKING.load(Ordering::Relaxed) {
            match Self::read_cursor() {
                Some((x, y)) => {
                    let mut guard = Self::state().lock().unwrap_or_else(|e| e.into_inner());
                    let dx = x - guard.origin_x;
                    let dy = y - guard.origin_y;
                    guard.current_x = x;
                    guard.current_y = y;
                    guard.delta_x = dx;
                    guard.delta_y = dy;
                    guard.distance = (dx * dx + dy * dy).sqrt();
                }
                None => {
                    eprintln!(
                        "[EasyWheel Host] Warning: GetCursorPos failed during tracking. \
                         Skipping frame."
                    );
                }
            }

            std::thread::sleep(Duration::from_millis(16));
        }
    }

    /// Reads the current global cursor position in physical screen pixels.
    ///
    /// Returns `None` if the system call fails (e.g., insufficient permissions).
    /// Callers must treat `None` as a transient, non-fatal condition.
    #[cfg(target_os = "windows")]
    fn read_cursor() -> Option<(f64, f64)> {
        let mut pt = POINT { x: 0, y: 0 };
        // Safety: `pt` is a valid, stack-allocated POINT initialised to zero.
        // `GetCursorPos` writes the cursor coordinates into it and returns
        // a non-zero value on success, zero on failure.
        let ok = unsafe { GetCursorPos(&mut pt) };
        if ok != 0 {
            Some((pt.x as f64, pt.y as f64))
        } else {
            None
        }
    }

    /// Stub implementation for non-Windows build targets.
    #[cfg(not(target_os = "windows"))]
    fn read_cursor() -> Option<(f64, f64)> {
        Some((0.0, 0.0))
    }
}
