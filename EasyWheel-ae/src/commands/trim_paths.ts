import { Command } from '../bridge/registry';
import { Logger } from '../bridge/logger';
import { jsxExecutor } from '../bridge/jsx_executor';

/**
 * Trim paths command implementation.
 */
export const trimPathsCommand: Command = {
  id: 'trim_paths',
  execute: async (_parameters: any, _profile: string) => {
    Logger.info('trim_paths', 'Executing trim_paths on ExtendScript engine...');
    const res = await jsxExecutor.execute('EasyWheel.execute("trim_paths")');
    return {
      success: res.success && res.result === 'OK',
      message: res.result === 'OK' ? 'trim_paths executed successfully.' : (res.result || res.message || 'Execution failed.')
    };
  }
};
