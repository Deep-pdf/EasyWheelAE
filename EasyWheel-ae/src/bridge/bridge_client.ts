import * as fs from 'fs';
import * as path from 'path';
import { ConnectionManager, BridgeStatus } from './connection_manager';
import { CommandDispatcher } from './dispatcher';
import { Logger } from './logger';

/**
 * Underlying WebSocket client instance.
 * Connects to the port defined in the global configuration file.
 */
export class BridgeClient {
  private ws: WebSocket | null = null;
  private manager: ConnectionManager;
  private reconnectInterval: any = null;
  private isConnecting: boolean = false;

  constructor(manager: ConnectionManager) {
    this.manager = manager;
  }

  /**
   * Resolves the TCP port from the host configuration file.
   */
  private getConfigPort(): number {
    try {
      const appData = process.env.APPDATA;
      if (!appData) {
        return 23435;
      }

      const configPath = path.join(appData, 'EasyWheelAE', 'easywheel.json');
      if (fs.existsSync(configPath)) {
        const content = fs.readFileSync(configPath, 'utf8');
        const config = JSON.parse(content);
        if (config && config.global) {
          if (typeof config.global.adobe_port === 'number') {
            return config.global.adobe_port;
          }
          if (typeof config.global.adobePort === 'number') {
            return config.global.adobePort;
          }
        }
      }
    } catch (e) {
      Logger.error('BridgeClient', 'Failed to read port from configuration file', e);
    }
    return 23435;
  }

  /**
   * Starts the WebSocket client connection and enables auto-reconnect.
   */
  public start() {
    if (this.ws) {
      Logger.warn('BridgeClient', 'WebSocket client is already running.');
      return;
    }
    
    this.connect();

    if (!this.reconnectInterval) {
      this.reconnectInterval = setInterval(() => {
        if (!this.ws && !this.isConnecting) {
          Logger.info('BridgeClient', 'Reconnection interval triggered. Retrying connection...');
          this.connect();
        }
      }, 5000);
    }
  }

  /**
   * Attempts connection to the server.
   */
  private connect() {
    this.isConnecting = true;
    this.manager.setStatus(BridgeStatus.Waiting);
    const port = this.getConfigPort();
    const url = `ws://127.0.0.1:${port}`;
    Logger.info('BridgeClient', `Connection Started: ${url}`);

    try {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        this.isConnecting = false;
        Logger.info('BridgeClient', 'Socket opened. Sending handshake...');
        const helloMessage = {
          type: 'hello',
          client: 'after-effects',
          version: '1.0.0'
        };
        if (this.ws) {
          this.ws.send(JSON.stringify(helloMessage));
        }
      };

      this.ws.onmessage = async (event: MessageEvent) => {
        const text = event.data.toString();
        try {
          const parsed = JSON.parse(text);
          if (parsed && parsed.type === 'welcome') {
            Logger.info('BridgeClient', `Handshake succeeded. Welcome message received from ${parsed.server} v${parsed.version}`);
            this.manager.setStatus(BridgeStatus.Connected);
            return;
          }

          if (parsed && parsed.type === 'ping') {
            Logger.debug('BridgeClient', 'Heartbeat Ping received, sending Pong...');
            const pongMessage = {
              type: 'pong'
            };
            if (this.ws) {
              this.ws.send(JSON.stringify(pongMessage));
            }
            return;
          }

          // Dispatch normal command request
          Logger.info('BridgeClient', `Received command request: ${parsed.command}`);
          const response = await CommandDispatcher.dispatch(text);
          if (this.ws) {
            this.ws.send(JSON.stringify(response));
          }
        } catch (e) {
          Logger.error('BridgeClient', 'Failed to process incoming message', e);
        }
      };

      this.ws.onclose = (event: CloseEvent) => {
        Logger.info('BridgeClient', `Connection closed. Code: ${event.code}, Reason: ${event.reason || 'None'}`);
        this.cleanup();
      };

      this.ws.onerror = (err: Event) => {
        Logger.error('BridgeClient', 'Connection Failed or error occurred', err);
        this.cleanup();
      };
    } catch (e) {
      Logger.error('BridgeClient', 'Error during socket creation', e);
      this.cleanup();
    }
  }

  /**
   * Resets socket state and sets status to Disconnected.
   */
  private cleanup() {
    this.isConnecting = false;
    this.ws = null;
    this.manager.setStatus(BridgeStatus.Disconnected);
  }

  /**
   * Stops the client and shuts down reconnection timers.
   */
  public stop() {
    if (this.reconnectInterval) {
      clearInterval(this.reconnectInterval);
      this.reconnectInterval = null;
    }
    if (this.ws) {
      try {
        this.ws.close();
      } catch (_) {}
      this.ws = null;
    }
    this.cleanup();
  }
}
