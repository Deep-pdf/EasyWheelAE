import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { ConfiguredCommand } from '../../types';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

interface ActionPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCommand: (cmd: ConfiguredCommand) => void;
  currentCommand: ConfiguredCommand | null;
}

interface CommandTypeOption {
  id: string;
  name: string;
  description: string;
  category: string;
}

const COMMAND_TYPES: CommandTypeOption[] = [
  { id: 'launch_app', name: 'Launch Application', description: 'Run a program executable (.exe) with optional arguments and directory settings.', category: 'System' },
  { id: 'open_folder', name: 'Open Folder', description: 'Open a local directory inside Windows File Explorer.', category: 'System' },
  { id: 'open_file', name: 'Open File', description: 'Open a local document, media, or project file with its default program.', category: 'System' },
  { id: 'open_website', name: 'Open Website', description: 'Open a web page URL with your default browser or a specific choice.', category: 'Web' },
  { id: 'run_script', name: 'Run Script', description: 'Run a batch, PowerShell, Python, or shell script.', category: 'Development' },
  { id: 'send_shortcut', name: 'Send Keyboard Shortcut', description: 'Record and simulate a key sequence sequence (e.g. Ctrl + Shift + S).', category: 'Macros' },
  { id: 'after_effects_command', name: 'After Effects Command', description: 'Trigger built-in After Effects radial functions.', category: 'Adobe Integration' },
  { id: 'photoshop_command', name: 'Photoshop Command', description: 'Trigger built-in Photoshop editor functions.', category: 'Adobe Integration' },
];

function generateDefaultLabel(commandId: string, params: Record<string, any>): string {
  switch (commandId) {
    case 'launch_app': {
      if (!params.path) return '';
      const parts = params.path.split(/[/\\]/);
      const filename = parts[parts.length - 1];
      const filenameLower = filename.toLowerCase();
      if (filenameLower.includes('afterfx.exe')) return 'After Effects';
      if (filenameLower.includes('chrome.exe')) return 'Google Chrome';
      if (filenameLower.includes('code.exe')) return 'VS Code';
      if (filenameLower.includes('photoshop.exe')) return 'Photoshop';
      if (filenameLower.includes('calc.exe')) return 'Calculator';
      if (filenameLower.includes('explorer.exe')) return 'Explorer';
      // Strip extension
      return filename.replace(/\.[^/.]+$/, '');
    }
    case 'open_website': {
      if (!params.url) return '';
      try {
        const urlObj = new URL(params.url.startsWith('http') ? params.url : 'https://' + params.url);
        return urlObj.hostname.replace('www.', '');
      } catch {
        return 'Website';
      }
    }
    case 'open_folder': {
      if (!params.path) return '';
      const parts = params.path.split(/[/\\]/);
      return parts[parts.length - 1] || 'Folder';
    }
    case 'open_file': {
      if (!params.path) return '';
      const parts = params.path.split(/[/\\]/);
      return parts[parts.length - 1] || 'File';
    }
    case 'run_script': {
      if (!params.path) return '';
      const parts = params.path.split(/[/\\]/);
      return parts[parts.length - 1] || 'Script';
    }
    case 'send_shortcut': {
      if (!params.keys || params.keys.length === 0) return '';
      return params.keys.map((k: string) => {
        if (k === 'ControlLeft' || k === 'ControlRight') return 'Ctrl';
        if (k === 'ShiftLeft' || k === 'ShiftRight') return 'Shift';
        if (k === 'Alt') return 'Alt';
        if (k === 'MetaLeft') return 'Win';
        if (k.startsWith('Key')) return k.substring(3);
        if (k.startsWith('Num')) return k.substring(3);
        return k;
      }).join('+');
    }
    case 'after_effects_command': {
      const cmd = params.command || 'easy_ease';
      switch (cmd) {
        case 'easy_ease': return 'Easy Ease';
        case 'pre_compose': return 'Pre-Compose';
        case 'trim_paths': return 'Trim Paths';
        case 'graph_editor': return 'Graph Editor';
        case 'duplicate_layer': return 'Duplicate';
        case 'parent': return 'Parent';
        default: return cmd;
      }
    }
    case 'photoshop_command': {
      const cmd = params.command || 'brush';
      switch (cmd) {
        case 'brush': return 'Brush';
        case 'eraser': return 'Eraser';
        case 'gradient': return 'Gradient';
        case 'crop': return 'Crop';
        case 'duplicate': return 'Duplicate';
        default: return cmd;
      }
    }
    default:
      return '';
  }
}

