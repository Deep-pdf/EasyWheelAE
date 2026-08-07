import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export function Button({
  variant = 'secondary',
  size = 'md',
  children,
  className = '',
  disabled,
  style,
  ...props
}: ButtonProps): React.JSX.Element {
  const baseStyle = "inline-flex items-center justify-center font-medium rounded-lg transition-all duration-150 focus:outline-none disabled:opacity-50 disabled:pointer-events-none cursor-pointer";

  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-5 py-2.5 text-base",
  };

  const variantStyles: Record<string, React.CSSProperties> = {
    primary: {
      background: 'var(--color-primary)',
      color: '#fff',
      border: '1px solid transparent',
      boxShadow: '0 1px 6px rgba(255,67,101,0.25)',
    },
    secondary: {
      background: 'var(--color-surface-elevated)',
      color: 'var(--color-text)',
      border: '1px solid var(--color-border-strong)',
    },
    danger: {
      background: 'var(--color-danger-bg)',
      color: 'var(--color-danger)',
      border: '1px solid var(--color-danger-border)',
    },
    ghost: {
      background: 'transparent',
      color: 'var(--color-text-muted)',
      border: '1px solid transparent',
    },
  };

  const hoverHandlers =
    variant === 'primary'
      ? {
          onMouseEnter: (e: React.MouseEvent<HTMLButtonElement>) => {
            (e.currentTarget as HTMLElement).style.background = 'var(--color-primary-hover)';
          },
          onMouseLeave: (e: React.MouseEvent<HTMLButtonElement>) => {
            (e.currentTarget as HTMLElement).style.background = 'var(--color-primary)';
          },
        }
      : variant === 'secondary'
      ? {
          onMouseEnter: (e: React.MouseEvent<HTMLButtonElement>) => {
            (e.currentTarget as HTMLElement).style.background = 'var(--color-surface-hover)';
          },
          onMouseLeave: (e: React.MouseEvent<HTMLButtonElement>) => {
            (e.currentTarget as HTMLElement).style.background = 'var(--color-surface-elevated)';
          },
        }
      : variant === 'danger'
      ? {
          onMouseEnter: (e: React.MouseEvent<HTMLButtonElement>) => {
            (e.currentTarget as HTMLElement).style.background = 'var(--color-danger)';
            (e.currentTarget as HTMLElement).style.color = '#fff';
          },
          onMouseLeave: (e: React.MouseEvent<HTMLButtonElement>) => {
            (e.currentTarget as HTMLElement).style.background = 'var(--color-danger-bg)';
            (e.currentTarget as HTMLElement).style.color = 'var(--color-danger)';
          },
        }
      : {
          onMouseEnter: (e: React.MouseEvent<HTMLButtonElement>) => {
            (e.currentTarget as HTMLElement).style.background = 'var(--color-surface-elevated)';
            (e.currentTarget as HTMLElement).style.color = 'var(--color-text)';
          },
          onMouseLeave: (e: React.MouseEvent<HTMLButtonElement>) => {
            (e.currentTarget as HTMLElement).style.background = 'transparent';
            (e.currentTarget as HTMLElement).style.color = 'var(--color-text-muted)';
          },
        };

  return (
    <button
      className={`${baseStyle} ${sizes[size]} ${className}`}
      disabled={disabled}
      style={{ ...variantStyles[variant], ...style }}
      {...hoverHandlers}
      {...props}
    >
      {children}
    </button>
  );
}
