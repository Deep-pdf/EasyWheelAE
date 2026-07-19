import type { AppConfig, ConfiguredCommand } from '../types';

/**
 * Resolves a sector assignment value into a full ConfiguredCommand object.
 * Returns null if the sector has no assignment.
 */
export function getSectorCommand(
  sectorAssignments: Record<string, string | ConfiguredCommand | undefined>,
  sector: number
): ConfiguredCommand | null {
  const val = sectorAssignments[sector.toString()];
  if (!val) return null;
  if (typeof val === 'string') {
    return { command_id: val, parameters: {} };
  }
  return val;
}

/**
 * Computes a human-readable display name for any command/action.
 */
export function getCommandDisplayName(
  cmd: ConfiguredCommand | null,
  config: AppConfig
): string {
  if (!cmd) return 'Unassigned';
  
  // Try looking it up in the action library first
  const legacy = config.action_library.find((a) => a.id === cmd.command_id);
  if (legacy) return legacy.display_name;

  switch (cmd.command_id) {
    case 'launch_app': return 'Launch Application';
    case 'open_website': return 'Open Website';
    case 'open_folder': return 'Open Folder';
    case 'open_file': return 'Open File';
    case 'run_script': return 'Run Script';
    case 'send_shortcut': return 'Send Shortcut';
    case 'after_effects_command': return 'After Effects Command';
    case 'photoshop_command': return 'Photoshop Command';
    default: return cmd.command_id;
  }
}

/**
 * Computes a human-readable description summarizing the command parameters.
 */
export function getCommandDescription(
  cmd: ConfiguredCommand | null,
  config: AppConfig
): string {
  if (!cmd) return 'No command assigned to this sector.';
  
  const legacy = config.action_library.find((a) => a.id === cmd.command_id);
  if (legacy) return legacy.description;

  const p = cmd.parameters || {};
  switch (cmd.command_id) {
    case 'launch_app':
      return `Launch: ${p.path || 'Not Configured'} ${p.arguments || ''}`;
    case 'open_website':
      return `URL: ${p.url || 'Not Configured'} (${p.browser || 'default'})`;
    case 'open_folder':
      return `Folder: ${p.path || 'Not Configured'}`;
    case 'open_file':
      return `File: ${p.path || 'Not Configured'}`;
    case 'run_script':
      return `Script: ${p.path || 'Not Configured'} ${p.arguments || ''}`;
    case 'send_shortcut':
      return `Keys: ${Array.isArray(p.keys) ? p.keys.join(' + ') : 'None'}`;
    case 'after_effects_command':
      return `AE Command: ${p.command || 'Not Configured'}`;
    case 'photoshop_command':
      return `PS Command: ${p.command || 'Not Configured'}`;
    default:
      return 'Custom parameterized command.';
  }
}