export function ActionPicker({
  isOpen,
  onClose,
  onSelectCommand,
  currentCommand,
}: ActionPickerProps): React.JSX.Element {
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Label configuration states
  const [customLabel, setCustomLabel] = useState('');
  const [isLabelCustomized, setIsLabelCustomized] = useState(false);

  // Parameter states
  const [launchPath, setLaunchPath] = useState('');
  const [launchArgs, setLaunchArgs] = useState('');
  const [launchDir, setLaunchDir] = useState('');
  const [launchAdmin, setLaunchAdmin] = useState(false);

  const [webUrl, setWebUrl] = useState('');
  const [webBrowser, setWebBrowser] = useState('default');

  const [folderPath, setFolderPath] = useState('');
  const [filePath, setFilePath] = useState('');

  const [scriptPath, setScriptPath] = useState('');
  const [scriptArgs, setScriptArgs] = useState('');

  const [shortcutKeys, setShortcutKeys] = useState<string[]>([]);
  const [isRecording, setIsRecording] = useState(false);

  const [aeCommand, setAeCommand] = useState('easy_ease');
  const [psCommand, setPsCommand] = useState('brush');

  // Pre-fill fields if we are editing an existing command of the active type
  useEffect(() => {
    if (isOpen) {
      if (currentCommand) {
        setSelectedType(currentCommand.command);
        setCustomLabel(currentCommand.label || '');
        setIsLabelCustomized(!!currentCommand.label);
        const p = currentCommand.parameters || {};
        
        // Populate inputs based on type
        if (currentCommand.command === 'launch_app') {
          setLaunchPath(p.path || '');
          setLaunchArgs(p.arguments || '');
          setLaunchDir(p.working_directory || '');
          setLaunchAdmin(p.run_as_admin || false);
        } else if (currentCommand.command === 'open_website') {
          setWebUrl(p.url || '');
          setWebBrowser(p.browser || 'default');
        } else if (currentCommand.command === 'open_folder') {
          setFolderPath(p.path || '');
        } else if (currentCommand.command === 'open_file') {
          setFilePath(p.path || '');
        } else if (currentCommand.command === 'run_script') {
          setScriptPath(p.path || '');
          setScriptArgs(p.arguments || '');
        } else if (currentCommand.command === 'send_shortcut') {
          setShortcutKeys(p.keys || []);
        } else if (currentCommand.command === 'after_effects_command') {
          setAeCommand(p.command || 'easy_ease');
        } else if (currentCommand.command === 'photoshop_command') {
          setPsCommand(p.command || 'brush');
        }
      } else {
        setSelectedType(null);
        setErrorMsg(null);
        setCustomLabel('');
        setIsLabelCustomized(false);
        resetStates();
      }
    }
  }, [isOpen, currentCommand]);

  const resetStates = () => {
    setLaunchPath('');
    setLaunchArgs('');
    setLaunchDir('');
    setLaunchAdmin(false);
    setWebUrl('');
    setWebBrowser('default');
    setFolderPath('');
    setFilePath('');
    setScriptPath('');
    setScriptArgs('');
    setShortcutKeys([]);
    setIsRecording(false);
    setAeCommand('easy_ease');
    setPsCommand('brush');
    setErrorMsg(null);
  };

  // Helper to compute dynamic default label
  const computeDefaultLabel = () => {
    if (!selectedType) return '';
    let params: Record<string, any> = {};
    if (selectedType === 'launch_app') params = { path: launchPath };
    else if (selectedType === 'open_website') params = { url: webUrl };
    else if (selectedType === 'open_folder') params = { path: folderPath };
    else if (selectedType === 'open_file') params = { path: filePath };
    else if (selectedType === 'run_script') params = { path: scriptPath };
    else if (selectedType === 'send_shortcut') params = { keys: shortcutKeys };
    else if (selectedType === 'after_effects_command') params = { command: aeCommand };
    else if (selectedType === 'photoshop_command') params = { command: psCommand };
    return generateDefaultLabel(selectedType, params);
  };

  // Automatically update the display label if the user has not overridden it
  useEffect(() => {
    if (!isLabelCustomized && selectedType) {
      setCustomLabel(computeDefaultLabel());
    }
  }, [
    selectedType,
    launchPath,
    webUrl,
    folderPath,
    filePath,
    scriptPath,
    shortcutKeys,
    aeCommand,
    psCommand,
    isLabelCustomized
  ]);

  // Browse click handlers invoking native Tauri file dialogs
  const handleBrowseExecutable = async () => {
    try {
      const selected = await invoke<string | null>('pick_executable');
      if (selected) setLaunchPath(selected);
    } catch (e) {
      console.error(e);
    }
  };

  const handleBrowseFolder = async (type: 'launch' | 'open') => {
    try {
      const selected = await invoke<string | null>('pick_folder');
      if (selected) {
        if (type === 'launch') setLaunchDir(selected);
        else setFolderPath(selected);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleBrowseFile = async (type: 'file' | 'script') => {
    try {
      const selected = await invoke<string | null>('pick_file');
      if (selected) {
        if (type === 'file') setFilePath(selected);
        else setScriptPath(selected);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Keyboard shortcut recorder
  const handleShortcutKeyDown = (e: React.KeyboardEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.key === 'Escape') {
      setIsRecording(false);
      return;
    }

    const keyName = e.code;
    let normalized = keyName;

    // Normalise modifier codes to match parse_rdev_key on backend
    if (keyName === 'ControlLeft' || keyName === 'ControlRight') normalized = 'ControlLeft';
    else if (keyName === 'ShiftLeft' || keyName === 'ShiftRight') normalized = 'ShiftLeft';
    else if (keyName === 'AltLeft' || keyName === 'AltRight') normalized = 'Alt';
    else if (keyName === 'MetaLeft' || keyName === 'MetaRight') normalized = 'MetaLeft';
    else if (keyName.startsWith('Digit')) normalized = 'Num' + keyName.substring(5);

    if (!shortcutKeys.includes(normalized)) {
      setShortcutKeys((prev) => [...prev, normalized]);
    }
  };

  const handleSave = () => {
    setErrorMsg(null);

    if (!selectedType) return;

    let parameters: Record<string, any> = {};

    // Validate parameters on frontend before saving
    switch (selectedType) {
      case 'launch_app':
        if (!launchPath.trim()) {
          setErrorMsg('Executable path is required.');
          return;
        }
        parameters = {
          path: launchPath.trim(),
          arguments: launchArgs.trim() || null,
          working_directory: launchDir.trim() || null,
          run_as_admin: launchAdmin,
        };
        break;

      case 'open_website':
        if (!webUrl.trim()) {
          setErrorMsg('URL is required.');
          return;
        }
        if (!webUrl.startsWith('http://') && !webUrl.startsWith('https://')) {
          setErrorMsg('URL must start with http:// or https://');
          return;
        }
        parameters = {
          url: webUrl.trim(),
          browser: webBrowser,
        };
        break;

      case 'open_folder':
        if (!folderPath.trim()) {
          setErrorMsg('Folder path is required.');
          return;
        }
        parameters = { path: folderPath.trim() };
        break;

      case 'open_file':
        if (!filePath.trim()) {
          setErrorMsg('File path is required.');
          return;
        }
        parameters = { path: filePath.trim() };
        break;

      case 'run_script':
        if (!scriptPath.trim()) {
          setErrorMsg('Script path is required.');
          return;
        }
        parameters = {
          path: scriptPath.trim(),
          arguments: scriptArgs.trim() || null,
        };
        break;

      case 'send_shortcut':
        if (shortcutKeys.length === 0) {
          setErrorMsg('Please record at least one key for the shortcut.');
          return;
        }
        parameters = { keys: shortcutKeys };
        break;

      case 'after_effects_command':
        parameters = { command: aeCommand };
        break;

      case 'photoshop_command':
        parameters = { command: psCommand };
        break;

      default:
        break;
    }

    const finalLabel = customLabel.trim() || computeDefaultLabel();

    onSelectCommand({
      command: selectedType,
      label: finalLabel,
      parameters,
    });
    onClose();
  };

  const categories = Array.from(new Set(COMMAND_TYPES.map((c) => c.category)));

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={selectedType ? `Configure ${COMMAND_TYPES.find((c) => c.id === selectedType)?.name}` : 'Select Command Type'}
      size={selectedType ? 'md' : 'lg'}
    >
      <div className="flex flex-col gap-4 text-left">
        {errorMsg && (
          <div className="px-3 py-2 bg-red-950/40 border border-red-900/60 rounded-lg text-xs font-medium text-red-400">
            {errorMsg}
          </div>
        )}

        {/* View 1: Command Type Picker */}
        {!selectedType ? (
          <div className="flex flex-col gap-5 max-h-[60vh] overflow-y-auto pr-1">
            {categories.map((cat) => (
              <div key={cat} className="flex flex-col gap-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{cat}</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {COMMAND_TYPES.filter((c) => c.category === cat).map((opt) => (
                    <div
                      key={opt.id}
                      onClick={() => setSelectedType(opt.id)}
                      className="p-3 rounded-xl border border-zinc-800 bg-zinc-950/20 hover:bg-zinc-800/20 hover:border-zinc-700 transition-all cursor-pointer flex flex-col gap-1 group"
                    >
                      <span className="font-semibold text-zinc-200 text-sm group-hover:text-brand-primary transition-colors">
                        {opt.name}
                      </span>
                      <span className="text-xs text-zinc-400 line-clamp-2">
                        {opt.description}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* View 2: Parameter Editor */
          <div className="flex flex-col gap-4">
            
            {/* Customizable Display Label Input */}
            <div className="flex flex-col gap-1">
              <label className="text-xs text-zinc-400 font-medium">Display Label</label>
              <input
                type="text"
                value={customLabel}
                onChange={(e) => {
                  setCustomLabel(e.target.value);
                  setIsLabelCustomized(true);
                }}
                placeholder="Enter custom label..."
                className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 focus:border-brand-primary rounded-lg text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-brand-primary"
              />
            </div>

            {selectedType === 'launch_app' && (
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-zinc-400 font-medium">Executable Path (*.exe)</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={launchPath}
                      onChange={(e) => setLaunchPath(e.target.value)}
                      placeholder="C:\Program Files\..."
                      className="flex-1 px-3 py-1.5 bg-zinc-900 border border-zinc-800 focus:border-brand-primary rounded-lg text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-brand-primary font-mono"
                    />
                    <Button variant="secondary" size="sm" onClick={handleBrowseExecutable}>
                      Browse
                    </Button>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs text-zinc-400 font-medium">Arguments (Optional)</label>
                  <input
                    type="text"
                    value={launchArgs}
                    onChange={(e) => setLaunchArgs(e.target.value)}
                    placeholder="--verbose --mode=active"
                    className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 focus:border-brand-primary rounded-lg text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-brand-primary"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs text-zinc-400 font-medium">Working Directory (Optional)</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={launchDir}
                      onChange={(e) => setLaunchDir(e.target.value)}
                      placeholder="C:\..."
                      className="flex-1 px-3 py-1.5 bg-zinc-900 border border-zinc-800 focus:border-brand-primary rounded-lg text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-brand-primary font-mono"
                    />
                    <Button variant="secondary" size="sm" onClick={() => handleBrowseFolder('launch')}>
                      Browse
                    </Button>
                  </div>
                </div>

                <label className="flex items-center gap-2 text-xs text-zinc-300 font-medium cursor-pointer mt-1 select-none">
                  <input
                    type="checkbox"
                    checked={launchAdmin}
                    onChange={(e) => setLaunchAdmin(e.target.checked)}
                    className="accent-brand-primary w-4 h-4 rounded border-zinc-800 bg-zinc-900"
                  />
                  Run as Administrator (Elevation)
                </label>
              </div>
            )}

            {selectedType === 'open_website' && (
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-zinc-400 font-medium">Website URL</label>
                  <input
                    type="text"
                    value={webUrl}
                    onChange={(e) => setWebUrl(e.target.value)}
                    placeholder="https://www.google.com"
                    className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 focus:border-brand-primary rounded-lg text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-brand-primary font-mono"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs text-zinc-400 font-medium">Browser Choice</label>
                  <select
                    value={webBrowser}
                    onChange={(e) => setWebBrowser(e.target.value)}
                    className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 focus:border-brand-primary rounded-lg text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-brand-primary cursor-pointer"
                  >
                    <option value="default">Default Browser</option>
                    <option value="chrome">Google Chrome</option>
                    <option value="edge">Microsoft Edge</option>
                    <option value="firefox">Mozilla Firefox</option>
                  </select>
                </div>
              </div>
            )}

            {selectedType === 'open_folder' && (
              <div className="flex flex-col gap-1">
                <label className="text-xs text-zinc-400 font-medium">Folder Path</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={folderPath}
                    onChange={(e) => setFolderPath(e.target.value)}
                    placeholder="C:\Users\..."
                    className="flex-1 px-3 py-1.5 bg-zinc-900 border border-zinc-800 focus:border-brand-primary rounded-lg text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-brand-primary font-mono"
                  />
                  <Button variant="secondary" size="sm" onClick={() => handleBrowseFolder('open')}>
                    Browse
                  </Button>
                </div>
              </div>
            )}

            {selectedType === 'open_file' && (
              <div className="flex flex-col gap-1">
                <label className="text-xs text-zinc-400 font-medium">File Path</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={filePath}
                    onChange={(e) => setFilePath(e.target.value)}
                    placeholder="C:\Users\...\document.pdf"
                    className="flex-1 px-3 py-1.5 bg-zinc-900 border border-zinc-800 focus:border-brand-primary rounded-lg text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-brand-primary font-mono"
                  />
                  <Button variant="secondary" size="sm" onClick={() => handleBrowseFile('file')}>
                    Browse
                  </Button>
                </div>
              </div>
            )}

            {selectedType === 'run_script' && (
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-zinc-400 font-medium">Script File Path</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={scriptPath}
                      onChange={(e) => setScriptPath(e.target.value)}
                      placeholder="C:\...\script.bat"
                      className="flex-1 px-3 py-1.5 bg-zinc-900 border border-zinc-800 focus:border-brand-primary rounded-lg text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-brand-primary font-mono"
                    />
                    <Button variant="secondary" size="sm" onClick={() => handleBrowseFile('script')}>
                      Browse
                    </Button>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs text-zinc-400 font-medium">Script Arguments (Optional)</label>
                  <input
                    type="text"
                    value={scriptArgs}
                    onChange={(e) => setScriptArgs(e.target.value)}
                    placeholder="-File arg1 arg2"
                    className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 focus:border-brand-primary rounded-lg text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-brand-primary"
                  />
                </div>
              </div>
            )}

            {selectedType === 'send_shortcut' && (
              <div className="flex flex-col gap-2">
                <label className="text-xs text-zinc-400 font-medium">Recorded Shortcut</label>
                <div
                  tabIndex={0}
                  onKeyDown={handleShortcutKeyDown}
                  onFocus={() => {
                    setIsRecording(true);
                    setShortcutKeys([]);
                  }}
                  onBlur={() => setIsRecording(false)}
                  className={`px-3 py-2 bg-zinc-900 border rounded-lg text-xs font-mono min-h-[38px] flex items-center justify-between focus:outline-none transition-all ${
                    isRecording
                      ? 'border-brand-primary ring-1 ring-brand-primary text-zinc-200'
                      : 'border-zinc-800 text-zinc-400'
                  }`}
                >
                  <span>
                    {shortcutKeys.length > 0
                      ? shortcutKeys.join(' + ')
                      : isRecording
                      ? 'Press key combinations now...'
                      : 'Click to start recording...'}
                  </span>
                  {shortcutKeys.length > 0 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShortcutKeys([]);
                      }}
                      className="text-[10px] text-red-400 hover:text-red-300 ml-2 cursor-pointer font-sans"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <p className="text-[10px] text-zinc-500 mt-1">
                  Focus the input box and press modifier combinations (e.g. Ctrl + Shift + S). Esc stops recording.
                </p>
              </div>
            )}

            {selectedType === 'after_effects_command' && (
              <div className="flex flex-col gap-1">
                <label className="text-xs text-zinc-400 font-medium">After Effects Preset Function</label>
                <select
                  value={aeCommand}
                  onChange={(e) => setAeCommand(e.target.value)}
                  className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 focus:border-brand-primary rounded-lg text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-brand-primary cursor-pointer"
                >
                  <option value="easy_ease">Easy Ease</option>
                  <option value="pre_compose">Pre-Compose</option>
                  <option value="trim_paths">Trim Paths</option>
                  <option value="graph_editor">Graph Editor</option>
                  <option value="duplicate_layer">Duplicate Layer</option>
                  <option value="parent">Parent Picker</option>
                </select>
              </div>
            )}

            {selectedType === 'photoshop_command' && (
              <div className="flex flex-col gap-1">
                <label className="text-xs text-zinc-400 font-medium">Photoshop Preset Function</label>
                <select
                  value={psCommand}
                  onChange={(e) => setPsCommand(e.target.value)}
                  className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 focus:border-brand-primary rounded-lg text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-brand-primary cursor-pointer"
                >
                  <option value="brush">Brush Tool</option>
                  <option value="eraser">Eraser Tool</option>
                  <option value="gradient">Gradient Tool</option>
                  <option value="crop">Crop Tool</option>
                  <option value="duplicate">Duplicate Item</option>
                </select>
              </div>
            )}

            {/* Buttons */}
            <div className="flex justify-end gap-2 border-t border-zinc-800 pt-3 mt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedType(null);
                  setErrorMsg(null);
                }}
              >
                Back
              </Button>
              <Button variant="primary" size="sm" onClick={handleSave}>
                Save Command
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
