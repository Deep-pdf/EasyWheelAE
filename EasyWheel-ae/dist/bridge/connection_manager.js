"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectionManager = exports.ConnectionManager = exports.BridgeStatus = void 0;
const logger_1 = require("./logger");
const bridge_server_1 = require("./bridge_server");
/**
 * Valid state transitions for the After Effects Bridge.
 */
var BridgeStatus;
(function (BridgeStatus) {
    BridgeStatus["Disconnected"] = "Disconnected";
    BridgeStatus["Waiting"] = "Waiting";
    BridgeStatus["Connected"] = "Connected";
    BridgeStatus["Busy"] = "Busy";
    BridgeStatus["Error"] = "Error";
})(BridgeStatus || (exports.BridgeStatus = BridgeStatus = {}));
/**
 * Manages the connection lifecycle and exposes current bridge execution status.
 */
class ConnectionManager {
    server = null;
    status = BridgeStatus.Disconnected;
    constructor() { }
    /**
     * Returns the current status of the bridge connection.
     */
    getStatus() {
        return this.status;
    }
    /**
     * Sets the bridge status, logging any state transitions.
     *
     * @param newStatus Next status state.
     */
    setStatus(newStatus) {
        if (this.status !== newStatus) {
            const oldStatus = this.status;
            this.status = newStatus;
            logger_1.Logger.info('ConnectionManager', `Status transition: ${oldStatus} -> ${newStatus}`);
        }
    }
    /**
     * Starts the server.
     */
    start() {
        if (this.server) {
            logger_1.Logger.warn('ConnectionManager', 'Server is already running.');
            return;
        }
        logger_1.Logger.info('ConnectionManager', 'Starting connection server...');
        try {
            this.server = new bridge_server_1.BridgeServer(this);
            this.server.start();
        }
        catch (e) {
            this.setStatus(BridgeStatus.Error);
            logger_1.Logger.error('ConnectionManager', 'Critical failure during server startup:', e);
        }
    }
    /**
     * Stops the server.
     */
    stop() {
        logger_1.Logger.info('ConnectionManager', 'Stopping connection server...');
        if (this.server) {
            try {
                this.server.stop();
            }
            catch (e) {
                logger_1.Logger.error('ConnectionManager', 'Error closing connection server:', e);
            }
            this.server = null;
        }
        this.setStatus(BridgeStatus.Disconnected);
    }
}
exports.ConnectionManager = ConnectionManager;
exports.connectionManager = new ConnectionManager();
