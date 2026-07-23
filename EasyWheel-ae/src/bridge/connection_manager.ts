import { Logger } from './logger';
import { BridgeClient } from './bridge_client';

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
  private client: BridgeClient | null = null;
  private status: BridgeStatus = BridgeStatus.Disconnected;

  constructor() {}

  /**
   * Returns the current status of the bridge connection.
   */
  public getStatus(): BridgeStatus {
    return this.status;
  }

  /**
   * Sets the bridge status, logging any state transitions and updating the DOM elements.
   * 
   * @param newStatus Next status state.
   */
  public setStatus(newStatus: BridgeStatus) {
    if (this.status !== newStatus) {
      const oldStatus = this.status;
      this.status = newStatus;
      Logger.info('ConnectionManager', `Status transition: ${oldStatus} -> ${newStatus}`);

      // Update CEP Panel UI Elements
      try {
        const statusBadge = document.getElementById('status-badge');
        const statusText = document.getElementById('bridge-status-text');
        
        if (statusBadge) {
          statusBadge.className = `status-badge status-${newStatus.toLowerCase()}`;
          statusBadge.textContent = newStatus;
        }
        
        if (statusText) {
          if (newStatus === BridgeStatus.Connected) {
            statusText.textContent = 'CONNECTED';
          } else if (newStatus === BridgeStatus.Waiting) {
            statusText.textContent = 'Waiting for bridge host...';
          } else if (newStatus === BridgeStatus.Disconnected) {
            statusText.textContent = 'Disconnected';
          } else {
            statusText.textContent = `Status: ${newStatus}`;
          }
        }
      } catch (e) {
        Logger.error('ConnectionManager', 'Failed to update UI status elements', e);
      }
    }
  }

  /**
   * Starts the client connection manager.
   */
  public start() {
    if (this.client) {
      Logger.warn('ConnectionManager', 'Client is already running.');
      return;
    }

    Logger.info('ConnectionManager', 'Starting connection client...');
    try {
      this.client = new BridgeClient(this);
      this.client.start();
    } catch (e: any) {
      this.setStatus(BridgeStatus.Error);
      Logger.error('ConnectionManager', 'Critical failure during client startup:', e);
    }
  }

  /**
   * Stops the client connection manager.
   */
  public stop() {
    Logger.info('ConnectionManager', 'Stopping connection client...');
    if (this.client) {
      try {
        this.client.stop();
      } catch (e) {
        Logger.error('ConnectionManager', 'Error closing connection client:', e);
      }
      this.client = null;
    }
    this.setStatus(BridgeStatus.Disconnected);
  }
}

export const connectionManager = new ConnectionManager();
