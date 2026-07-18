import React, { useState, useEffect } from 'react';

interface ColorPickerProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

const PRESET_COLORS = [
  '#FFFFFF11', // default default_color
  '#FFFFFF33', // default highlight_color
  '#6366f188', // Indigo transparent
  '#6366f1ee', // Indigo opaque
  '#3b82f688', // Blue transparent
  '#10b98188', // Emerald transparent
  '#ef444488', // Red transparent
  '#f59e0b88', // Amber transparent
];

export function ColorPicker({
  label,
  value,
  onChange,
  className = '',
}: ColorPickerProps): React.JSX.Element {
  const [inputValue, setInputValue] = useState(value);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    // Basic CSS color validation (supports hex, rgba, rgb, hsl, names)
    if (val.trim()) {
      onChange(val);
    }
  };

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <span className="text-sm text-zinc-400 font-medium">{label}</span>
      <div className="flex gap-3 items-center">
        {/* Color swatch preview & HTML picker overlay */}
        <div className="relative w-10 h-10 rounded-lg border border-zinc-700/50 overflow-hidden shadow-inner flex-shrink-0 cursor-pointer">
          <div
            className="w-full h-full"
            style={{ backgroundColor: value }}
          />
          <input
            type="color"
            value={value.startsWith('#') && value.length >= 7 ? value.substring(0, 7) : '#6366f1'}
            onChange={(e) => {
              // Retain opacity if hex has 9 chars (#RRGGBBAA)
              if (value.length === 9) {
                onChange(e.target.value + value.substring(7));
              } else {
                onChange(e.target.value);
              }
            }}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
          />
        </div>

        {/* Input box */}
        <div className="flex-1">
          <input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            placeholder="#FFFFFF11"
            className="w-full px-3 py-2 bg-zinc-950/50 border border-zinc-800 focus:border-brand-primary rounded-lg text-sm text-zinc-200 font-mono focus:outline-none focus:ring-1 focus:ring-brand-primary transition-all duration-150"
          />
        </div>
      </div>

      {/* Preset Swatches */}
      <div className="flex flex-wrap gap-1.5 mt-1">
        {PRESET_COLORS.map((preset) => (
          <button
            key={preset}
            onClick={() => onChange(preset)}
            className={`w-6 h-6 rounded-md border border-zinc-800 hover:scale-105 active:scale-95 transition-all relative ${
              value.toLowerCase() === preset.toLowerCase() ? 'ring-2 ring-brand-primary border-transparent' : ''
            }`}
            style={{ backgroundColor: preset }}
            title={preset}
          />
        ))}
      </div>
    </div>
  );
}
