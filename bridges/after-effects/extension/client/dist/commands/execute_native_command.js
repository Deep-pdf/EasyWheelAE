"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeNativeCommand = void 0;
const logger_1 = require("../bridge/logger");
const jsx_executor_1 = require("../bridge/jsx_executor");
/**
 * Command handler to execute native After Effects menu commands by their numeric ID.
 */
exports.executeNativeCommand = {
    id: 'execute_native_command',
    execute: async (parameters, _profile) => {
        const commandId = parameters.commandId;
        if (typeof commandId !== 'number') {
            logger_1.Logger.error('execute_native_command', 'Failed to execute: missing or invalid commandId parameter.');
            return {
                success: false,
                message: 'Invalid command ID.',
                errorCode: 'invalid_command_id'
            };
        }
        logger_1.Logger.info('execute_native_command', `Executing app.executeCommand(${commandId}) on ExtendScript engine...`);
        const res = await jsx_executor_1.jsxExecutor.execute(`app.executeCommand(${commandId})`);
        return {
            success: res.success,
            message: res.success ? `Command ID ${commandId} executed successfully.` : `Unable to execute command.`
        };
    }
};
