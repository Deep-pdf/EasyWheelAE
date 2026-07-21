import { CommandRegistry } from './command_registry';
import { AEConnectionManager } from './connection';
import { easyEaseCommand } from './commands/easy_ease';
import { preComposeCommand } from './commands/pre_compose';
import { trimPathsCommand } from './commands/trim_paths';
import { graphEditorCommand } from './commands/graph_editor';
import { duplicateLayerCommand } from './commands/duplicate_layer';
import { nullObjectCommand } from './commands/null_object';

// 1. Register all commands
CommandRegistry.register(easyEaseCommand);
CommandRegistry.register(preComposeCommand);
CommandRegistry.register(trimPathsCommand);
CommandRegistry.register(graphEditorCommand);
CommandRegistry.register(duplicateLayerCommand);
CommandRegistry.register(nullObjectCommand);

// 2. Start connection manager
const connectionManager = new AEConnectionManager(23435);
connectionManager.start();

console.log('[EasyWheelAE] Extension initialized.');
