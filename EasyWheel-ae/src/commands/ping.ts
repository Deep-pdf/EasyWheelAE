import { Command } from '../command_registry';

/**
 * Implementation of the ping command for heartbeats and connection validation.
 */
export const pingCommand: Command = {
  id: 'ping',
  execute: async (_parameters: any, _profile: string) => {
    return {
      success: true,
      message: 'AE Bridge Alive'
    };
  }
};
