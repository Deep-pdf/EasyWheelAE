/**
 * events.ts
 *
 * Defines the typed event contract for backend-to-frontend Tauri events.
 *
 * Conventions (Phase 2+):
 * - Each event name is a string constant to prevent typos at call sites.
 * - Event payload types are defined as TypeScript interfaces.
 * - Subscribers use `@tauri-apps/api/event` `listen()` with the typed payload.
 */
