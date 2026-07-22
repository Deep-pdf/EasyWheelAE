import { CommandRegistry } from './bridge/registry';
import { connectionManager } from './bridge/connection_manager';
import { easyEaseCommand } from './commands/easy_ease';
import { preComposeCommand } from './commands/pre_compose';
import { trimPathsCommand } from './commands/trim_paths';
import { graphEditorCommand } from './commands/graph_editor';
import { duplicateLayerCommand } from './commands/duplicate_layer';
import { nullObjectCommand } from './commands/null_object';
import { pingCommand } from './commands/ping';
import { echoCommand } from './commands/echo';
import { Logger } from './bridge/logger';

// 1. Register all placeholder commands
CommandRegistry.register(pingCommand);
CommandRegistry.register(echoCommand);
CommandRegistry.register(easyEaseCommand);
CommandRegistry.register(preComposeCommand);
CommandRegistry.register(trimPathsCommand);
CommandRegistry.register(graphEditorCommand);
CommandRegistry.register(duplicateLayerCommand);
CommandRegistry.register(nullObjectCommand);

// 2. Boot connection manager
connectionManager.start();

Logger.info('Main', 'EasyWheelAE Extension initialized.');
