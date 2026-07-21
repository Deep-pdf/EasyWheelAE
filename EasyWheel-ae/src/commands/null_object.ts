import { Command } from '../command_registry';

/**
 * Placeholder implementation of null_object command.
 */
export const nullObjectCommand: Command = {
  id: 'null_object',
  execute: async (_parameters: any, _profile: string) => {
    console.log('Received null_object');
    return {
      success: true,
      message: 'null_object executed successfully.'
    };
  }
};
