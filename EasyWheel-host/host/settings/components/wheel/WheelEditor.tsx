import React, { useState } from 'react';
import type { AppConfig, Profile } from '../../types';
import { getSectorCommand, getCommandDisplayName } from '../../utils/commandHelper';

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
    <div className="w-full flex flex-col items-center justify-center relative select-none">
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="w-full h-auto max-w-[420px] overflow-visible"
      >
        {/* Sector arcs */}
        {Array.from({ length: sector_count }, (_, i) => {
          const centre = i * sectorSpan;
          const startAngle = centre - sectorSpan / 2 + sectorGap;
          const endAngle = centre + sectorSpan / 2 - sectorGap;

          const isSelected = selectedSector === i;
          const isHovered = hoveredSector === i;
          
          // Action mapping
          const cmd = getSectorCommand(profile.sector_assignments, i);
          const displayName = cmd ? getCommandDisplayName(cmd, config) : '';

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
                    ? highlight_color || '#FF4365'
                    : isHovered
                    ? 'rgba(252, 144, 154, 0.35)'
                    : default_color || 'rgba(45, 38, 40, 0.70)',
                  stroke: isSelected ? '#FC909A' : 'rgba(255, 67, 101, 0.12)',
                  strokeWidth: isSelected ? 1.5 : 1,
                }}
              />

              {/* Text placement inside slice */}
              {displayName && (
                <text
                  x={0}
                  y={0}
                  textAnchor="middle"
                  dominantBaseline="central"
                  transform={`translate(${labelPos.x}, ${labelPos.y}) rotate(${centre > 90 && centre < 270 ? centre + 180 : centre})`}
                  className="text-[10px] font-bold pointer-events-none tracking-wide select-none transition-colors duration-150 group-hover:fill-white"
                  style={{ fill: 'var(--color-text)' }}
                >
                  {displayName.length > 11 ? `${displayName.substring(0, 8)}...` : displayName}
                </text>
              )}

              {/* fallback sector index */}
              {!displayName && (
                <text
                  x={labelPos.x}
                  y={labelPos.y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  className="text-[9px] pointer-events-none"
                  style={{ fill: 'var(--color-text-faint)' }}
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
          className="fill-none"
          style={{ stroke: '#83AF9B', opacity: 0.45 }}
          strokeWidth={1}
        />

        {/* Dead zone center circle */}
        <circle
          cx={cx}
          cy={cy}
          r={innerR}
          className="fill-zinc-950/80"
          style={{ fill: 'rgba(26, 23, 24, 0.85)', stroke: 'rgba(255, 67, 101, 0.1)' }}
          strokeWidth={1}
        />

        {/* Inner anchor dot */}
        <circle
          cx={cx}
          cy={cy}
          r={3}
          style={{ fill: '#FF4365' }}
        />

        {/* Center label */}
        <text
          x={cx}
          y={cy}
          textAnchor="middle"
          dominantBaseline="middle"
          className="text-[9px] font-semibold tracking-wider pointer-events-none uppercase"
          style={{ fill: 'var(--color-text-faint)' }}
          dy={innerR > 35 ? "0px" : "15px"}
        >
          {innerR > 35 ? "Dead Zone" : ""}
        </text>
      </svg>
    </div>
  );
}
