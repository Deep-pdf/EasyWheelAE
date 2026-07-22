import { Command } from '../bridge/registry';

/**
 * Implementation of the ping command for heartbeats and connection validation.
 */
export const pingCommand: Command = {
  id: 'ping',
  execute: async (_parameters: any, _profile: string) => {
    return {
      success: true,
      message: 'Bridge Alive'
    };
  }
};
