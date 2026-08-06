"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.nullObjectCommand = void 0;
const logger_1 = require("../bridge/logger");
const jsx_executor_1 = require("../bridge/jsx_executor");
/**
 * Null object command implementation.
 */
exports.nullObjectCommand = {
    id: 'null_object',
    execute: async (_parameters, _profile) => {
        logger_1.Logger.info('null_object', 'Executing null_object on ExtendScript engine...');
        const res = await jsx_executor_1.jsxExecutor.execute('EasyWheel.execute("null_object")');
        return {
            success: res.success && res.result === 'OK',
            message: res.result === 'OK' ? 'null_object executed successfully.' : (res.result || res.message || 'Execution failed.')
        };
    }
};
