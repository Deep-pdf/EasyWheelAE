"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.graphEditorCommand = void 0;
const logger_1 = require("../bridge/logger");
const jsx_executor_1 = require("../bridge/jsx_executor");
/**
 * Graph editor command implementation.
 */
exports.graphEditorCommand = {
    id: 'graph_editor',
    execute: async (_parameters, _profile) => {
        logger_1.Logger.info('graph_editor', 'Executing graph_editor on ExtendScript engine...');
        const res = await jsx_executor_1.jsxExecutor.execute('EasyWheel.execute("graph_editor")');
        return {
            success: res.success && res.result === 'OK',
            message: res.result === 'OK' ? 'graph_editor executed successfully.' : (res.result || res.message || 'Execution failed.')
        };
    }
};
