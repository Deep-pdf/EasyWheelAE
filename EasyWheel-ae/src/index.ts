import { CommandRegistry } from './bridge/registry';
import { connectionManager } from './bridge/connection_manager';
import { easyEaseCommand } from './commands/easy_ease';
import { preComposeCommand } from './commands/pre_compose';
import { trimPathsCommand } from './commands/trim_paths';
import { graphEditorCommand } from './commands/graph_editor';
import { duplicateLayerCommand } from './commands/duplicate_layer';
import { nullObjectCommand } from './commands/null_object';
import { parentCommand } from './commands/parent';
import { pingCommand } from './commands/ping';
import { echoCommand } from './commands/echo';
import { executeNativeCommand } from './commands/execute_native_command';
import { Logger } from './bridge/logger';

import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './components/App';

// 1. Register all placeholder commands
CommandRegistry.register(pingCommand);
CommandRegistry.register(echoCommand);
CommandRegistry.register(easyEaseCommand);
CommandRegistry.register(preComposeCommand);
CommandRegistry.register(trimPathsCommand);
CommandRegistry.register(graphEditorCommand);
CommandRegistry.register(duplicateLayerCommand);
CommandRegistry.register(nullObjectCommand);
CommandRegistry.register(parentCommand);
CommandRegistry.register(executeNativeCommand);

// 2. Boot connection manager only in CEP environment
if (typeof window !== 'undefined' && (window as any).__adobe_cep__) {
  connectionManager.start();
} else {
  Logger.info('Main', 'Browser context detected. Skipping background connection manager.');
}

// 3. Mount React App UI
if (typeof document !== 'undefined') {
  const container = document.getElementById('root');
  if (container) {
    const root = createRoot(container);
    root.render(React.createElement(App));
  }
}

Logger.info('Main', 'EasyWheelAE Extension initialized.');

