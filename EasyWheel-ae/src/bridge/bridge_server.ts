import * as fs from 'fs';
import * as path from 'path';
import { WebSocketServer, WebSocket } from 'ws';
import { ConnectionManager, BridgeStatus } from './connection_manager';
import { CommandDispatcher } from './dispatcher';
import { Logger } from './logger';

/**
 * Underlying WebSocket server instance.
 * Listens on the port defined in the global configuration file.
 */
export class BridgeServer {
  private wss: WebSocketServer | null = null;
  private activeSocket: WebSocket | null = null;
  private manager: ConnectionManager;

  constructor(manager: ConnectionManager) {
    this.manager = manager;
  }

  /**
   * Resolves the TCP port from the host configuration file.
   * Defensively checks for both snake_case and camelCase parameters.
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
      Logger.error('BridgeServer', 'Failed to read port from configuration file', e);
    }
    return 23435;
  }

  /**
   * Boots the WebSocket server.
   */
  public start() {
    if (this.wss) {
      Logger.warn('BridgeServer', 'WebSocket server is already running.');
      return;
    }

    const port = this.getConfigPort();

    try {
      this.wss = new WebSocketServer({ port, host: '127.0.0.1' });
      this.manager.setStatus(BridgeStatus.Waiting);
      Logger.info('BridgeServer', `Server Started. Listening on 127.0.0.1:${port}`);
    } catch (e: any) {
      this.manager.setStatus(BridgeStatus.Error);
      Logger.error('BridgeServer', `Failed to start server on port ${port}`, e);
      throw e;
    }

    this.wss.on('connection', (ws: WebSocket) => {
      // Allow only a single active connection from the EasyWheel Host
      if (this.activeSocket !== null) {
        Logger.warn('BridgeServer', 'Rejecting additional connection request (Concurrency limit: 1).');
        try {
          ws.close(4001, 'Only one client supported');
        } catch (_) {}
        return;
      }

      this.activeSocket = ws;
      this.manager.setStatus(BridgeStatus.Connected);
      Logger.info('BridgeServer', 'Client Connected');

      ws.on('message', async (data) => {
        const requestJson = data.toString('utf8');

        // Silent heartbeat logging check to avoid spamming normal command outputs
        try {
          const parsed = JSON.parse(requestJson);
          if (parsed && parsed.command === 'ping') {
            Logger.debug('BridgeServer', 'Heartbeat Ping received');
          }
        } catch (_) {}

        // Dispatch request and resolve command response
        const response = await CommandDispatcher.dispatch(requestJson);
        const payload = JSON.stringify(response);

        if (ws.readyState === WebSocket.OPEN) {
          ws.send(payload);
        }
      });

      ws.on('close', (code, reason) => {
        Logger.info('BridgeServer', `Client Disconnected (Code: ${code}, Reason: ${reason.toString() || 'None'})`);
        if (this.activeSocket === ws) {
          this.activeSocket = null;
          this.manager.setStatus(BridgeStatus.Waiting);
        }
      });

      ws.on('error', (err) => {
        Logger.error('BridgeServer', 'Socket connection error occurred:', err);
        if (this.activeSocket === ws) {
          this.activeSocket = null;
          this.manager.setStatus(BridgeStatus.Waiting);
        }
      });
    });

    this.wss.on('error', (err: any) => {
      Logger.error('BridgeServer', 'WebSocket server error occurred:', err);
      this.stop();
      this.manager.setStatus(BridgeStatus.Error);
    });
  }

  /**
   * Shuts down the WebSocket server and drops any active connections.
   */
  public stop() {
    if (this.activeSocket) {
      try {
        this.activeSocket.close();
      } catch (_) {}
      this.activeSocket = null;
    }

    if (this.wss) {
      try {
        this.wss.close();
        Logger.info('BridgeServer', 'Server Stopped');
      } catch (e) {
        Logger.error('BridgeServer', 'Error during server close execution:', e);
      }
      this.wss = null;
    }

    this.manager.setStatus(BridgeStatus.Disconnected);
  }
}
