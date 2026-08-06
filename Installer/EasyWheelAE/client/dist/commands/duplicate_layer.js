"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.duplicateLayerCommand = void 0;
const logger_1 = require("../bridge/logger");
const jsx_executor_1 = require("../bridge/jsx_executor");
/**
 * Duplicate layer command implementation.
 */
exports.duplicateLayerCommand = {
    id: 'duplicate_layer',
    execute: async (_parameters, _profile) => {
        logger_1.Logger.info('duplicate_layer', 'Executing duplicate_layer on ExtendScript engine...');
        const res = await jsx_executor_1.jsxExecutor.execute('EasyWheel.execute("duplicate_layer")');
        return {
            success: res.success && res.result === 'OK',
            message: res.result === 'OK' ? 'duplicate_layer executed successfully.' : (res.result || res.message || 'Execution failed.')
        };
    }
};
