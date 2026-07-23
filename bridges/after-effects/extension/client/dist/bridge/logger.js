"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = void 0;
/**
 * Simple structured console logger for the After Effects extension.
 */
class Logger {
    static getTimestamp() {
        const d = new Date();
        const pad = (n) => n.toString().padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    }
    static info(module, message) {
        console.log(`[${this.getTimestamp()}] [INFO] [${module}] ${message}`);
    }
    static warn(module, message) {
        console.warn(`[${this.getTimestamp()}] [WARN] [${module}] ${message}`);
    }
    static error(module, message, error) {
        if (error) {
            console.error(`[${this.getTimestamp()}] [ERROR] [${module}] ${message}`, error);
        }
        else {
            console.error(`[${this.getTimestamp()}] [ERROR] [${module}] ${message}`);
        }
    }
    static debug(module, message) {
        console.debug(`[${this.getTimestamp()}] [DEBUG] [${module}] ${message}`);
    }
}
exports.Logger = Logger;
