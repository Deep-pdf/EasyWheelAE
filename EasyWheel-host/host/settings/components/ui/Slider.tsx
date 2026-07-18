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
        <span className="text-zinc-400 font-medium">{label}</span>
        <span className="text-zinc-200 font-semibold font-mono bg-zinc-800/60 px-2 py-0.5 rounded border border-zinc-700/30">
          {value}
          {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-brand-primary focus:outline-none transition-all"
      />
      <div className="flex justify-between text-[10px] text-zinc-600 font-mono">
        <span>{min}{unit}</span>
        <span>{max}{unit}</span>
      </div>
    </div>
  );
}
