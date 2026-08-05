"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.preComposeCommand = void 0;
const logger_1 = require("../bridge/logger");
const jsx_executor_1 = require("../bridge/jsx_executor");
/**
 * Pre-compose command implementation.
 */
exports.preComposeCommand = {
    id: 'pre_compose',
    execute: async (_parameters, _profile) => {
        logger_1.Logger.info('pre_compose', 'Executing pre_compose on ExtendScript engine...');
        const res = await jsx_executor_1.jsxExecutor.execute('EasyWheel.execute("pre_compose")');
        return {
            success: res.success,
            message: res.result === 'OK' ? 'pre_compose executed successfully.' : (res.message || 'Execution failed.')
        };
    }
};
