import React, { useState, useEffect, useRef } from 'react';
import { Button } from './Button';

interface HotkeyRecorderProps {
  modifierValue: string;
  keyValue: string;
  onUpdate: (modifier: string, key: string) => void;
  className?: string;
}

const MODIFIERS = [
  { label: 'Alt (Recommended)', value: 'Alt' },
  { label: 'Left Control', value: 'ControlLeft' },
  { label: 'Right Control', value: 'ControlRight' },
  { label: 'Left Shift', value: 'ShiftLeft' },
  { label: 'Right Shift', value: 'ShiftRight' },
  { label: 'Left Win / Cmd', value: 'MetaLeft' },
  { label: 'Right Win / Cmd', value: 'MetaRight' },
];

export function HotkeyRecorder({
  modifierValue,
  keyValue,
  onUpdate,
  className = '',
}: HotkeyRecorderProps): React.JSX.Element {
  const [isRecording, setIsRecording] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const mapJsCodeToRdevKey = (code: string, key: string): string | null => {
    // F1 - F12
    if (/^F(1[0-2]|[1-9])$/.test(key)) {
      return key;
    }
    // KeyA - KeyZ
    if (/^Key[A-Z]$/.test(code)) {
      return code;
    }
    // Num0 - Num9
    if (/^Digit[0-9]$/.test(code)) {
      return code.replace('Digit', 'Num');
    }
    if (/^Numpad[0-9]$/.test(code)) {
      return code.replace('Numpad', 'Num');
    }
    // Common keys
    switch (code) {
      case 'Space':
        return 'Space';
      case 'Tab':
        return 'Tab';
      case 'Escape':
        return 'Escape';
      case 'CapsLock':
        return 'CapsLock';
      case 'Backspace':
        return 'Backspace';
      case 'Enter':
        return 'Return';
      case 'Delete':
        return 'Delete';
      case 'Home':
        return 'Home';
      case 'End':
        return 'End';
      case 'PageUp':
        return 'PageUp';
      case 'PageDown':
        return 'PageDown';
      case 'ArrowUp':
        return 'UpArrow';
      case 'ArrowDown':
        return 'DownArrow';
      case 'ArrowLeft':
        return 'LeftArrow';
      case 'ArrowRight':
        return 'RightArrow';
      default:
        break;
    }
    
    // Fallback attempts
    if (key === ' ') return 'Space';
    if (key === 'Enter') return 'Return';
    if (key === 'Escape') return 'Escape';
    
    return null;
  };

  useEffect(() => {
    if (!isRecording) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent browser default shortcut behavior (like F1 opening help, Alt focus menu)
      e.preventDefault();
      e.stopPropagation();

      const rdevKey = mapJsCodeToRdevKey(e.code, e.key);
      if (rdevKey) {
        onUpdate(modifierValue, rdevKey);
        setIsRecording(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [isRecording, modifierValue, onUpdate]);

  return (
    <div ref={containerRef} className={`flex flex-col gap-3 p-4 bg-zinc-950/20 border border-zinc-800 rounded-lg ${className}`}>
      <span className="text-sm text-zinc-400 font-medium">Activation Hotkey</span>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Modifier Select */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-zinc-500 font-medium">Modifier Key</label>
          <select
            value={modifierValue}
            onChange={(e) => onUpdate(e.target.value, keyValue)}
            disabled={isRecording}
            className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 focus:border-brand-primary rounded-lg text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-brand-primary disabled:opacity-50 transition-all cursor-pointer"
          >
            {MODIFIERS.map((mod) => (
              <option key={mod.value} value={mod.value}>
                {mod.label}
              </option>
            ))}
          </select>
        </div>

        {/* Trigger Key Recorder */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-zinc-500 font-medium">Trigger Key</label>
          <Button
            type="button"
            variant={isRecording ? 'primary' : 'secondary'}
            onClick={() => setIsRecording(!isRecording)}
            className="w-full justify-between h-9 text-left font-mono font-semibold"
          >
            <span>{isRecording ? 'Recording...' : keyValue}</span>
            <span className="text-[10px] bg-zinc-950/50 text-zinc-400 px-1.5 py-0.5 rounded">
              {isRecording ? 'Press any key' : 'Click to change'}
            </span>
          </Button>
        </div>
      </div>
      <p className="text-[11px] text-zinc-500">
        Hold the modifier key first, then press the trigger key to activate the wheel.
      </p>
    </div>
  );
}
