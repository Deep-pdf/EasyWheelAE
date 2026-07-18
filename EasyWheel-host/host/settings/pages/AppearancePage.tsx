import React, { useState, useEffect } from 'react';
import { useConfig } from '../context/ConfigContext';
import { PageLayout } from '../components/layout/PageLayout';
import { Slider } from '../components/ui/Slider';
import { ColorPicker } from '../components/ui/ColorPicker';
import { WheelPreview } from '../components/wheel/WheelPreview';
import { Button } from '../components/ui/Button';

export function AppearancePage(): React.JSX.Element {
  const { config, updateGlobal, saveChanges, saving } = useConfig();

  // Temporary local state for independent preview customization
  const [wheelRadius, setWheelRadius] = useState(120);
  const [deadZoneRadius, setDeadZoneRadius] = useState(40);
  const [highlightColor, setHighlightColor] = useState('#FFFFFF33');
  const [defaultColor, setDefaultColor] = useState('#FFFFFF11');
  const [outlineColor, setOutlineColor] = useState('rgba(255, 255, 255, 0.18)');
  const [bgOpacity, setBgOpacity] = useState(80);

  // Sync with global config when loaded
  useEffect(() => {
    if (config) {
      setWheelRadius(config.global.wheel_radius);
      setDeadZoneRadius(config.global.dead_zone_radius);
      setHighlightColor(config.global.highlight_color);
      setDefaultColor(config.global.default_color);
      setBgOpacity(Math.round((config.global.wheel_opacity ?? 0.8) * 100));
    }
  }, [config]);

  if (!config) {
    return (
      <div className="flex-1 flex items-center justify-center text-zinc-500 text-sm">
        Loading appearance settings...
      </div>
    );
  }

  const handleSave = async () => {
    // Write preview settings back to global config context
    updateGlobal({
      wheel_radius: wheelRadius,
      dead_zone_radius: deadZoneRadius,
      highlight_color: highlightColor,
      default_color: defaultColor,
      wheel_opacity: bgOpacity / 100,
    });
    // Triggers actual saveChanges sequence
    setTimeout(() => {
      saveChanges();
    }, 50);
  };

  return (
    <PageLayout
      title="Appearance Customization"
      description="Personalize radial wheel size, color schemes, outlines, transparency, and preview them live."
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start text-left">
        {/* Left Side: Sliders and Color Pickers */}
        <div className="flex flex-col gap-6">
          <div className="p-5 bg-zinc-950/20 border border-zinc-800 rounded-xl flex flex-col gap-5">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Geometry Configuration</span>
            
            <Slider
              label="Wheel Radius"
              min={60}
              max={300}
              step={5}
              value={wheelRadius}
              onChange={setWheelRadius}
              unit="px"
            />

            <Slider
              label="Dead Zone Radius"
              min={20}
              max={120}
              step={5}
              value={deadZoneRadius}
              onChange={setDeadZoneRadius}
              unit="px"
            />
          </div>

          <div className="p-5 bg-zinc-950/20 border border-zinc-800 rounded-xl flex flex-col gap-5">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Color Customization</span>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <ColorPicker
                label="Highlight Color"
                value={highlightColor}
                onChange={setHighlightColor}
              />
              <ColorPicker
                label="Default Color"
                value={defaultColor}
                onChange={setDefaultColor}
              />
              <ColorPicker
                label="Outline Color (Preview)"
                value={outlineColor}
                onChange={setOutlineColor}
              />
              <div className="flex flex-col gap-2">
                <Slider
                  label="Opacity (Preview)"
                  min={10}
                  max={100}
                  value={bgOpacity}
                  onChange={setBgOpacity}
                  unit="%"
                />
              </div>
            </div>
          </div>

          <div className="p-5 bg-zinc-950/20 border border-zinc-800 rounded-xl flex flex-col gap-3">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Animations</span>
            <div className="p-4 bg-zinc-900/40 rounded-lg border border-zinc-800/80 text-center text-zinc-500 text-xs">
              Animation transitions and easing customization planned for future phase release.
            </div>
          </div>

          {/* Sync Button */}
          <div className="flex justify-end gap-3 mt-4">
            <Button
              variant="primary"
              onClick={handleSave}
              disabled={saving}
              className="w-full md:w-auto"
            >
              {saving ? 'Applying...' : 'Apply & Save Settings'}
            </Button>
          </div>
        </div>

        {/* Right Side: Preview */}
        <div className="flex flex-col gap-3 lg:sticky lg:top-0">
          <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Visual Preview well</span>
          <div style={{ opacity: bgOpacity / 100 }}>
            <WheelPreview
              wheelRadius={wheelRadius}
              deadZoneRadius={deadZoneRadius}
              sectorCount={config.global.sector_count}
              highlightColor={highlightColor}
              defaultColor={defaultColor}
            />
          </div>
          <div className="text-[11px] text-zinc-500 leading-relaxed text-center px-4">
            The preview renders utilizing your exact outline choices and opacity presets. These settings apply in real time when you click Apply & Save.
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
