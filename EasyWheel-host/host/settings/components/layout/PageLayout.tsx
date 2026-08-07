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
    <div
      className="flex-1 flex flex-col h-full overflow-hidden"
      style={{ color: 'var(--color-text)' }}
    >
      {/* Title Header bar */}
      <header
        className="px-8 py-5 flex items-center justify-between flex-shrink-0"
        style={{
          borderBottom: '1px solid var(--color-border)',
          background: 'linear-gradient(180deg, var(--color-nav) 0%, var(--color-bg) 100%)',
        }}
      >
        <div className="flex flex-col text-left">
          <h2
            className="text-xl font-bold tracking-tight"
            style={{ color: 'var(--color-text)' }}
          >
            {title}
          </h2>
          {description && (
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
              {description}
            </p>
          )}
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
