import React from 'react';

interface ValidationMessageProps {
  message: string | null;
  type?: 'error' | 'warning' | 'success' | 'info';
  onClear?: () => void;
  className?: string;
}

export function ValidationMessage({
  message,
  type = 'error',
  onClear,
  className = '',
}: ValidationMessageProps): React.JSX.Element | null {
  if (!message) return null;

  const bgColors = {
    error: 'bg-red-500/10 border-red-500/20 text-red-400',
    warning: '',
    success: '',
    info: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
  };

  const inlineColors: Record<string, React.CSSProperties> = {
    error: {},
    warning: {
      background: 'rgba(249,205,173,0.10)',
      borderColor: 'rgba(249,205,173,0.28)',
      color: 'var(--color-warning)',
    },
    success: {
      background: 'rgba(131,175,155,0.10)',
      borderColor: 'rgba(131,175,155,0.28)',
      color: 'var(--color-secondary)',
    },
    info: {},
  };

  const icons = {
    error: (
      <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    warning: (
      <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    success: (
      <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    info: (
      <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  };

  return (
    <div
      className={`flex items-start gap-3 p-4 border rounded-lg text-sm ${
        type === 'error' || type === 'info' ? bgColors[type] : ''
      } ${className}`}
      style={inlineColors[type]}
    >
      {icons[type]}
      <div className="flex-1 font-medium">{message}</div>
      {onClear && (
        <button
          onClick={onClear}
          className="text-current opacity-70 hover:opacity-100 transition-opacity p-0.5"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}
