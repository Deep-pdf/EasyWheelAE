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

use crate::{config_manager::ConfigManager, input_manager::InputManager};

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

    // --- Configuration values added for dynamic hot-reload ---
    pub wheel_radius: f64,
    pub dead_zone_radius: f64,
    pub sector_count: u8,
    pub highlight_color: String,
    pub default_color: String,
    pub wheel_opacity: f64,

    /// Array of display labels for the active profile sectors.
    pub sector_labels: Vec<String>,
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
            wheel_radius: 120.0,
            dead_zone_radius: 40.0,
            sector_count: 8,
            highlight_color: "#FFFFFF33".to_string(),
            default_color: "#FFFFFF11".to_string(),
            wheel_opacity: 0.8,
            sector_labels: Vec::new(),
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

        // Read wheel geometry values from the runtime configuration.
        // ConfigManager::get() is a mutex clone — negligible at 60 Hz.
        let config = ConfigManager::get();
        let dead_zone_radius = config.global.dead_zone_radius;
        let sector_count = config.global.sector_count;

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

        let in_dead_zone = distance < dead_zone_radius;

        // Map angle to a sector index.
        // Each sector spans `360 / sector_count` degrees.  Adding half a
        // sector width before dividing centres sector 0 on 0° (East).
        let sector = if in_dead_zone {
            255u8
        } else {
            let sector_span = 360.0 / f64::from(sector_count);
            let half_span = sector_span / 2.0;
            ((angle_deg + half_span) / sector_span) as u8 % sector_count
        };

        // Record the current sector so ActionManager can read it at key-release
        // without needing to re-derive geometry.
        InputManager::set_last_sector(sector);

        // -------------------------------------------------------------------
        // Terminal debug output — only while tracking is active.
        // Never displayed in the overlay UI.
        // -------------------------------------------------------------------
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

        let exe = crate::foreground_application::ForegroundApplicationService::get_executable();
        let exe_lower = exe.to_ascii_lowercase();

        let matched_profile = config.profiles
            .iter()
            .find(|p| {
                p.executable
                    .split(',')
                    .any(|part| part.trim().eq_ignore_ascii_case(&exe_lower))
            })
            .or_else(|| {
                config.profiles.iter().find(|p| {
                    p.executable.to_ascii_lowercase() == "explorer.exe"
                })
            })
            .unwrap_or(&config.profiles[0]);

        let mut sector_labels = vec![String::new(); sector_count as usize];
        for i in 0..sector_count {
            if let Some(cmd) = matched_profile.sector_assignments.get(&i) {
                if cmd.label.is_empty() {
                    if let Some(action) = config.action_library.iter().find(|a| a.id == cmd.command_id) {
                        sector_labels[i as usize] = action.display_name.clone();
                    } else {
                        sector_labels[i as usize] = cmd.command_id.clone();
                    }
                } else {
                    sector_labels[i as usize] = cmd.label.clone();
                }
            }
        }

        GeometryState {
            origin_x: ptr.origin_x,
            origin_y: ptr.origin_y,
            angle_deg,
            distance,
            sector,
            in_dead_zone,
            active: true,
            wheel_radius: config.global.wheel_radius,
            dead_zone_radius: config.global.dead_zone_radius,
            sector_count: config.global.sector_count,
            highlight_color: config.global.highlight_color.clone(),
            default_color: config.global.default_color.clone(),
            wheel_opacity: config.global.wheel_opacity,
            sector_labels,
        }
    }
}
