"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pingCommand = void 0;
/**
 * Implementation of the ping command for heartbeats and connection validation.
 */
exports.pingCommand = {
    id: 'ping',
    execute: async (_parameters, _profile) => {
        return {
            success: true,
            message: 'Bridge Alive'
        };
    }
};
