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
exports.BridgeServer = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const ws_1 = require("ws");
const connection_manager_1 = require("./connection_manager");
const dispatcher_1 = require("./dispatcher");
const logger_1 = require("./logger");
/**
 * Underlying WebSocket server instance.
 * Listens on the port defined in the global configuration file.
 */
class BridgeServer {
    wss = null;
    activeSocket = null;
    manager;
    constructor(manager) {
        this.manager = manager;
    }
    /**
     * Resolves the TCP port from the host configuration file.
     * Defensively checks for both snake_case and camelCase parameters.
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
                if (config && config.global) {
                    if (typeof config.global.adobe_port === 'number') {
                        return config.global.adobe_port;
                    }
                    if (typeof config.global.adobePort === 'number') {
                        return config.global.adobePort;
                    }
                }
            }
        }
        catch (e) {
            logger_1.Logger.error('BridgeServer', 'Failed to read port from configuration file', e);
        }
        return 23435;
    }
    /**
     * Boots the WebSocket server.
     */
    start() {
        if (this.wss) {
            logger_1.Logger.warn('BridgeServer', 'WebSocket server is already running.');
            return;
        }
        const port = this.getConfigPort();
        try {
            this.wss = new ws_1.WebSocketServer({ port, host: '127.0.0.1' });
            this.manager.setStatus(connection_manager_1.BridgeStatus.Waiting);
            logger_1.Logger.info('BridgeServer', `Server Started. Listening on 127.0.0.1:${port}`);
        }
        catch (e) {
            this.manager.setStatus(connection_manager_1.BridgeStatus.Error);
            logger_1.Logger.error('BridgeServer', `Failed to start server on port ${port}`, e);
            throw e;
        }
        this.wss.on('connection', (ws) => {
            // Allow only a single active connection from the EasyWheel Host
            if (this.activeSocket !== null) {
                logger_1.Logger.warn('BridgeServer', 'Rejecting additional connection request (Concurrency limit: 1).');
                try {
                    ws.close(4001, 'Only one client supported');
                }
                catch (_) { }
                return;
            }
            this.activeSocket = ws;
            this.manager.setStatus(connection_manager_1.BridgeStatus.Connected);
            logger_1.Logger.info('BridgeServer', 'Client Connected');
            ws.on('message', async (data) => {
                const requestJson = data.toString('utf8');
                // Silent heartbeat logging check to avoid spamming normal command outputs
                try {
                    const parsed = JSON.parse(requestJson);
                    if (parsed && parsed.command === 'ping') {
                        logger_1.Logger.debug('BridgeServer', 'Heartbeat Ping received');
                    }
                }
                catch (_) { }
                // Dispatch request and resolve command response
                const response = await dispatcher_1.CommandDispatcher.dispatch(requestJson);
                const payload = JSON.stringify(response);
                if (ws.readyState === ws_1.WebSocket.OPEN) {
                    ws.send(payload);
                }
            });
            ws.on('close', (code, reason) => {
                logger_1.Logger.info('BridgeServer', `Client Disconnected (Code: ${code}, Reason: ${reason.toString() || 'None'})`);
                if (this.activeSocket === ws) {
                    this.activeSocket = null;
                    this.manager.setStatus(connection_manager_1.BridgeStatus.Waiting);
                }
            });
            ws.on('error', (err) => {
                logger_1.Logger.error('BridgeServer', 'Socket connection error occurred:', err);
                if (this.activeSocket === ws) {
                    this.activeSocket = null;
                    this.manager.setStatus(connection_manager_1.BridgeStatus.Waiting);
                }
            });
        });
        this.wss.on('error', (err) => {
            logger_1.Logger.error('BridgeServer', 'WebSocket server error occurred:', err);
            this.stop();
            this.manager.setStatus(connection_manager_1.BridgeStatus.Error);
        });
    }
    /**
     * Shuts down the WebSocket server and drops any active connections.
     */
    stop() {
        if (this.activeSocket) {
            try {
                this.activeSocket.close();
            }
            catch (_) { }
            this.activeSocket = null;
        }
        if (this.wss) {
            try {
                this.wss.close();
                logger_1.Logger.info('BridgeServer', 'Server Stopped');
            }
            catch (e) {
                logger_1.Logger.error('BridgeServer', 'Error during server close execution:', e);
            }
            this.wss = null;
        }
        this.manager.setStatus(connection_manager_1.BridgeStatus.Disconnected);
    }
}
exports.BridgeServer = BridgeServer;
