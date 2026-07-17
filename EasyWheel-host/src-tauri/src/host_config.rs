//! Centralised configuration for EasyWheel Host.
//!
//! This module is the single source of truth for all application-level
//! constants that control runtime behaviour.
//!
//! # Design Rule
//!
//! No other module may hardcode values that belong here.
//! To reconfigure the activation key, change `ACTIVATION_KEY` in this file
//! only — every consumer reads from this constant at compile time.

use rdev::Key;

/// The physical key that activates the EasyWheel overlay.
///
/// `HotkeyManager` reads this value to register the global listener.
/// The value is intentionally a compile-time constant so that a future
/// user-configurable key can replace it via a settings-backed mechanism
/// without touching `HotkeyManager` at all.
///
/// # Development key
///
/// `Key::Tab` is used during Phase 3 development. A modifier-free key is
/// chosen deliberately to verify that the low-level hook system works without
/// requiring the user to hold an additional modifier while testing.
pub const ACTIVATION_KEY: Key = Key::Tab;
