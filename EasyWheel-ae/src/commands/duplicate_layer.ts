import { Command } from '../bridge/registry';
import { Logger } from '../bridge/logger';
import { jsxExecutor } from '../bridge/jsx_executor';

/**
 * Duplicate layer command implementation.
 */
export const duplicateLayerCommand: Command = {
  id: 'duplicate_layer',
  execute: async (_parameters: any, _profile: string) => {
    Logger.info('duplicate_layer', 'Executing duplicate_layer on ExtendScript engine...');
    const res = await jsxExecutor.execute('EasyWheel.execute("duplicate_layer")');
    return {
      success: res.success && res.result === 'OK',
      message: res.result === 'OK' ? 'duplicate_layer executed successfully.' : (res.result || res.message || 'Execution failed.')
    };
  }
};
