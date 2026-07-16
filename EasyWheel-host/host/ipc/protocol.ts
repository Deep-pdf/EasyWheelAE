/**
 * protocol.ts
 *
 * Defines the typed IPC command protocol between the React frontend
 * and the Rust Tauri backend.
 *
 * Conventions (Phase 2+):
 * - Each Tauri command is represented as a typed async function wrapper.
 * - Command names must exactly match the `#[tauri::command]` identifiers
 *   registered in `src-tauri/src/lib.rs`.
 * - All payloads must be serialisable via `serde` on the Rust side.
 */
