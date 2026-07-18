import React, { useState, useEffect } from 'react';
import type { RunningApp } from '../../types';
import { getRunningApps } from '../../../ipc/settings';
import { Modal } from '../ui/Modal';
import { SearchBar } from '../ui/SearchBar';
import { Button } from '../ui/Button';

interface RunningAppsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectApp: (app: RunningApp) => void;
}

export function RunningAppsDialog({
  isOpen,
  onClose,
  onSelectApp,
}: RunningAppsDialogProps): React.JSX.Element {
  const [apps, setApps] = useState<RunningApp[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const fetchApps = async () => {
      setLoading(true);
      setError(null);
      try {
        const list = await getRunningApps();
        setApps(list);
      } catch (err: unknown) {
        setError('Failed to enumerate running processes.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchApps();
  }, [isOpen]);

  const filteredApps = apps.filter((app) => {
    return (
      app.name.toLowerCase().includes(search.toLowerCase()) ||
      app.executable.toLowerCase().includes(search.toLowerCase()) ||
      app.path.toLowerCase().includes(search.toLowerCase())
    );
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Profile from Running Application"
      size="lg"
    >
      <div className="flex flex-col gap-4">
        {/* Search */}
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search running applications..."
        />

        {/* List */}
        <div className="border border-zinc-800 rounded-lg bg-zinc-950/20 max-h-[50vh] overflow-y-auto min-h-[200px]">
          {loading && (
            <div className="py-12 text-center text-zinc-400 text-sm flex flex-col items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5 text-brand-primary" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>Scanning running processes...</span>
            </div>
          )}

          {!loading && error && (
            <div className="py-12 text-center text-red-400 text-sm">
              {error}
            </div>
          )}

          {!loading && !error && filteredApps.length === 0 && (
            <div className="py-12 text-center text-zinc-500 text-sm">
              {apps.length === 0 ? 'No running desktop applications detected.' : 'No matches found.'}
            </div>
          )}

          {!loading && !error && filteredApps.length > 0 && (
            <div className="divide-y divide-zinc-800">
              {filteredApps.map((app) => (
                <div
                  key={app.executable}
                  className="flex items-center justify-between p-3 hover:bg-zinc-800/20 transition-colors"
                >
                  <div className="flex flex-col text-left max-w-[70%]">
                    <span className="font-semibold text-zinc-200 text-sm">{app.name}</span>
                    <span className="text-[10px] text-zinc-500 font-mono truncate">{app.path}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs bg-zinc-800 px-2 py-1 rounded text-zinc-400 font-mono">
                      {app.executable}
                    </span>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        onSelectApp(app);
                        onClose();
                      }}
                    >
                      Use App
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
