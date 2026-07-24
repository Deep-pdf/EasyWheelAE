use std::sync::{Arc, Mutex, OnceLock};
use crate::providers::provider::CommandProvider;

/// Global provider registry instance.
static REGISTRY: OnceLock<Mutex<ProviderRegistry>> = OnceLock::new();

/// Returns a reference to the global `ProviderRegistry` instance.
pub fn global() -> &'static Mutex<ProviderRegistry> {
    REGISTRY.get_or_init(|| Mutex::new(ProviderRegistry::new()))
}

/// A registry that holds references to all registered command providers.
pub struct ProviderRegistry {
    providers: Vec<Arc<dyn CommandProvider>>,
}

impl ProviderRegistry {
    /// Creates a new empty `ProviderRegistry`.
    pub fn new() -> Self {
        Self {
            providers: Vec::new(),
        }
    }

    /// Registers a provider with the registry.
    pub fn register(&mut self, provider: Arc<dyn CommandProvider>) {
        if !self.providers.iter().any(|p| p.provider_name() == provider.provider_name()) {
            self.providers.push(provider);
        }
    }

    /// Removes a provider from the registry by its name.
    #[allow(dead_code)]
    pub fn remove(&mut self, name: &str) {
        self.providers.retain(|p| p.provider_name() != name);
    }

    /// Finds a provider that is capable of executing the given action ID under the active profile.
    pub fn find_by_action(&self, action_id: &str, profile: &str) -> Option<Arc<dyn CommandProvider>> {
        self.providers
            .iter()
            .find(|p| p.can_execute(action_id, profile))
            .cloned()
    }
}
