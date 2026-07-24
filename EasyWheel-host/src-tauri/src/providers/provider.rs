use crate::models::command_context::CommandContext;

/// Trait defining the interface for command providers.
///
/// Any backend execution provider must implement this trait to handle resolved action IDs.
pub trait CommandProvider: Send + Sync {
    /// Checks if this provider is capable of executing the given action ID under the active profile.
    fn can_execute(&self, action_id: &str, profile: &str) -> bool;

    /// Executes the action described by the command context.
    fn execute(&self, context: &CommandContext) -> Result<(), String>;

    /// Returns the programmer-friendly name of the provider.
    fn provider_name(&self) -> &'static str;

    /// Returns the list of action IDs supported by this provider.
    fn supported_actions(&self) -> Vec<&'static str>;
}
