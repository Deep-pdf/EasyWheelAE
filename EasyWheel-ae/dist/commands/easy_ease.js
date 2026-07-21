"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.easyEaseCommand = void 0;
/**
 * Placeholder implementation of easy_ease command.
 */
exports.easyEaseCommand = {
    id: 'easy_ease',
    execute: async (_parameters, _profile) => {
        console.log('Received easy_ease');
        return {
            success: true,
            message: 'easy_ease executed successfully.'
        };
    }
};
