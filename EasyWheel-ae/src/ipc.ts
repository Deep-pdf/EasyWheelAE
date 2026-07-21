/**
 * Represents a command request received from the EasyWheel Host.
 */
export interface CommandRequest {
  version: number;
  requestId: string;
  timestamp: string;
  command: string;
  parameters: any;
  profile: string;
}

/**
 * Represents a command response sent back to the EasyWheel Host.
 */
export interface CommandResponse {
  requestId: string;
  success: boolean;
  errorCode?: string;
  message: string;
  executionTime: number;
}
