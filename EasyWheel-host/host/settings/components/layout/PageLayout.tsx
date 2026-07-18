import React from 'react';
import { useConfig } from '../../context/ConfigContext';
import { Button } from '../ui/Button';
import { ValidationMessage } from '../ui/ValidationMessage';

interface PageLayoutProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

export function PageLayout({
  title,
  description,
  actions,
  children,
}: PageLayoutProps): React.JSX.Element {
  const { error, clearError, dirty, saveChanges, saving } = useConfig();

  return (
    <div className="flex-1 flex flex-col h-full bg-zinc-900/10 text-zinc-100 overflow-hidden">
      {/* Title Header bar */}
      <header className="px-8 py-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/20 flex-shrink-0">
        <div className="flex flex-col text-left">
          <h2 className="text-xl font-bold text-zinc-100 tracking-tight">{title}</h2>
          {description && <p className="text-xs text-zinc-400 mt-1">{description}</p>}
        </div>
        <div className="flex items-center gap-3">
          {actions}
          {dirty && (
            <Button
              variant="primary"
              size="sm"
              disabled={saving}
              onClick={saveChanges}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          )}
        </div>
      </header>

      {/* Main Inner scroll area */}
      <main className="flex-1 overflow-y-auto px-8 py-6 flex flex-col gap-6">
        {/* Error Alert Box */}
        <ValidationMessage
          message={error}
          type="error"
          onClear={clearError}
          className="w-full flex-shrink-0"
        />

        <div className="flex-1 min-h-0 flex flex-col">
          {children}
        </div>
      </main>
    </div>
  );
}
