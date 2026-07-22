import * as fs from 'fs';
import * as path from 'path';
import { WebSocketServer, WebSocket } from 'ws';
import { CommandHandler } from './command_handler';

/**
 * Manages the WebSocket Server connection inside the After Effects CEP extension.
 */
export class AEConnectionManager {
  private wss: WebSocketServer | null = null;
  private activeSockets = new Set<WebSocket>();

  constructor() {}

  /**
   * Reads the global config file to resolve the configured port.
   * Fallback to default 23435 if not found.
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
        if (config && config.global && typeof config.global.adobePort === 'number') {
          return config.global.adobePort;
        }
      }
    } catch (e) {
      console.error('[AEConnectionManager] Error reading config port:', e);
    }
    return 23435;
  }

  /**
   * Starts the WebSocket server listening on the configured port.
   */
  public start() {
    if (this.wss) {
      console.warn('[AEConnectionManager] Server is already running.');
      return;
    }

    const port = this.getConfigPort();

    this.wss = new WebSocketServer({ port, host: '127.0.0.1' });

    this.wss.on('connection', (ws: WebSocket) => {
      console.log('[AEConnectionManager] Client Connected');
      this.activeSockets.add(ws);

      ws.on('message', async (data) => {
        const messageStr = data.toString('utf8');
        
        const response = await CommandHandler.handle(messageStr);
        const payload = JSON.stringify(response);
        
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(payload);
        }
      });

      ws.on('close', () => {
        console.log('[AEConnectionManager] Client Disconnected');
        this.activeSockets.delete(ws);
      });

      ws.on('error', (err) => {
        console.error('[AEConnectionManager] Socket error:', err);
        this.activeSockets.delete(ws);
      });
    });

    this.wss.on('error', (err: any) => {
      console.error('[AEConnectionManager] Server error:', err);
      this.stop();
    });

    console.log(`[AEConnectionManager] WebSocket Server listening on 127.0.0.1:${port}`);
  }

  /**
   * Stops the server and closes all active sockets.
   */
  public stop() {
    for (const ws of this.activeSockets) {
      try {
        ws.close();
      } catch (e) {}
    }
    this.activeSockets.clear();

    if (this.wss) {
      this.wss.close(() => {
        console.log('[AEConnectionManager] Server stopped.');
      });
      this.wss = null;
    }
  }
}
