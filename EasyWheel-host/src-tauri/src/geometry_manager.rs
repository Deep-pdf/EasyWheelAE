//! Geometry engine for EasyWheel Host.
//!
//! `GeometryManager` transforms raw pointer coordinates from `InputManager`
//! into semantic geometry: angle, distance, sector index, and dead-zone
//! status. It is the sole module permitted to perform trigonometric or
//! sector-mapping calculations.
//!
//! # Responsibilities
//!
//! - Read the current `PointerState` from `InputManager`.
//! - Compute delta X / delta Y / distance / angle using `atan2`.
//! - Normalise the angle into the 0°–360° range.
//! - Map the angle to one of `SECTOR_COUNT` equal sectors.
//! - Determine whether the cursor is within the dead zone.
//! - Emit a `GeometryState` snapshot for the Tauri IPC layer.
//! - Print debug telemetry to the terminal while tracking is active.
//!
//! # Out of Scope
//!
//! This module never performs rendering, manages windows, or modifies any
//! shared state. It is a pure function: same inputs → same outputs.
//!
//! # Sector Mapping
//!
//! With `SECTOR_COUNT = 8` each sector spans 45°. Sector 0 is centred on
//! East (0° / rightward), and sectors advance clockwise:
//!
//! ```text
//!   Index │ Centre │ Range
//!   ──────┼────────┼──────────────
//!     0   │   0°   │ 337.5°–22.5°   (Right)
//!     1   │  45°   │  22.5°–67.5°   (Bottom-Right)
//!     2   │  90°   │  67.5°–112.5°  (Bottom)
//!     3   │ 135°   │ 112.5°–157.5°  (Bottom-Left)
//!     4   │ 180°   │ 157.5°–202.5°  (Left)
//!     5   │ 225°   │ 202.5°–247.5°  (Top-Left)
//!     6   │ 270°   │ 247.5°–292.5°  (Top)
//!     7   │ 315°   │ 292.5°–337.5°  (Top-Right)
//! ```
//!
//! The sentinel value `255` for `sector` signals "no active sector" (dead zone).

use serde::Serialize;

use crate::{host_config, input_manager::InputManager};

// ---------------------------------------------------------------------------
// Public data model
// ---------------------------------------------------------------------------

/// Snapshot of all geometry derived from the current pointer position.
///
/// Serialised automatically by Tauri for delivery to the frontend via the
/// `get_geometry_state` command. Field names use `snake_case` to match the
/// existing `PointerState` convention; the TypeScript consumer accesses them
/// as-is without renaming.
#[derive(Serialize, Clone)]
pub struct GeometryState {
    /// Screen X of the captured origin, in physical pixels.
    /// Forwarded from `PointerState` so the frontend can centre the wheel
    /// without needing a second `get_pointer_state` IPC call.
    pub origin_x: f64,
    /// Screen Y of the captured origin, in physical pixels.
    pub origin_y: f64,

    /// Normalised cursor angle relative to the origin, in degrees (0°–360°).
    /// 0° = East, advancing clockwise. `0.0` when in the dead zone.
    pub angle_deg: f64,

    /// Euclidean distance from the origin to the current cursor position,
    /// in physical screen pixels.
    pub distance: f64,

    /// Index of the currently active sector (0–7).
    /// Set to `255` when `in_dead_zone` is `true` — a sentinel chosen to
    /// be out of range so the frontend can distinguish it without a separate
    /// boolean check in the render loop.
    pub sector: u8,

    /// `true` when the cursor is within `DEAD_ZONE_RADIUS` of the origin.
    /// The frontend suppresses all sector highlighting while this is `true`.
    pub in_dead_zone: bool,

    /// Mirrors `InputManager::PointerState::active`. `false` between tracking
    /// sessions so the frontend can suppress the wheel render before the first
    /// fresh `start()` call populates the state.
    pub active: bool,
}

impl Default for GeometryState {
    fn default() -> Self {
        Self {
            origin_x: 0.0,
            origin_y: 0.0,
            angle_deg: 0.0,
            distance: 0.0,
            sector: 255,
            in_dead_zone: true,
            active: false,
        }
    }
}

// ---------------------------------------------------------------------------
// GeometryManager
// ---------------------------------------------------------------------------

/// Computes wheel geometry from the current pointer tracking state.
///
/// `GeometryManager` is a unit struct — it holds no instance state. Every
/// call to `compute` reads a fresh snapshot from `InputManager`, performs
/// pure arithmetic, and returns the result.
pub struct GeometryManager;

impl GeometryManager {
    /// Derives the current `GeometryState` from `InputManager`.
    ///
    /// Returns a zeroed default when tracking is inactive so the frontend
    /// receives a well-defined, safe value during the brief window between
    /// a session ending and the overlay hiding.
    ///
    /// This function never panics. All arithmetic uses IEEE 754 `f64` with
    /// no division by zero (atan2 handles the `(0, 0)` case by convention).
    pub fn compute() -> GeometryState {
        let ptr = InputManager::get_state();

        // Return a safe default while tracking is stopped. This path is hit
        // during the brief window between key-release and window.hide().
        if !ptr.active {
            return GeometryState::default();
        }

        let dx = ptr.delta_x;
        let dy = ptr.delta_y;
        let distance = ptr.distance;

        // atan2(y, x) returns radians in −π..+π.  Convert to degrees and
        // shift into 0°–360° so sector indexing arithmetic is uniform.
        let angle_rad = dy.atan2(dx);
        let angle_deg_raw = angle_rad.to_degrees();
        let angle_deg = if angle_deg_raw < 0.0 {
            angle_deg_raw + 360.0
        } else {
            angle_deg_raw
        };

        let in_dead_zone = distance < host_config::DEAD_ZONE_RADIUS;

        // Map angle to a sector index.
        // Each sector spans `360 / SECTOR_COUNT` degrees.  Adding half a
        // sector width before dividing centres sector 0 on 0° (East).
        let sector = if in_dead_zone {
            255u8
        } else {
            let sector_span = 360.0 / f64::from(host_config::SECTOR_COUNT);
            let half_span = sector_span / 2.0;
            ((angle_deg + half_span) / sector_span) as u8 % host_config::SECTOR_COUNT
        };

        // ---------------------------------------------------------------
        // Terminal debug output — only while tracking is active.
        // Never displayed in the overlay UI.
        // ---------------------------------------------------------------
        println!(
            "[EasyWheel] Geometry | Origin({:.0},{:.0}) → Current({:.0},{:.0}) \
             | Dist:{:.1}px | Angle:{:.1}° | Sector:{} | DeadZone:{}",
            ptr.origin_x,
            ptr.origin_y,
            ptr.current_x,
            ptr.current_y,
            distance,
            angle_deg,
            if in_dead_zone {
                "—".to_string()
            } else {
                sector.to_string()
            },
            in_dead_zone,
        );

        GeometryState {
            origin_x: ptr.origin_x,
            origin_y: ptr.origin_y,
            angle_deg,
            distance,
            sector,
            in_dead_zone,
            active: true,
        }
    }
}
