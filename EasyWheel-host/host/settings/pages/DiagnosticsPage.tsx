import React, { useEffect, useState } from 'react';
import { PageLayout } from '../components/layout/PageLayout';
import { invoke } from '@tauri-apps/api/core';

interface DiagnosticsInfo {
  version: string;
  config_path: string;
  app_data_path: string;
  program_files_path: string;
  ae_status: string;
  browser_status: string;
  profiles: string[];
}

export function DiagnosticsPage(): React.JSX.Element {
  const [info, setInfo] = useState<DiagnosticsInfo | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchDiagnostics = async () => {
    try {
      const res = await invoke<DiagnosticsInfo>('get_diagnostics_info');
      setInfo(res);
    } catch (e) {
      console.error('Failed to fetch diagnostics info:', e);
    }
  };

  useEffect(() => {
    fetchDiagnostics();
    const timer = setInterval(fetchDiagnostics, 3000);
    return () => clearInterval(timer);
  }, []);

  const handleCopyReport = () => {
    if (!info) return;
    const report = `\`\`\`markdown
# EasyWheel Diagnostics Report
- Version: ${info.version}
- After Effects Bridge: ${info.ae_status}
- Browser Bridge: ${info.browser_status}
- AppData Directory: ${info.app_data_path}
- Config File Path: ${info.config_path}
- Installation Path: ${info.program_files_path}
- Profiles Loaded (${info.profiles.length}): ${info.profiles.join(', ') || 'None'}
\`\`\``;
    navigator.clipboard.writeText(report);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!info) {
    return (
      <div className="flex-1 flex items-center justify-center text-zinc-500 text-sm bg-zinc-950">
        Retrieving self-diagnostics info...
      </div>
    );
  }

  return (
    <PageLayout
      title="System Diagnostics"
      description="Inspect active communication bridges, system file directories, and loaded profiles."
    >
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Status Dashboard Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-5 bg-zinc-900/30 border border-zinc-800 rounded-xl flex flex-col justify-between h-32">
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">EasyWheel Host</span>
            <div className="flex justify-between items-baseline mt-2">
              <span className="text-2xl font-bold text-zinc-100 font-mono">v{info.version}</span>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded font-medium">Running</span>
            </div>
          </div>

          <div className="p-5 bg-zinc-900/30 border border-zinc-800 rounded-xl flex flex-col justify-between h-32">
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">After Effects Bridge</span>
            <div className="flex justify-between items-baseline mt-2">
              <span className="text-lg font-bold text-zinc-200">{info.ae_status}</span>
              <span className={`w-3 h-3 rounded-full ${info.ae_status === 'Connected' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
            </div>
          </div>

          <div className="p-5 bg-zinc-900/30 border border-zinc-800 rounded-xl flex flex-col justify-between h-32">
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Browser Bridge</span>
            <div className="flex justify-between items-baseline mt-2">
              <span className="text-lg font-bold text-zinc-200">{info.browser_status}</span>
              <span className={`w-3 h-3 rounded-full ${info.browser_status === 'Connected' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
            </div>
          </div>
        </div>

        {/* Directory Paths Section */}
        <div className="p-6 bg-zinc-900/20 border border-zinc-800 rounded-xl space-y-4">
          <h3 className="text-sm font-semibold text-zinc-300">Application Directories</h3>
          
          <div className="space-y-3.5 divide-y divide-zinc-800/40 text-xs">
            <div className="pt-0 flex flex-col gap-1">
              <span className="text-zinc-500 font-medium">Configuration File Path</span>
              <code className="text-indigo-300 bg-zinc-950/60 p-2 rounded border border-zinc-800/50 font-mono break-all select-all block mt-0.5">
                {info.config_path}
              </code>
            </div>

            <div className="pt-3 flex flex-col gap-1">
              <span className="text-zinc-500 font-medium">AppData User Space Directory</span>
              <code className="text-indigo-300 bg-zinc-950/60 p-2 rounded border border-zinc-800/50 font-mono break-all select-all block mt-0.5">
                {info.app_data_path}
              </code>
            </div>

            <div className="pt-3 flex flex-col gap-1">
              <span className="text-zinc-500 font-medium">Program Files Binaries Folder</span>
              <code className="text-indigo-300 bg-zinc-950/60 p-2 rounded border border-zinc-800/50 font-mono break-all select-all block mt-0.5">
                {info.program_files_path}
              </code>
            </div>
          </div>
        </div>

        {/* Loaded Profiles Summary */}
        <div className="p-6 bg-zinc-900/20 border border-zinc-800 rounded-xl space-y-4">
          <h3 className="text-sm font-semibold text-zinc-300">Active Profiles ({info.profiles.length})</h3>
          {info.profiles.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {info.profiles.map((p, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 text-xs font-semibold rounded-lg font-mono"
                >
                  {p}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-zinc-500">No profile configuration records are currently parsed.</p>
          )}
        </div>

        {/* Copy Report / Actions Section */}
        <div className="flex justify-end gap-3 border-t border-zinc-800/60 pt-6">
          <button
            onClick={handleCopyReport}
            className="px-6 py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-300 text-xs font-semibold rounded-lg cursor-pointer transition-all"
          >
            {copied ? '✔ Copied Report to Clipboard!' : '📋 Copy Diagnostic Report'}
          </button>
        </div>

      </div>
    </PageLayout>
  );
}
