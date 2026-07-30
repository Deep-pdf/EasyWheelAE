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
        logger_1.Logger.info('execute_native_command', `Executing command ID ${commandId}...`);
        let script = '';
        // Check if the command is one of our special custom actions
        switch (commandId) {
            case 2071: // Pre-compose
                script = 'EasyWheel.execute("pre_compose")';
                break;
            case 2057: // Easy Ease
                script = 'EasyWheel.execute("easy_ease")';
                break;
            case 2406: // Trim Paths (from our registry)
                script = 'EasyWheel.execute("trim_paths")';
                break;
            case 2410: // Parent / Parent Picker (from our registry)
                script = 'EasyWheel.execute("parent")';
                break;
            case 2507: // Null Object (from our registry)
                script = 'EasyWheel.execute("null_object")';
                break;
            case 2007: // Duplicate
                script = 'EasyWheel.execute("duplicate_layer")';
                break;
            default:
                // For all other standard Adobe menu commands, bring After Effects to the front and execute
                script = `app.activate(); app.executeCommand(${commandId}); "OK";`;
                break;
        }
        const res = await jsx_executor_1.jsxExecutor.execute(script);
        // In our bootstrap.jsx, custom commands return "OK" on success or "ERROR: <reason>" on failure.
        // Standard app.executeCommand returns undefined, so we appended "OK" at the end of the statement.
        const success = res.success && (res.result === 'OK' || res.result === undefined || res.result === 'undefined' || res.result === '');
        const isError = res.result && typeof res.result === 'string' && res.result.indexOf('ERROR:') === 0;
        const errorMsg = isError ? res.result.substring(6).trim() : (res.message || 'Execution failed.');
        return {
            success: success && !isError,
            message: (success && !isError) ? `Command ID ${commandId} executed successfully.` : errorMsg
        };
    }
};
