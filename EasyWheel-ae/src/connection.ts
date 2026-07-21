import * as net from 'net';
import { CommandHandler } from './command_handler';

/**
 * Manages the TCP Server socket connection inside the After Effects CEP extension.
 */
export class AEConnectionManager {
  private server: net.Server | null = null;
  private activeSockets = new Set<net.Socket>();
  private port: number;

  constructor(port: number = 23435) {
    this.port = port;
  }

  /**
   * Starts the TCP server listening for incoming connections from the Host.
   */
  public start() {
    if (this.server) {
      console.warn('[AEConnectionManager] Server is already running.');
      return;
    }

    // Resolve node net module dynamically for CEP compatibility
    const netModule = typeof window !== 'undefined' && (window as any).require
      ? (window as any).require('net')
      : require('net');

    this.server = netModule.createServer((socket: net.Socket) => {
      console.log(`[AEConnectionManager] Connection Established: ${socket.remoteAddress}:${socket.remotePort}`);
      this.activeSockets.add(socket);

      let buffer = '';

      socket.on('data', async (data) => {
        buffer += data.toString('utf8');
        let boundary = buffer.indexOf('\n');
        
        while (boundary !== -1) {
          const line = buffer.substring(0, boundary).trim();
          buffer = buffer.substring(boundary + 1);
          
          if (line) {
            const response = await CommandHandler.handle(line);
            const payload = JSON.stringify(response) + '\n';
            if (!socket.destroyed) {
              socket.write(payload, 'utf8');
            }
          }
          boundary = buffer.indexOf('\n');
        }
      });

      socket.on('close', () => {
        console.log('[AEConnectionManager] Client disconnected.');
        this.activeSockets.delete(socket);
      });

      socket.on('error', (err) => {
        console.error('[AEConnectionManager] Socket error:', err);
        this.activeSockets.delete(socket);
      });
    });

    this.server!.on('error', (err: any) => {
      console.error('[AEConnectionManager] Server error:', err);
      this.stop();
    });

    this.server!.listen(this.port, '127.0.0.1', () => {
      console.log(`[AEConnectionManager] Server listening on 127.0.0.1:${this.port}`);
    });
  }

  /**
   * Stops the TCP server and closes all active client sockets.
   */
  public stop() {
    for (const socket of this.activeSockets) {
      socket.destroy();
    }
    this.activeSockets.clear();

    if (this.server) {
      this.server.close(() => {
        console.log('[AEConnectionManager] Server stopped.');
      });
      this.server = null;
    }
  }
}
