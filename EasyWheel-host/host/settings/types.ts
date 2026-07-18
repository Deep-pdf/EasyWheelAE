/**
 * types.ts
 *
 * TypeScript mirror types for all EasyWheel Rust data structures.
 * These types match the serde serialisation of the Rust models exactly.
 *
 * Rules:
 * - Field names use snake_case to match the Rust serde output.
 * - Optional fields that may be absent in JSON use `T | null`.
 * - sector_assignments uses Record<string, string> because JSON object keys
 *   are always strings even when the Rust side uses HashMap<u8, String>.
 *   Access by sector index: `profile.sector_assignments[sectorIndex.toString()]`
 */

// ---------------------------------------------------------------------------
// AppConfig hierarchy
// ---------------------------------------------------------------------------

export interface GlobalSettings {
  /** rdev key name, e.g. "Alt", "ShiftLeft" */
  activation_modifier: string;
  /** rdev key name, e.g. "F1", "Space" */
  activation_key: string;
  /** Outer wheel radius in CSS pixels */
  wheel_radius: number;
  /** Dead zone radius in CSS pixels */
  dead_zone_radius: number;
  /** Number of equal sectors (must divide 360) */
  sector_count: number;
  /** CSS hex colour for the highlighted sector, e.g. "#FFFFFF33" */
  highlight_color: string;
  /** CSS hex colour for inactive sectors, e.g. "#FFFFFF11" */
  default_color: string;
  /** Opacity of the wheel overlay (0.0 to 1.0) */
  wheel_opacity: number;
}

export interface Profile {
  name: string;
  /** Executable filename, e.g. "AfterFX.exe" */
  executable: string;
  /** Maps sector index (as string) → action ID */
  sector_assignments: Record<string, string>;
}

export interface ActionDefinition {
  id: string;
  display_name: string;
  description: string;
  category: string;
  icon: string | null;
  shortcut: string | null;
  parameters: unknown | null;
}

export interface AppConfig {
  schema_version: number;
  global: GlobalSettings;
  profiles: Profile[];
  action_library: ActionDefinition[];
}

// ---------------------------------------------------------------------------
// Running application (get_running_apps command)
// ---------------------------------------------------------------------------

export interface RunningApp {
  name: string;
  executable: string;
  path: string;
}

// ---------------------------------------------------------------------------
// UI types — not serialised to Rust
// ---------------------------------------------------------------------------

/** Pages available in the Settings sidebar. */
export type SettingsPage = 'general' | 'profiles' | 'actions' | 'appearance' | 'about';

/** Validation result surfaced to the user. */
export interface ValidationError {
  field?: string;
  message: string;
}
