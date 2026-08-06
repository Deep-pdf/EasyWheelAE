import React, { useEffect, useState } from 'react';
import { useConfig } from '../context/ConfigContext';
import { invoke } from '@tauri-apps/api/core';

interface WizardStatus {
  config_ready: boolean;
  ae_installed: boolean;
  ae_connected: boolean;
  browser_connected: boolean;
  version: string;
}

export function WizardPage(): React.JSX.Element {
  const { config, updateGlobal, saveChanges } = useConfig();
  const [status, setStatus] = useState<WizardStatus | null>(null);
  const [installingAe, setInstallingAe] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [aeMessage, setAeMessage] = useState<string | null>(null);

  // Poll status from the backend
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await invoke<WizardStatus>('get_wizard_status');
        setStatus(res);
      } catch (e) {
        console.error('Failed to get wizard status:', e);
      }
    };
    fetchStatus();
    const timer = setInterval(fetchStatus, 1500);
    return () => clearInterval(timer);
  }, []);

  const handleInstallAe = async () => {
    setInstallingAe(true);
    setAeMessage(null);
    try {
      await invoke('install_ae_extension');
      setAeMessage('Extension files copied! Please open After Effects and launch the EasyWheelAE panel under Window -> Extensions.');
    } catch (e: any) {
      setAeMessage(`Installation failed: ${e}`);
    } finally {
      setInstallingAe(false);
    }
  };

  const handleOpenBrowserFolder = async () => {
    try {
      await invoke('open_browser_extension_folder');
    } catch (e) {
      alert(`Could not open browser extension directory: ${e}`);
    }
  };

  const handleFinish = async () => {
    updateGlobal({ first_run: false });
    // Save configuration and trigger save changes. The ConfigContext autosaves,
    // but manually saving ensures instant redirection.
    setTimeout(async () => {
      await saveChanges();
      // Reload window/redirect context is handled in SettingsApp or ConfigContext
      window.location.reload();
    }, 100);
  };

  if (!config) {
    return (
      <div className="flex-1 flex items-center justify-center text-zinc-500 text-sm bg-zinc-950">
        Loading Setup Wizard...
      </div>
    );
  }

  const { activation_modifier, activation_key } = config.global;

  return (
    <div className="flex-1 flex flex-col justify-between p-8 max-w-4xl mx-auto w-full h-full overflow-y-auto text-left select-none bg-zinc-950">
      {/* Header */}
      <div className="space-y-2 mt-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-primary to-indigo-400 flex items-center justify-center text-white font-extrabold shadow-md shadow-brand-primary/25 border border-indigo-400/20">
            EW
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100">EasyWheel Setup Wizard</h1>
        </div>
        <p className="text-sm text-zinc-400">
          Welcome to EasyWheel v{status?.version || '1.0.0'}. Let's verify your installation and connect your workspace extensions.
        </p>
      </div>

      {/* Grid of Checklists */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-8">
        
        {/* Core Checklist */}
        <div className="p-5 bg-zinc-900/40 border border-zinc-800 rounded-xl flex flex-col gap-4">
          <h3 className="text-sm font-semibold text-zinc-300">Core Services</h3>
          <div className="space-y-3.5">
            <div className="flex items-start gap-3">
              <span className="text-emerald-500 text-lg mt-0.5">✔</span>
              <div>
                <p className="text-sm font-medium text-zinc-200">Host Application</p>
                <p className="text-xs text-zinc-500">Tauri background engine is running correctly.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className={status?.config_ready ? "text-emerald-500 text-lg mt-0.5" : "text-amber-500 text-lg mt-0.5"}>
                {status?.config_ready ? "✔" : "⏳"}
              </span>
              <div>
                <p className="text-sm font-medium text-zinc-200">Configuration Ready</p>
                <p className="text-xs text-zinc-500">Settings directory initialised in AppData/EasyWheel.</p>
              </div>
            </div>

            <div className="flex items-start gap-3 border-t border-zinc-800/50 pt-3">
              <span className="text-indigo-400 text-lg mt-0.5">⌨</span>
              <div>
                <p className="text-sm font-medium text-zinc-200">Activation Hotkey</p>
                <p className="text-xs text-zinc-500 font-mono text-indigo-300">
                  {activation_modifier} + {activation_key}
                </p>
                <p className="text-[10px] text-zinc-500 mt-1">Press this key chord system-wide to show the radial wheel.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Extensions Checklist */}
        <div className="p-5 bg-zinc-900/40 border border-zinc-800 rounded-xl flex flex-col gap-4">
          <h3 className="text-sm font-semibold text-zinc-300">Adobe After Effects Extension</h3>
          <div className="space-y-4">
            
            <div className="flex items-start gap-3">
              <span className={status?.ae_connected ? "text-emerald-500 text-lg mt-0.5" : status?.ae_installed ? "text-amber-400 text-lg mt-0.5" : "text-zinc-600 text-lg mt-0.5"}>
                {status?.ae_connected ? "✔" : status?.ae_installed ? "⏳" : "○"}
              </span>
              <div className="flex-1">
                <div className="flex justify-between items-center">
                  <p className="text-sm font-medium text-zinc-200">CEP Panel Connection</p>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                    status?.ae_connected ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                    status?.ae_installed ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                    "bg-zinc-800 text-zinc-500"
                  }`}>
                    {status?.ae_connected ? "Connected" : status?.ae_installed ? "Waiting" : "Not Found"}
                  </span>
                </div>
                <p className="text-xs text-zinc-500 mt-0.5">
                  CEP panel must be loaded in After Effects to sync settings and execute commands.
                </p>

                {/* If not connected or installed, show install actions */}
                {!status?.ae_connected && (
                  <div className="mt-3 space-y-2.5">
                    <button
                      onClick={handleInstallAe}
                      disabled={installingAe}
                      className="w-full px-3 py-1.5 bg-brand-primary hover:bg-brand-hover text-white text-xs font-semibold rounded transition-all cursor-pointer disabled:opacity-50"
                    >
                      {installingAe ? 'Installing...' : 'Copy/Reinstall AE CEP Extension'}
                    </button>
                    {aeMessage && (
                      <p className="text-[10px] text-brand-primary leading-normal font-medium bg-brand-primary/5 p-2 rounded border border-brand-primary/10">
                        {aeMessage}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Browser Extension Checklist */}
      <div className="p-5 bg-zinc-900/40 border border-zinc-800 rounded-xl flex flex-col gap-4 mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-sm font-semibold text-zinc-300">Browser Extension (Optional)</h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              Allows the wheel to track active websites and launch web links directly into open tabs.
            </p>
          </div>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
            status?.browser_connected ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
            "bg-zinc-800 text-zinc-500"
          }`}>
            {status?.browser_connected ? "Connected" : "Offline"}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
          <button
            onClick={handleOpenBrowserFolder}
            className="px-3 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-300 text-xs font-medium rounded transition-all cursor-pointer"
          >
            📂 Open Extension Folder
          </button>
          
          <button
            onClick={() => setShowInstructions(prev => !prev)}
            className="px-3 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-300 text-xs font-medium rounded transition-all cursor-pointer"
          >
            📖 Installation Guide
          </button>

          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-300 text-xs font-medium rounded transition-all flex items-center justify-center gap-1.5"
          >
            🌐 Chrome Webstore Page
          </a>
        </div>

        {showInstructions && (
          <div className="text-xs text-zinc-400 bg-zinc-950/50 p-4 border border-zinc-800 rounded-lg space-y-2 leading-relaxed">
            <p className="font-semibold text-zinc-200">How to load the browser extension manually:</p>
            <ol className="list-decimal pl-5 space-y-1.5 text-zinc-400">
              <li>Click <strong className="text-zinc-300">Open Extension Folder</strong> above to find the files in Windows Explorer.</li>
              <li>Open your web browser (Chrome, Edge, Brave, or Opera) and navigate to the extension page (<code className="bg-zinc-900 px-1 py-0.5 rounded font-mono text-[10px]">chrome://extensions/</code>).</li>
              <li>Enable <strong className="text-zinc-300">Developer Mode</strong> in the top-right corner.</li>
              <li>Click <strong className="text-zinc-300">Load unpacked</strong> in the top-left and select the opened extension folder.</li>
              <li>The extension will connect to the bridge automatically and turn the status indicator green!</li>
            </ol>
          </div>
        )}
      </div>

      {/* Footer / Finish Button */}
      <div className="flex flex-col sm:flex-row justify-between items-center border-t border-zinc-800/60 pt-6 gap-4 mb-4">
        <p className="text-xs text-zinc-500 text-center sm:text-left">
          * Extensions are hot-swappable. You can verify and configure shortcuts in Settings at any time.
        </p>
        <button
          onClick={handleFinish}
          className="w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-brand-primary to-indigo-500 hover:from-brand-hover hover:to-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-brand-primary/25 hover:shadow-brand-hover/30 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer text-sm"
        >
          Finish Setup & Get Started
        </button>
      </div>
    </div>
  );
}
