//! Data model types for EasyWheel Host — Phase 5.
//!
//! This module acts as the root for all serialisable data structures that
//! cross module boundaries or persist to disk. No business logic lives here.
//!
//! Sub-modules:
//!
//! - [`action`]  — [`ActionDefinition`]: a single registered action.
//! - [`profile`] — [`Profile`]: per-application sector assignment map.
//! - [`config`]  — [`AppConfig`] / [`GlobalSettings`]: full config schema.

pub mod action;
pub mod config;
pub mod profile;
