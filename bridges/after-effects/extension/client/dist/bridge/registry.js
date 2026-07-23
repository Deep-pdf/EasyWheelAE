"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommandRegistry = void 0;
const logger_1 = require("./logger");
/**
 * Centrally manages registration and resolution of commands.
 */
class CommandRegistry {
    static commands = new Map();
    /**
     * Registers a command handler.
     *
     * @param command Command handler instance.
     */
    static register(command) {
        this.commands.set(command.id, command);
        logger_1.Logger.info('CommandRegistry', `Registered command: "${command.id}"`);
    }
    /**
     * Resolves a command handler by ID.
     *
     * @param id Command identifier.
     * @returns Resolves to the Command handler if found, or undefined.
     */
    static get(id) {
        return this.commands.get(id);
    }
}
exports.CommandRegistry = CommandRegistry;
