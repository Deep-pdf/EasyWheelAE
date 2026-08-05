"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parentCommand = void 0;
const logger_1 = require("../bridge/logger");
const jsx_executor_1 = require("../bridge/jsx_executor");
/**
 * Parent command implementation.
 */
exports.parentCommand = {
    id: 'parent',
    execute: async (_parameters, _profile) => {
        logger_1.Logger.info('parent', 'Executing parent on ExtendScript engine...');
        const res = await jsx_executor_1.jsxExecutor.execute('EasyWheel.execute("parent")');
        return {
            success: res.success && res.result === 'OK',
            message: res.result === 'OK' ? 'parent executed successfully.' : (res.result || res.message || 'Execution failed.')
        };
    }
};
