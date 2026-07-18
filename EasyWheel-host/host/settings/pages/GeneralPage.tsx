import React from 'react';
import { useConfig } from '../context/ConfigContext';
import { PageLayout } from '../components/layout/PageLayout';
import { HotkeyRecorder } from '../components/ui/HotkeyRecorder';
import { Slider } from '../components/ui/Slider';
import { ColorPicker } from '../components/ui/ColorPicker';
import { Button } from '../components/ui/Button';

export function GeneralPage(): React.JSX.Element {
  const { config, updateGlobal, saveChanges, dirty, saving } = useConfig();

  if (!config) {
    return (
      <div className="flex-1 flex items-center justify-center text-zinc-500 text-sm">
        Loading settings...
      </div>
    );
  }

  const { activation_modifier, activation_key, wheel_radius, dead_zone_radius, sector_count, highlight_color, default_color } = config.global;

  const handleHotkeyUpdate = (modifier: string, key: string) => {
    updateGlobal({
      activation_modifier: modifier,
      activation_key: key,
    });
  };

  const handleSectorCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    // Allow typing, validate divisor of 360 in save
    updateGlobal({ sector_count: val });
  };

  return (
    <PageLayout
      title="General Settings"
      description="Configure activation hotkey, layout geometry parameters and global interface theme."
    >
      <div className="flex flex-col gap-6 max-w-2xl text-left">
        {/* Hotkey Section */}
        <HotkeyRecorder
          modifierValue={activation_modifier}
          keyValue={activation_key}
          onUpdate={handleHotkeyUpdate}
        />

        {/* Geometry sliders */}
        <div className="p-4 bg-zinc-950/20 border border-zinc-800 rounded-lg flex flex-col gap-5">
          <span className="text-sm text-zinc-400 font-medium">Wheel Geometry</span>
          
          <Slider
            label="Wheel Radius"
            min={60}
            max={300}
            step={5}
            value={wheel_radius}
            onChange={(val) => updateGlobal({ wheel_radius: val })}
            unit="px"
          />

          <Slider
            label="Dead Zone Radius"
            min={20}
            max={120}
            step={5}
            value={dead_zone_radius}
            onChange={(val) => updateGlobal({ dead_zone_radius: val })}
            unit="px"
          />

          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center">
              <label className="text-xs text-zinc-400 font-medium">Sector Count</label>
              <span className="text-[10px] text-zinc-500 font-mono">Divisor of 360 (e.g. 4, 6, 8, 12, 16)</span>
            </div>
            <input
              type="number"
              min={4}
              max={32}
              value={sector_count}
              onChange={handleSectorCountChange}
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 focus:border-brand-primary rounded-lg text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-brand-primary transition-all duration-150 font-semibold"
            />
          </div>
        </div>

        {/* Global Color Options */}
        <div className="p-4 bg-zinc-950/20 border border-zinc-800 rounded-lg grid grid-cols-1 md:grid-cols-2 gap-5">
          <ColorPicker
            label="Highlight Color"
            value={highlight_color}
            onChange={(val) => updateGlobal({ highlight_color: val })}
          />
          <ColorPicker
            label="Default Sector Color"
            value={default_color}
            onChange={(val) => updateGlobal({ default_color: val })}
          />
        </div>

        {/* Theme select placeholder */}
        <div className="p-4 bg-zinc-950/20 border border-zinc-800 rounded-lg flex flex-col gap-2">
          <span className="text-sm text-zinc-400 font-medium">Application Theme</span>
          <div className="grid grid-cols-3 gap-2">
            {['System', 'Dark', 'Light'].map((theme) => {
              // Stub: theme state could be stored in config.global or local storage
              // Let's assume standard Dark Mode is force enabled for now.
              const isActive = theme === 'Dark';
              return (
                <button
                  key={theme}
                  disabled={theme !== 'Dark'} // Dark-mode first
                  className={`px-3 py-2 text-xs rounded-lg border font-medium transition-all ${
                    isActive
                      ? 'bg-brand-primary/10 border-brand-primary text-brand-primary'
                      : 'bg-zinc-900/50 border-zinc-800 text-zinc-500 cursor-not-allowed'
                  }`}
                >
                  {theme}
                </button>
              );
            })}
          </div>
        </div>

        {/* Explicit Save button at bottom */}
        {dirty && (
          <div className="flex justify-end pt-4">
            <Button
              variant="primary"
              disabled={saving}
              onClick={saveChanges}
              className="w-full md:w-auto"
            >
              {saving ? 'Saving changes...' : 'Save Configuration'}
            </Button>
          </div>
        )}
      </div>
    </PageLayout>
  );
}
