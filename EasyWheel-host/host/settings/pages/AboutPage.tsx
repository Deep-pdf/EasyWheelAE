import React from 'react';
import { PageLayout } from '../components/layout/PageLayout';
import { Button } from '../components/ui/Button';

export function AboutPage(): React.JSX.Element {
  const handleCheckUpdates = () => {
    alert('You are running the latest version of EasyWheelAE.');
  };

  return (
    <PageLayout
      title="About EasyWheel"
      description="EasyWheel Host background worker and settings editor utility details."
    >
      <div
        className="flex flex-col items-center justify-center py-8 text-center max-w-xl mx-auto gap-6 p-8 rounded-xl"
        style={{ background: 'var(--color-surface-elevated)', border: '1px solid var(--color-border)' }}
      >
        {/* Logo Icon */}
        <div
          className="w-20 h-20 rounded-2xl flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, rgba(255,67,101,0.25) 0%, rgba(252,144,154,0.18) 100%)',
            border: '1px solid rgba(255,67,101,0.35)',
            boxShadow: '0 0 24px rgba(255,67,101,0.18)',
          }}
        >
          <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: 'var(--color-primary)' }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          </svg>
        </div>

        {/* Title */}
        <div className="space-y-1">
          <h3 className="text-xl font-bold tracking-tight" style={{ color: 'var(--color-text)' }}>EasyWheelAE</h3>
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Radial Hotkey Trigger Utility for After Effects</p>
        </div>

        {/* Metadata Details table */}
        <div
          className="w-full divide-y text-sm font-medium"
          style={{ borderTop: '1px solid var(--color-border)', borderBottom: '1px solid var(--color-border)', divideColor: 'var(--color-border)' }}
        >
          {[
            { label: 'Version', value: '1.0.0', mono: true },
            { label: 'Build Number', value: '#2026.08.07', mono: true },
            { label: 'Author', value: 'EasyWheel Team', mono: false },
            { label: 'License', value: 'MIT License', mono: false },
          ].map(({ label, value, mono }) => (
            <div key={label} className="flex justify-between py-3">
              <span style={{ color: 'var(--color-text-muted)' }}>{label}</span>
              <span className={mono ? 'font-mono' : ''} style={{ color: 'var(--color-text)' }}>{value}</span>
            </div>
          ))}
        </div>

        {/* Action Link buttons */}
        <div className="flex flex-col sm:flex-row gap-3 w-full justify-center">
          <Button
            variant="secondary"
            onClick={() => window.open('https://github.com', '_blank')}
            className="flex-1 gap-2"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.579.688.481C19.137 20.162 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
            </svg>
            GitHub Repository
          </Button>

          <Button
            variant="primary"
            onClick={handleCheckUpdates}
            className="flex-1"
          >
            Check For Updates
          </Button>
        </div>
      </div>
    </PageLayout>
  );
}
