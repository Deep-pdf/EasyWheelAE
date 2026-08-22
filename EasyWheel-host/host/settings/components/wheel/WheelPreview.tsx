import React from 'react';
import WheelRenderer from '../../../overlay/WheelRenderer';

interface WheelPreviewProps {
  wheelRadius: number;
  deadZoneRadius: number;
  sectorCount: number;
  highlightColor?: string;
  defaultColor?: string;
}

export function WheelPreview({
  wheelRadius,
  deadZoneRadius,
  sectorCount,
  highlightColor,
  defaultColor,
}: WheelPreviewProps): React.JSX.Element {
  // Container dimensions
  const containerSize = 340;
  const cx = containerSize / 2;
  const cy = containerSize / 2;

  // Scale the preview if the wheel radius is too large to fit in 340px
  const padding = 20;
  const maxBound = Math.max(wheelRadius + 20, 100);
  const scale = Math.min(1.0, (containerSize / 2 - padding) / maxBound);

  const sampleLabels = ["Easy Ease", "Pre-Compose", "Trim Paths", "Duplicate", "Parent", "Graph", "Settings", "Explorer"];

  return (
    <div
      className="flex flex-col items-center justify-center rounded-xl p-4 overflow-hidden"
      style={{ background: 'var(--color-surface-elevated)', border: '1px solid var(--color-border)' }}
    >
      <h4 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-muted)' }}>Live Geometry Preview</h4>
      <div style={{ width: containerSize, height: containerSize, transform: scale < 1 ? `scale(${scale})` : undefined, transformOrigin: 'center center' }}>
        <WheelRenderer
          cx={cx}
          cy={cy}
          sector={0}
          inDeadZone={false}
          wheelRadius={wheelRadius}
          deadZoneRadius={deadZoneRadius}
          sectorCount={sectorCount}
          highlightColor={highlightColor}
          defaultColor={defaultColor}
          sectorLabels={sampleLabels.slice(0, sectorCount)}
        />
      </div>
      <span className="text-[10px] mt-2" style={{ color: 'var(--color-text-faint)' }}>Sector 0 highlighted (Live preview with exact dimensions)</span>
    </div>
  );
}
