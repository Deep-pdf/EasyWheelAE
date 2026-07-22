import { Command } from '../bridge/registry';
import { Logger } from '../bridge/logger';

/**
 * Placeholder implementation of null_object command.
 */
export const nullObjectCommand: Command = {
  id: 'null_object',
  execute: async (_parameters: any, _profile: string) => {
    Logger.info('null_object', 'Received null_object');
    return {
      success: true,
      message: 'null_object executed successfully.'
    };
  }
};
