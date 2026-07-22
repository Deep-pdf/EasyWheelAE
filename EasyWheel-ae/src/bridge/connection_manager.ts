import { Logger } from './logger';
import { BridgeServer } from './bridge_server';

/**
 * Valid state transitions for the After Effects Bridge.
 */
export enum BridgeStatus {
  Disconnected = 'Disconnected',
  Waiting = 'Waiting',
  Connected = 'Connected',
  Busy = 'Busy',
  Error = 'Error'
}

/**
 * Manages the connection lifecycle and exposes current bridge execution status.
 */
export class ConnectionManager {
  private server: BridgeServer | null = null;
  private status: BridgeStatus = BridgeStatus.Disconnected;

  constructor() {}

  /**
   * Returns the current status of the bridge connection.
   */
  public getStatus(): BridgeStatus {
    return this.status;
  }

  /**
   * Sets the bridge status, logging any state transitions.
   * 
   * @param newStatus Next status state.
   */
  public setStatus(newStatus: BridgeStatus) {
    if (this.status !== newStatus) {
      const oldStatus = this.status;
      this.status = newStatus;
      Logger.info('ConnectionManager', `Status transition: ${oldStatus} -> ${newStatus}`);
    }
  }

  /**
   * Starts the server.
   */
  public start() {
    if (this.server) {
      Logger.warn('ConnectionManager', 'Server is already running.');
      return;
    }

    Logger.info('ConnectionManager', 'Starting connection server...');
    try {
      this.server = new BridgeServer(this);
      this.server.start();
    } catch (e: any) {
      this.setStatus(BridgeStatus.Error);
      Logger.error('ConnectionManager', 'Critical failure during server startup:', e);
    }
  }

  /**
   * Stops the server.
   */
  public stop() {
    Logger.info('ConnectionManager', 'Stopping connection server...');
    if (this.server) {
      try {
        this.server.stop();
      } catch (e) {
        Logger.error('ConnectionManager', 'Error closing connection server:', e);
      }
      this.server = null;
    }
    this.setStatus(BridgeStatus.Disconnected);
  }
}

export const connectionManager = new ConnectionManager();
