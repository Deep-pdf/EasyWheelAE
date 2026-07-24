"use strict";
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
const logger_1 = require("./bridge/logger");
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
// 2. Boot connection manager
connection_manager_1.connectionManager.start();
logger_1.Logger.info('Main', 'EasyWheelAE Extension initialized.');
