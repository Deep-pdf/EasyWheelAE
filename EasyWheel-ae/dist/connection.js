"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.AEConnectionManager = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const ws_1 = require("ws");
const command_handler_1 = require("./command_handler");
/**
 * Manages the WebSocket Server connection inside the After Effects CEP extension.
 */
class AEConnectionManager {
    wss = null;
    activeSockets = new Set();
    constructor() { }
    /**
     * Reads the global config file to resolve the configured port.
     * Fallback to default 23435 if not found.
     */
    getConfigPort() {
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
        }
        catch (e) {
            console.error('[AEConnectionManager] Error reading config port:', e);
        }
        return 23435;
    }
    /**
     * Starts the WebSocket server listening on the configured port.
     */
    start() {
        if (this.wss) {
            console.warn('[AEConnectionManager] Server is already running.');
            return;
        }
        const port = this.getConfigPort();
        this.wss = new ws_1.WebSocketServer({ port, host: '127.0.0.1' });
        this.wss.on('connection', (ws) => {
            console.log('[AEConnectionManager] Client Connected');
            this.activeSockets.add(ws);
            ws.on('message', async (data) => {
                const messageStr = data.toString('utf8');
                const response = await command_handler_1.CommandHandler.handle(messageStr);
                const payload = JSON.stringify(response);
                if (ws.readyState === ws_1.WebSocket.OPEN) {
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
        this.wss.on('error', (err) => {
            console.error('[AEConnectionManager] Server error:', err);
            this.stop();
        });
        console.log(`[AEConnectionManager] WebSocket Server listening on 127.0.0.1:${port}`);
    }
    /**
     * Stops the server and closes all active sockets.
     */
    stop() {
        for (const ws of this.activeSockets) {
            try {
                ws.close();
            }
            catch (e) { }
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
exports.AEConnectionManager = AEConnectionManager;
