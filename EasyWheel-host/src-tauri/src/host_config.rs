//! Centralised configuration for EasyWheel Host.
//!
//! This module is the single source of truth for all application-level
//! constants that control runtime behaviour.
//!
//! # Design Rule
//!
//! No other module may hardcode values that belong here. To reconfigure any
//! value, change it in this file only — every consumer reads from these
//! constants at compile time.

use rdev::Key;

// ---------------------------------------------------------------------------
// Input / activation
// ---------------------------------------------------------------------------

/// The modifier key that must be held before pressing `ACTIVATION_KEY`.
///
/// `HotkeyManager` tracks this key independently so it can distinguish a
/// deliberate chord from an accidental key press. Set to `Key::Alt` for the
/// standard left-Alt key. Right-Alt (`Key::AltGr`) is tracked separately.
pub const ACTIVATION_MODIFIER: Key = Key::Alt;

/// The trigger key that, when pressed while `ACTIVATION_MODIFIER` is held,
/// shows the EasyWheel overlay.
///
/// The overlay remains visible while this key is held. Releasing either
/// `ACTIVATION_KEY` or `ACTIVATION_MODIFIER` hides the overlay immediately.
pub const ACTIVATION_KEY: Key = Key::F1;

// ---------------------------------------------------------------------------
// Geometry / rendering constants (Phase 4)
// ---------------------------------------------------------------------------

/// Outer visual radius of the wheel in CSS pixels.
///
/// Consumed by `WheelRenderer` on the frontend to draw the outer arc of each
/// sector. Declared here as the canonical source of truth; the TypeScript
/// side mirrors it as a local constant. Not referenced in Rust business logic.
#[allow(dead_code)]
pub const WHEEL_RADIUS: f64 = 120.0;

/// Minimum cursor distance from the origin (in CSS pixels) before any sector
/// is considered active.
///
/// While `distance < DEAD_ZONE_RADIUS` the wheel renders no active highlight
/// and `GeometryState::in_dead_zone` is `true`. The frontend dead-zone circle
/// is drawn at this radius so the visual boundary matches the logical one.
pub const DEAD_ZONE_RADIUS: f64 = 40.0;

/// Number of equal sectors in the wheel.
///
/// Must be a positive divisor of 360. Changing this value automatically
/// adjusts sector angle in `GeometryManager` and in `WheelRenderer`
/// (both derive sector span as `360 / SECTOR_COUNT`).
pub const SECTOR_COUNT: u8 = 8;
