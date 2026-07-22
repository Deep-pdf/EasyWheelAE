import { Logger } from './logger';
import { CommandRegistry } from './registry';
import { CommandRequest, CommandResponse } from './protocol';
import { connectionManager, BridgeStatus } from './connection_manager';

/**
 * Parses, validates, and dispatches incoming command requests to the appropriate handlers.
 */
export class CommandDispatcher {
  /**
   * Processes a raw string payload and returns a versioned response.
   * 
   * @param requestJson Raw JSON string payload.
   * @returns CommandResponse model.
   */
  public static async dispatch(requestJson: string): Promise<CommandResponse> {
    const startTime = Date.now();
    let requestId = 'unknown';

    try {
      // 1. JSON Parsing & Malformed request check
      let request: CommandRequest;
      try {
        request = JSON.parse(requestJson);
      } catch (err: any) {
        Logger.error('CommandDispatcher', `Failed to parse payload: "${requestJson}"`, err);
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
        Logger.warn('CommandDispatcher', `Unsupported protocol version: ${request.version} (Expected 1)`);
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
        Logger.warn('CommandDispatcher', `Missing command identifier in request (Request ID: ${requestId})`);
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
      const command = CommandRegistry.get(request.command);
      if (!command) {
        Logger.warn('CommandDispatcher', `Unknown Command: "${request.command}" (Request ID: ${requestId})`);
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
        connectionManager.setStatus(BridgeStatus.Busy);
        Logger.info('CommandDispatcher', `Request Received: "${request.command}" (Request ID: ${requestId})`);
      }

      let result;
      try {
        result = await command.execute(request.parameters || {}, request.profile || '');
      } catch (execError: any) {
        Logger.error('CommandDispatcher', `Execution failure for command "${request.command}"`, execError);
        if (!isHeartbeat) {
          connectionManager.setStatus(BridgeStatus.Connected);
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
        connectionManager.setStatus(BridgeStatus.Connected);
        Logger.info('CommandDispatcher', `Command Executed: "${request.command}" (Success: ${result.success})`);
      }

      const response: CommandResponse = {
        version: 1,
        requestId,
        success: result.success,
        errorCode: result.errorCode,
        message: result.message,
        executionTime: Date.now() - startTime
      };

      if (!isHeartbeat) {
        Logger.info('CommandDispatcher', `Response Sent for "${request.command}" (Request ID: ${requestId})`);
      }

      return response;

    } catch (e: any) {
      Logger.error('CommandDispatcher', 'Critical error during dispatch processing:', e);
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
