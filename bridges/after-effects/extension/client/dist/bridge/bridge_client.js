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
exports.BridgeClient = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const connection_manager_1 = require("./connection_manager");
const dispatcher_1 = require("./dispatcher");
const logger_1 = require("./logger");
/**
 * Underlying WebSocket client instance.
 * Connects to the port defined in the global configuration file.
 */
class BridgeClient {
    ws = null;
    manager;
    reconnectInterval = null;
    isConnecting = false;
    constructor(manager) {
        this.manager = manager;
    }
    /**
     * Resolves the TCP port from the host configuration file.
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
            logger_1.Logger.error('BridgeClient', 'Failed to read port from configuration file', e);
        }
        return 23435;
    }
    /**
     * Starts the WebSocket client connection and enables auto-reconnect.
     */
    start() {
        if (this.ws) {
            logger_1.Logger.warn('BridgeClient', 'WebSocket client is already running.');
            return;
        }
        this.connect();
        if (!this.reconnectInterval) {
            this.reconnectInterval = setInterval(() => {
                if (!this.ws && !this.isConnecting) {
                    logger_1.Logger.info('BridgeClient', 'Reconnection interval triggered. Retrying connection...');
                    this.connect();
                }
            }, 5000);
        }
    }
    /**
     * Attempts connection to the server.
     */
    connect() {
        this.isConnecting = true;
        this.manager.setStatus(connection_manager_1.BridgeStatus.Waiting);
        const port = this.getConfigPort();
        const url = `ws://127.0.0.1:${port}`;
        logger_1.Logger.info('BridgeClient', `Connection Started: ${url}`);
        try {
            this.ws = new WebSocket(url);
            this.ws.onopen = () => {
                this.isConnecting = false;
                logger_1.Logger.info('BridgeClient', 'Socket opened. Sending handshake...');
                const helloMessage = {
                    type: 'hello',
                    client: 'after-effects',
                    version: '1.0.0'
                };
                if (this.ws) {
                    this.ws.send(JSON.stringify(helloMessage));
                }
            };
            this.ws.onmessage = async (event) => {
                const text = event.data.toString();
                try {
                    const parsed = JSON.parse(text);
                    if (parsed && parsed.type === 'welcome') {
                        logger_1.Logger.info('BridgeClient', `Handshake succeeded. Welcome message received from ${parsed.server} v${parsed.version}`);
                        this.manager.setStatus(connection_manager_1.BridgeStatus.Connected);
                        return;
                    }
                    if (parsed && parsed.type === 'ping') {
                        logger_1.Logger.debug('BridgeClient', 'Heartbeat Ping received, sending Pong...');
                        const pongMessage = {
                            type: 'pong'
                        };
                        if (this.ws) {
                            this.ws.send(JSON.stringify(pongMessage));
                        }
                        return;
                    }
                    // Dispatch normal command request
                    logger_1.Logger.info('BridgeClient', `Received command request: ${parsed.command}`);
                    const response = await dispatcher_1.CommandDispatcher.dispatch(text);
                    if (this.ws) {
                        this.ws.send(JSON.stringify(response));
                    }
                }
                catch (e) {
                    logger_1.Logger.error('BridgeClient', 'Failed to process incoming message', e);
                }
            };
            this.ws.onclose = (event) => {
                logger_1.Logger.info('BridgeClient', `Connection closed. Code: ${event.code}, Reason: ${event.reason || 'None'}`);
                this.cleanup();
            };
            this.ws.onerror = (err) => {
                logger_1.Logger.error('BridgeClient', 'Connection Failed or error occurred', err);
                this.cleanup();
            };
        }
        catch (e) {
            logger_1.Logger.error('BridgeClient', 'Error during socket creation', e);
            this.cleanup();
        }
    }
    /**
     * Resets socket state and sets status to Disconnected.
     */
    cleanup() {
        this.isConnecting = false;
        this.ws = null;
        this.manager.setStatus(connection_manager_1.BridgeStatus.Disconnected);
    }
    /**
     * Stops the client and shuts down reconnection timers.
     */
    stop() {
        if (this.reconnectInterval) {
            clearInterval(this.reconnectInterval);
            this.reconnectInterval = null;
        }
        if (this.ws) {
            try {
                this.ws.close();
            }
            catch (_) { }
            this.ws = null;
        }
        this.cleanup();
    }
}
exports.BridgeClient = BridgeClient;
