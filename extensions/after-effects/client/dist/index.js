"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const registry_1 = require("./bridge/registry");
const connection_manager_1 = require("./bridge/connection_manager");
const easy_ease_1 = require("./commands/easy_ease");
const pre_compose_1 = require("./commands/pre_compose");
const trim_paths_1 = require("./commands/trim_paths");
const graph_editor_1 = require("./commands/graph_editor");
const duplicate_layer_1 = require("./commands/duplicate_layer");
const null_object_1 = require("./commands/null_object");
const parent_1 = require("./commands/parent");
const ping_1 = require("./commands/ping");
const echo_1 = require("./commands/echo");
const execute_native_command_1 = require("./commands/execute_native_command");
const logger_1 = require("./bridge/logger");
const react_1 = __importDefault(require("react"));
const client_1 = require("react-dom/client");
const App_1 = require("./components/App");
// 1. Register all placeholder commands
registry_1.CommandRegistry.register(ping_1.pingCommand);
registry_1.CommandRegistry.register(echo_1.echoCommand);
registry_1.CommandRegistry.register(easy_ease_1.easyEaseCommand);
registry_1.CommandRegistry.register(pre_compose_1.preComposeCommand);
registry_1.CommandRegistry.register(trim_paths_1.trimPathsCommand);
registry_1.CommandRegistry.register(graph_editor_1.graphEditorCommand);
registry_1.CommandRegistry.register(duplicate_layer_1.duplicateLayerCommand);
registry_1.CommandRegistry.register(null_object_1.nullObjectCommand);
registry_1.CommandRegistry.register(parent_1.parentCommand);
registry_1.CommandRegistry.register(execute_native_command_1.executeNativeCommand);
// 2. Boot connection manager only in CEP environment
if (typeof window !== 'undefined' && window.__adobe_cep__) {
    connection_manager_1.connectionManager.start();
}
else {
    logger_1.Logger.info('Main', 'Browser context detected. Skipping background connection manager.');
}
// 3. Mount React App UI
if (typeof document !== 'undefined') {
    const container = document.getElementById('root');
    if (container) {
        const root = (0, client_1.createRoot)(container);
        root.render(react_1.default.createElement(App_1.App));
    }
}
logger_1.Logger.info('Main', 'EasyWheelAE Extension initialized.');
