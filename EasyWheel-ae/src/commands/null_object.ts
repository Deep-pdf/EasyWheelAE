import { Command } from '../bridge/registry';
import { Logger } from '../bridge/logger';
import { jsxExecutor } from '../bridge/jsx_executor';

/**
 * Null object command implementation.
 */
export const nullObjectCommand: Command = {
  id: 'null_object',
  execute: async (_parameters: any, _profile: string) => {
    Logger.info('null_object', 'Executing null_object on ExtendScript engine...');
    const res = await jsxExecutor.execute('EasyWheel.execute("null_object")');
    return {
      success: res.success && res.result === 'OK',
      message: res.result === 'OK' ? 'null_object executed successfully.' : (res.result || res.message || 'Execution failed.')
    };
  }
};
