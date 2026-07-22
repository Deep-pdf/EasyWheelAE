"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.nullObjectCommand = void 0;
const logger_1 = require("../bridge/logger");
/**
 * Placeholder implementation of null_object command.
 */
exports.nullObjectCommand = {
    id: 'null_object',
    execute: async (_parameters, _profile) => {
        logger_1.Logger.info('null_object', 'Received null_object');
        return {
            success: true,
            message: 'null_object executed successfully.'
        };
    }
};
