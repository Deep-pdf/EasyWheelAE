import { Command } from '../command_registry';

/**
 * Placeholder implementation of duplicate_layer command.
 */
export const duplicateLayerCommand: Command = {
  id: 'duplicate_layer',
  execute: async (_parameters: any, _profile: string) => {
    console.log('Received duplicate_layer');
    return {
      success: true,
      message: 'duplicate_layer executed successfully.'
    };
  }
};
