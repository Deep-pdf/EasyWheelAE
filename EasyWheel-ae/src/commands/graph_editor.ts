import { Command } from '../bridge/registry';
import { Logger } from '../bridge/logger';
import { jsxExecutor } from '../bridge/jsx_executor';

/**
 * Graph editor command implementation.
 */
export const graphEditorCommand: Command = {
  id: 'graph_editor',
  execute: async (_parameters: any, _profile: string) => {
    Logger.info('graph_editor', 'Executing graph_editor on ExtendScript engine...');
    const res = await jsxExecutor.execute('EasyWheel.execute("graph_editor")');
    return {
      success: res.success && res.result === 'OK',
      message: res.result === 'OK' ? 'graph_editor executed successfully.' : (res.result || res.message || 'Execution failed.')
    };
  }
};
