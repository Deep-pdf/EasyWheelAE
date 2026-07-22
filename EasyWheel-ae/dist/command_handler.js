"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommandHandler = void 0;
const command_registry_1 = require("./command_registry");
/**
 * Handles incoming CommandRequests and produces a CommandResponse.
 */
class CommandHandler {
    /**
     * Parses and executes a command payload.
     *
     * @param requestJson Raw NDJSON line received from the connection.
     * @returns A promise resolving to the final CommandResponse.
     */
    static async handle(requestJson) {
        const startTime = Date.now();
        let requestId = 'unknown';
        try {
            const request = JSON.parse(requestJson);
            requestId = request.requestId || 'unknown';
            // 1. Protocol Validation
            if (request.version !== 1) {
                return {
                    version: 1,
                    requestId,
                    success: false,
                    errorCode: 'unsupported_protocol_version',
                    message: `Unsupported protocol version: ${request.version}. Expected 1.`,
                    executionTime: Date.now() - startTime
                };
            }
            // 2. Format Validation
            if (!request.command) {
                return {
                    version: 1,
                    requestId,
                    success: false,
                    errorCode: 'malformed_request',
                    message: 'Missing command identifier in request.',
                    executionTime: Date.now() - startTime
                };
            }
            // 3. Command Lookup
            const command = command_registry_1.CommandRegistry.get(request.command);
            if (!command) {
                console.error(`[CommandHandler] Unknown Command: ${request.command}`);
                return {
                    version: 1,
                    requestId,
                    success: false,
                    errorCode: 'unknown_command',
                    message: `Unknown command identifier: '${request.command}'`,
                    executionTime: Date.now() - startTime
                };
            }
            // 4. Command Execution
            console.log(`[CommandHandler] Request Received: ${request.command} (ID: ${requestId})`);
            const result = await command.execute(request.parameters || {}, request.profile || '');
            console.log(`[CommandHandler] Command Executed: ${request.command} (Success: ${result.success})`);
            return {
                version: 1,
                requestId,
                success: result.success,
                errorCode: result.errorCode,
                message: result.message,
                executionTime: Date.now() - startTime
            };
        }
        catch (error) {
            console.error('[CommandHandler] Error processing request:', error);
            return {
                version: 1,
                requestId,
                success: false,
                errorCode: 'internal_error',
                message: error.message || 'Internal extension error occurred.',
                executionTime: Date.now() - startTime
            };
        }
    }
}
exports.CommandHandler = CommandHandler;
