import { Command } from '../bridge/registry';
import { Logger } from '../bridge/logger';
import { jsxExecutor } from '../bridge/jsx_executor';

/**
 * Parent command implementation.
 */
export const parentCommand: Command = {
  id: 'parent',
  execute: async (_parameters: any, _profile: string) => {
    Logger.info('parent', 'Executing parent on ExtendScript engine...');
    const res = await jsxExecutor.execute('EasyWheel.execute("parent")');
    return {
      success: res.success && res.result === 'OK',
      message: res.result === 'OK' ? 'parent executed successfully.' : (res.result || res.message || 'Execution failed.')
    };
  }
};
