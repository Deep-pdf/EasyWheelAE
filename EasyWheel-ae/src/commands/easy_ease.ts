import { Command } from '../bridge/registry';
import { Logger } from '../bridge/logger';
import { jsxExecutor } from '../bridge/jsx_executor';

/**
 * Easy ease command implementation.
 */
export const easyEaseCommand: Command = {
  id: 'easy_ease',
  execute: async (_parameters: any, _profile: string) => {
    Logger.info('easy_ease', 'Executing easy_ease on ExtendScript engine...');
    const res = await jsxExecutor.execute('EasyWheel.execute("easy_ease")');
    return {
      success: res.success && res.result === 'OK',
      message: res.result === 'OK' ? 'easy_ease executed successfully.' : (res.result || res.message || 'Execution failed.')
    };
  }
};
