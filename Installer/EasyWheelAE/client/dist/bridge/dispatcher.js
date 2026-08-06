"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommandDispatcher = void 0;
const logger_1 = require("./logger");
const registry_1 = require("./registry");
const connection_manager_1 = require("./connection_manager");
/**
 * Parses, validates, and dispatches incoming command requests to the appropriate handlers.
 */
class CommandDispatcher {
    /**
     * Processes a raw string payload and returns a versioned response.
     *
     * @param requestJson Raw JSON string payload.
     * @returns CommandResponse model.
     */
    static async dispatch(requestJson) {
        const startTime = Date.now();
        let requestId = 'unknown';
        try {
            // 1. JSON Parsing & Malformed request check
            let request;
            try {
                request = JSON.parse(requestJson);
            }
            catch (err) {
                logger_1.Logger.error('CommandDispatcher', `Failed to parse payload: "${requestJson}"`, err);
                return {
                    version: 1,
                    requestId,
                    success: false,
                    errorCode: 'malformed_json',
                    message: `Malformed JSON: ${err.message || 'Parsing error'}`,
                    executionTime: 0
                };
            }
            requestId = request.requestId || 'unknown';
            // 2. Protocol Version Validation
            if (request.version !== 1) {
                logger_1.Logger.warn('CommandDispatcher', `Unsupported protocol version: ${request.version} (Expected 1)`);
                return {
                    version: 1,
                    requestId,
                    success: false,
                    errorCode: 'unsupported_protocol_version',
                    message: `Unsupported protocol version: ${request.version}. Expected 1.`,
                    executionTime: Date.now() - startTime
                };
            }
            // 3. Command field presence check
            if (!request.command) {
                logger_1.Logger.warn('CommandDispatcher', `Missing command identifier in request (Request ID: ${requestId})`);
                return {
                    version: 1,
                    requestId,
                    success: false,
                    errorCode: 'malformed_request',
                    message: 'Missing command identifier in request.',
                    executionTime: Date.now() - startTime
                };
            }
            // 4. Command Registry Lookup
            const command = registry_1.CommandRegistry.get(request.command);
            if (!command) {
                logger_1.Logger.warn('CommandDispatcher', `Unknown Command: "${request.command}" (Request ID: ${requestId})`);
                return {
                    version: 1,
                    requestId,
                    success: false,
                    errorCode: 'unknown_command',
                    message: `Unknown command identifier: '${request.command}'`,
                    executionTime: Date.now() - startTime
                };
            }
            // 5. Command Execution
            const isHeartbeat = request.command === 'ping';
            if (!isHeartbeat) {
                connection_manager_1.connectionManager.setStatus(connection_manager_1.BridgeStatus.Busy);
                logger_1.Logger.info('CommandDispatcher', `Request Received: "${request.command}" (Request ID: ${requestId})`);
            }
            let result;
            try {
                result = await command.execute(request.parameters || {}, request.profile || '');
            }
            catch (execError) {
                logger_1.Logger.error('CommandDispatcher', `Execution failure for command "${request.command}"`, execError);
                if (!isHeartbeat) {
                    connection_manager_1.connectionManager.setStatus(connection_manager_1.BridgeStatus.Connected);
                }
                return {
                    version: 1,
                    requestId,
                    success: false,
                    errorCode: 'execution_failure',
                    message: execError.message || 'Execution failed on bridge.',
                    executionTime: Date.now() - startTime
                };
            }
            if (!isHeartbeat) {
                connection_manager_1.connectionManager.setStatus(connection_manager_1.BridgeStatus.Connected);
                logger_1.Logger.info('CommandDispatcher', `Command Executed: "${request.command}" (Success: ${result.success})`);
            }
            const response = {
                version: 1,
                requestId,
                success: result.success,
                errorCode: result.errorCode,
                message: result.message,
                executionTime: Date.now() - startTime
            };
            if (!isHeartbeat) {
                logger_1.Logger.info('CommandDispatcher', `Response Sent for "${request.command}" (Request ID: ${requestId})`);
            }
            return response;
        }
        catch (e) {
            logger_1.Logger.error('CommandDispatcher', 'Critical error during dispatch processing:', e);
            return {
                version: 1,
                requestId,
                success: false,
                errorCode: 'internal_error',
                message: e.message || 'Internal bridge processing error.',
                executionTime: Date.now() - startTime
            };
        }
    }
}
exports.CommandDispatcher = CommandDispatcher;
