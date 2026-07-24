import { Command } from '../bridge/registry';
import { Logger } from '../bridge/logger';
import { jsxExecutor } from '../bridge/jsx_executor';

/**
 * Pre-compose command implementation.
 */
export const preComposeCommand: Command = {
  id: 'pre_compose',
  execute: async (_parameters: any, _profile: string) => {
    Logger.info('pre_compose', 'Executing pre_compose on ExtendScript engine...');
    const res = await jsxExecutor.execute('EasyWheel.execute("pre_compose")');
    return {
      success: res.success,
      message: res.result === 'OK' ? 'pre_compose executed successfully.' : (res.message || 'Execution failed.')
    };
  }
};
