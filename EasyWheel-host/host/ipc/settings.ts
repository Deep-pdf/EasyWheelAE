/**
 * settings.ts
 *
 * Typed IPC wrappers for all Phase 6 Settings commands.
 *
 * Each function is a thin async wrapper around `invoke()`. Command names
 * MUST match the `#[tauri::command]` function names registered in lib.rs.
 *
 * Error handling contract:
 * - `save_config` and `reload_config` reject with a user-readable string
 *   on validation or IO failure. Callers must surface these to the UI.
 * - `get_config` and `get_running_apps` always resolve (the Rust side
 *   returns safe defaults on failure).
 */

import { invoke } from '@tauri-apps/api/core';
import type { AppConfig, RunningApp } from '../settings/types';

/** Fetches the full current configuration from the Rust backend. */
export async function getConfig(): Promise<AppConfig> {
  return invoke<AppConfig>('get_config');
}

/**
 * Validates and persists a new configuration.
 * Rejects with a user-readable error string on validation failure.
 */
export async function saveConfig(config: AppConfig): Promise<void> {
  return invoke<void>('save_config', { config });
}

/**
 * Reloads the configuration from disk without frontend involvement.
 * Used by the tray "Reload Configuration" item and the Settings reload button.
 */
export async function reloadConfig(): Promise<void> {
  return invoke<void>('reload_config');
}

/** Returns a deduplicated, sorted list of currently running processes. */
export async function getRunningApps(): Promise<RunningApp[]> {
  return invoke<RunningApp[]>('get_running_apps');
}

/** Shows and focuses the Settings window. */
export async function openSettings(): Promise<void> {
  return invoke<void>('open_settings');
}
