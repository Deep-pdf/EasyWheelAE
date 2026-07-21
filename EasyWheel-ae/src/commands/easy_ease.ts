import { Command } from '../command_registry';

/**
 * Placeholder implementation of easy_ease command.
 */
export const easyEaseCommand: Command = {
  id: 'easy_ease',
  execute: async (_parameters: any, _profile: string) => {
    console.log('Received easy_ease');
    return {
      success: true,
      message: 'easy_ease executed successfully.'
    };
  }
};
