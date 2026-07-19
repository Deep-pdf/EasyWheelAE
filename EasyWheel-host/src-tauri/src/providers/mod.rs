pub mod provider;
pub mod windows_provider;
pub mod after_effects_provider;
pub mod photoshop_provider;

use std::sync::Arc;
use crate::provider_registry::global;

/// Registers all default command providers with the global registry.
pub fn register_defaults() {
    let mut registry = global().lock().unwrap_or_else(|e| e.into_inner());
    registry.register(Arc::new(windows_provider::WindowsProvider));
    registry.register(Arc::new(after_effects_provider::AfterEffectsProvider));
    registry.register(Arc::new(photoshop_provider::PhotoshopProvider));
    println!("[ProviderRegistry] Info: Default providers registered.");
}
