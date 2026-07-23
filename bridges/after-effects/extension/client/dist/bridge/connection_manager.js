"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectionManager = exports.ConnectionManager = exports.BridgeStatus = void 0;
const logger_1 = require("./logger");
const bridge_client_1 = require("./bridge_client");
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
    client = null;
    status = BridgeStatus.Disconnected;
    constructor() { }
    /**
     * Returns the current status of the bridge connection.
     */
    getStatus() {
        return this.status;
    }
    /**
     * Sets the bridge status, logging any state transitions and updating the DOM elements.
     *
     * @param newStatus Next status state.
     */
    setStatus(newStatus) {
        if (this.status !== newStatus) {
            const oldStatus = this.status;
            this.status = newStatus;
            logger_1.Logger.info('ConnectionManager', `Status transition: ${oldStatus} -> ${newStatus}`);
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
                    }
                    else if (newStatus === BridgeStatus.Waiting) {
                        statusText.textContent = 'Waiting for bridge host...';
                    }
                    else if (newStatus === BridgeStatus.Disconnected) {
                        statusText.textContent = 'Disconnected';
                    }
                    else {
                        statusText.textContent = `Status: ${newStatus}`;
                    }
                }
            }
            catch (e) {
                logger_1.Logger.error('ConnectionManager', 'Failed to update UI status elements', e);
            }
        }
    }
    /**
     * Starts the client connection manager.
     */
    start() {
        if (this.client) {
            logger_1.Logger.warn('ConnectionManager', 'Client is already running.');
            return;
        }
        logger_1.Logger.info('ConnectionManager', 'Starting connection client...');
        try {
            this.client = new bridge_client_1.BridgeClient(this);
            this.client.start();
        }
        catch (e) {
            this.setStatus(BridgeStatus.Error);
            logger_1.Logger.error('ConnectionManager', 'Critical failure during client startup:', e);
        }
    }
    /**
     * Stops the client connection manager.
     */
    stop() {
        logger_1.Logger.info('ConnectionManager', 'Stopping connection client...');
        if (this.client) {
            try {
                this.client.stop();
            }
            catch (e) {
                logger_1.Logger.error('ConnectionManager', 'Error closing connection client:', e);
            }
            this.client = null;
        }
        this.setStatus(BridgeStatus.Disconnected);
    }
}
exports.ConnectionManager = ConnectionManager;
exports.connectionManager = new ConnectionManager();
