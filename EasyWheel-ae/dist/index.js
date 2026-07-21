"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const command_registry_1 = require("./command_registry");
const connection_1 = require("./connection");
const easy_ease_1 = require("./commands/easy_ease");
const pre_compose_1 = require("./commands/pre_compose");
const trim_paths_1 = require("./commands/trim_paths");
const graph_editor_1 = require("./commands/graph_editor");
const duplicate_layer_1 = require("./commands/duplicate_layer");
const null_object_1 = require("./commands/null_object");
// 1. Register all commands
command_registry_1.CommandRegistry.register(easy_ease_1.easyEaseCommand);
command_registry_1.CommandRegistry.register(pre_compose_1.preComposeCommand);
command_registry_1.CommandRegistry.register(trim_paths_1.trimPathsCommand);
command_registry_1.CommandRegistry.register(graph_editor_1.graphEditorCommand);
command_registry_1.CommandRegistry.register(duplicate_layer_1.duplicateLayerCommand);
command_registry_1.CommandRegistry.register(null_object_1.nullObjectCommand);
// 2. Start connection manager
const connectionManager = new connection_1.AEConnectionManager(23435);
connectionManager.start();
console.log('[EasyWheelAE] Extension initialized.');
