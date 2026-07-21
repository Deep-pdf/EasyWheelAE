"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommandRegistry = void 0;
/**
 * Registry of all available commands in the extension.
 */
class CommandRegistry {
    static commands = new Map();
    /**
     * Registers a command handler.
     */
    static register(command) {
        this.commands.set(command.id, command);
        console.log(`[CommandRegistry] Registered command: ${command.id}`);
    }
    /**
     * Retrieves a command handler by ID.
     */
    static get(id) {
        return this.commands.get(id);
    }
}
exports.CommandRegistry = CommandRegistry;
