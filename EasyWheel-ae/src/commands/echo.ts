import { Command } from '../bridge/registry';

/**
 * Implementation of the echo command, returning the received payload parameters for debugging.
 */
export const echoCommand: Command = {
  id: 'echo',
  execute: async (parameters: any, _profile: string) => {
    return {
      success: true,
      message: JSON.stringify(parameters)
    };
  }
};
