import React from 'react';

interface SliderProps {
  label: string;
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (value: number) => void;
  unit?: string;
  className?: string;
}

export function Slider({
  label,
  min,
  max,
  step = 1,
  value,
  onChange,
  unit = '',
  className = '',
}: SliderProps): React.JSX.Element {
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <div className="flex justify-between items-center text-sm">
        <span className="font-medium" style={{ color: 'var(--color-text-muted)' }}>{label}</span>
        <span
          className="font-semibold font-mono text-xs px-2 py-0.5 rounded"
          style={{
            color: 'var(--color-text)',
            background: 'var(--color-surface-elevated)',
            border: '1px solid var(--color-border)',
          }}
        >
          {value}{unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 rounded-lg appearance-none cursor-pointer focus:outline-none"
        style={{
          accentColor: 'var(--color-primary)',
          background: 'rgba(255, 255, 255, 0.08)',
          border: '1px solid rgba(255, 255, 255, 0.03)',
        }}
      />
      <div className="flex justify-between text-[10px] font-mono" style={{ color: 'var(--color-text-faint)' }}>
        <span>{min}{unit}</span>
        <span>{max}{unit}</span>
      </div>
    </div>
  );
}
