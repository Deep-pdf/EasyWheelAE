/**
 * Represents a command execution request sent from the EasyWheel Host to the Adobe extension.
 */
export interface CommandRequest {
  /**
   * Protocol version.
   */
  version: number;

  /**
   * Unique identifier for matching request to response.
   */
  requestId: string;

  /**
   * ISO8601 UTC timestamp of request generation.
   */
  timestamp: string;

  /**
   * Target command name (e.g. "ping", "easy_ease").
   */
  command: string;

  /**
   * Optional custom parameters payload.
   */
  parameters: any;

  /**
   * Active application configuration profile.
   */
  profile: string;
}

/**
 * Represents a command execution response sent back from the Adobe extension to the EasyWheel Host.
 */
export interface CommandResponse {
  /**
   * Protocol version.
   */
  version: number;

  /**
   * Unique identifier matching the original request's ID.
   */
  requestId: string;

  /**
   * True if command executed successfully; false otherwise.
   */
  success: boolean;

  /**
   * Optional error identifier code.
   */
  errorCode?: string;

  /**
   * Human-readable text message or stringified return value.
   */
  message: string;

  /**
   * Execution duration in milliseconds.
   */
  executionTime: number;
}
