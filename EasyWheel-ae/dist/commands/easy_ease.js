"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.easyEaseCommand = void 0;
const logger_1 = require("../bridge/logger");
/**
 * Placeholder implementation of easy_ease command.
 */
exports.easyEaseCommand = {
    id: 'easy_ease',
    execute: async (_parameters, _profile) => {
        logger_1.Logger.info('easy_ease', 'Received easy_ease');
        return {
            success: true,
            message: 'easy_ease executed successfully.'
        };
    }
};
