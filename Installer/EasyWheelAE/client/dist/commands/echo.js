"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.echoCommand = void 0;
/**
 * Implementation of the echo command, returning the received payload parameters for debugging.
 */
exports.echoCommand = {
    id: 'echo',
    execute: async (parameters, _profile) => {
        return {
            success: true,
            message: JSON.stringify(parameters)
        };
    }
};
