import { Command } from '../bridge/registry';
import { Logger } from '../bridge/logger';
import { jsxExecutor } from '../bridge/jsx_executor';

/**
 * Command handler to execute native After Effects menu commands by their numeric ID.
 */
export const executeNativeCommand: Command = {
  id: 'execute_native_command',
  execute: async (parameters: any, _profile: string) => {
    const commandId = parameters.commandId;
    
    if (typeof commandId !== 'number') {
      Logger.error('execute_native_command', 'Failed to execute: missing or invalid commandId parameter.');
      return {
        success: false,
        message: 'Invalid command ID.',
        errorCode: 'invalid_command_id'
      };
    }

    Logger.info('execute_native_command', `Executing app.executeCommand(${commandId}) on ExtendScript engine...`);
    const res = await jsxExecutor.execute(`app.executeCommand(${commandId})`);
    
    return {
      success: res.success,
      message: res.success ? `Command ID ${commandId} executed successfully.` : `Unable to execute command.`
    };
  }
};
