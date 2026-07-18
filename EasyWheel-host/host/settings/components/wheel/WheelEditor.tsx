import React, { useState } from 'react';
import type { AppConfig, Profile } from '../../types';

interface WheelEditorProps {
  config: AppConfig;
  profile: Profile;
  selectedSector: number | null;
  onSelectSector: (sector: number) => void;
}

interface Point {
  x: number;
  y: number;
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number): Point {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

function annularSectorPath(
  cx: number,
  cy: number,
  innerR: number,
  outerR: number,
  startAngle: number,
  endAngle: number,
): string {
  const outerStart = polarToCartesian(cx, cy, outerR, startAngle);
  const outerEnd = polarToCartesian(cx, cy, outerR, endAngle);
  const innerEnd = polarToCartesian(cx, cy, innerR, endAngle);
  const innerStart = polarToCartesian(cx, cy, innerR, startAngle);
  const largeArc = 0;

  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${outerR} ${outerR} 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A ${innerR} ${innerR} 0 ${largeArc} 0 ${innerStart.x} ${innerStart.y}`,
    "Z",
  ].join(" ");
}

export function WheelEditor({
  config,
  profile,
  selectedSector,
  onSelectSector,
}: WheelEditorProps): React.JSX.Element {
  const [hoveredSector, setHoveredSector] = useState<number | null>(null);

  const { sector_count, wheel_radius, dead_zone_radius, highlight_color, default_color } = config.global;
  
  // Outer visual dimensions for SVG canvas
  const size = 380;
  const cx = size / 2;
  const cy = size / 2;

  // Fit radius to size of panel to prevent overflow
  const scale = (size / 2 - 20) / Math.max(wheel_radius, 100);
  const outerR = wheel_radius * scale;
  const innerR = dead_zone_radius * scale;

  const sectorSpan = 360 / sector_count;
  const sectorGap = 1.5;

  return (
    <div className="flex flex-col items-center justify-center bg-zinc-950/30 border border-zinc-800/50 rounded-xl p-6 relative select-none">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="overflow-visible"
      >
        {/* Sector arcs */}
        {Array.from({ length: sector_count }, (_, i) => {
          const centre = i * sectorSpan;
          const startAngle = centre - sectorSpan / 2 + sectorGap;
          const endAngle = centre + sectorSpan / 2 - sectorGap;

          const isSelected = selectedSector === i;
          const isHovered = hoveredSector === i;
          
          // Action mapping
          const actionId = profile.sector_assignments[i.toString()];
          const action = config.action_library.find((a) => a.id === actionId);
          const displayName = action ? action.display_name : '';

          // Label placement helper
          const labelR = (innerR + outerR) / 2;
          const labelPos = polarToCartesian(cx, cy, labelR, centre);

          return (
            <g
              key={i}
              className="cursor-pointer group"
              onMouseEnter={() => setHoveredSector(i)}
              onMouseLeave={() => setHoveredSector(null)}
              onClick={() => onSelectSector(i)}
            >
              {/* Annular slice path */}
              <path
                d={annularSectorPath(cx, cy, innerR + 1, outerR, startAngle, endAngle)}
                className="transition-all duration-150"
                style={{
                  fill: isSelected
                    ? highlight_color || 'rgba(99, 102, 241, 0.88)'
                    : isHovered
                    ? 'rgba(255, 255, 255, 0.15)'
                    : default_color || 'rgba(12, 12, 22, 0.80)',
                  stroke: isSelected ? 'rgba(99, 102, 241, 0.9)' : 'rgba(255, 255, 255, 0.08)',
                  strokeWidth: isSelected ? 1.5 : 1,
                }}
              />

              {/* Text placement inside slice */}
              {displayName && (
                <text
                  x={labelPos.x}
                  y={labelPos.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="fill-zinc-300 text-[10px] font-medium pointer-events-none tracking-wide select-none transition-colors duration-150 group-hover:fill-white"
                  style={{
                    transformOrigin: `${labelPos.x}px ${labelPos.y}px`,
                    transform: `rotate(${centre > 90 && centre < 270 ? centre + 180 : centre}deg)`,
                  }}
                >
                  {displayName.length > 12 ? `${displayName.substring(0, 10)}...` : displayName}
                </text>
              )}

              {/* fallback sector index */}
              {!displayName && (
                <text
                  x={labelPos.x}
                  y={labelPos.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="fill-zinc-600 text-xs font-mono font-medium pointer-events-none"
                >
                  {i}
                </text>
              )}
            </g>
          );
        })}

        {/* Outer bounding ring */}
        <circle
          cx={cx}
          cy={cy}
          r={outerR}
          className="fill-none stroke-zinc-700/30"
          strokeWidth={1}
        />

        {/* Dead zone center circle */}
        <circle
          cx={cx}
          cy={cy}
          r={innerR}
          className="fill-zinc-950/80 stroke-zinc-700/50"
          strokeWidth={1}
        />

        {/* Inner anchor dot */}
        <circle
          cx={cx}
          cy={cy}
          r={3}
          className="fill-zinc-400"
        />

        {/* Center label */}
        <text
          x={cx}
          y={cy}
          textAnchor="middle"
          dominantBaseline="middle"
          className="fill-zinc-500 text-[9px] font-semibold tracking-wider pointer-events-none uppercase"
          dy={innerR > 35 ? "0px" : "15px"}
        >
          {innerR > 35 ? "Dead Zone" : ""}
        </text>
      </svg>

      <div className="absolute bottom-4 left-4 right-4 flex justify-between text-xs text-zinc-500">
        <span>Sector Count: {sector_count}</span>
        <span>Selected: {selectedSector !== null ? `Sector ${selectedSector}` : 'None'}</span>
      </div>
    </div>
  );
}
