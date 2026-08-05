"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.easyEaseCommand = void 0;
const logger_1 = require("../bridge/logger");
const jsx_executor_1 = require("../bridge/jsx_executor");
/**
 * Easy ease command implementation.
 */
exports.easyEaseCommand = {
    id: 'easy_ease',
    execute: async (_parameters, _profile) => {
        logger_1.Logger.info('easy_ease', 'Executing easy_ease on ExtendScript engine...');
        const res = await jsx_executor_1.jsxExecutor.execute('EasyWheel.execute("easy_ease")');
        return {
            success: res.success && res.result === 'OK',
            message: res.result === 'OK' ? 'easy_ease executed successfully.' : (res.result || res.message || 'Execution failed.')
        };
    }
};
