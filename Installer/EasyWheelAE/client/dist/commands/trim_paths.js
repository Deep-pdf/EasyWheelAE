"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.trimPathsCommand = void 0;
const logger_1 = require("../bridge/logger");
const jsx_executor_1 = require("../bridge/jsx_executor");
/**
 * Trim paths command implementation.
 */
exports.trimPathsCommand = {
    id: 'trim_paths',
    execute: async (_parameters, _profile) => {
        logger_1.Logger.info('trim_paths', 'Executing trim_paths on ExtendScript engine...');
        const res = await jsx_executor_1.jsxExecutor.execute('EasyWheel.execute("trim_paths")');
        return {
            success: res.success && res.result === 'OK',
            message: res.result === 'OK' ? 'trim_paths executed successfully.' : (res.result || res.message || 'Execution failed.')
        };
    }
};
