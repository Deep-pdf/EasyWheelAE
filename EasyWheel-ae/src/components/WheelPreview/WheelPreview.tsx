import React, { useState } from 'react';
import { Sector } from '../../types/Sector';
import { Command } from '../../types/Command';

interface WheelPreviewProps {
  sectors: Sector[];
  selectedSectorIndex: number | null;
  onSelectSector: (index: number) => void;
  commands: Command[];
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

export const WheelPreview: React.FC<WheelPreviewProps> = ({
  sectors,
  selectedSectorIndex,
  onSelectSector,
  commands
}) => {
  const [hoveredSector, setHoveredSector] = useState<number | null>(null);

  const size = 160;
  const cx = size / 2;
  const cy = size / 2;
  const outerR = 72;
  const innerR = 24;
  const sectorSpan = 360 / 8;
  const sectorGap = 1.5;

  return (
    <div className="wheel-preview-container">
      <div className="wheel-svg-wrapper">
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="wheel-svg"
        >
          {sectors.map((sector, i) => {
            // Offset by -90 so Sector 0 (index 0) is at 12 o'clock (pointing straight up)
            const centre = i * sectorSpan - 90;
            const startAngle = centre - sectorSpan / 2 + sectorGap;
            const endAngle = centre + sectorSpan / 2 - sectorGap;

            const isSelected = selectedSectorIndex === i;
            const isHovered = hoveredSector === i;

            const assignedCmd = commands.find(cmd => cmd.id === sector.assignedCommandId);
            const displayName = assignedCmd ? assignedCmd.name : 'Empty';

            const labelR = (innerR + outerR) / 2;
            const labelPos = polarToCartesian(cx, cy, labelR, centre);

            return (
              <g
                key={i}
                className={`wheel-sector-group ${isSelected ? 'selected' : ''}`}
                onMouseEnter={() => setHoveredSector(i)}
                onMouseLeave={() => setHoveredSector(null)}
                onClick={() => onSelectSector(i)}
              >
                <path
                  d={annularSectorPath(cx, cy, innerR + 1, outerR, startAngle, endAngle)}
                  className="wheel-sector-path"
                  style={{
                    fill: isSelected
                      ? 'var(--accent-color)'
                      : isHovered
                      ? 'rgba(255, 255, 255, 0.12)'
                      : 'rgba(255, 255, 255, 0.03)',
                    stroke: isSelected ? 'var(--accent-color)' : 'rgba(255, 255, 255, 0.08)',
                    strokeWidth: isSelected ? 1.5 : 1,
                  }}
                />
                {/* Text placement inside slice */}
                <text
                  x={0}
                  y={0}
                  textAnchor="middle"
                  dominantBaseline="central"
                  transform={`translate(${labelPos.x}, ${labelPos.y}) rotate(${centre > 90 && centre < 270 ? centre + 180 : centre})`}
                  className={`sector-label-text ${isSelected ? 'selected' : ''} ${displayName === 'Empty' ? 'empty' : ''}`}
                >
                  {displayName.length > 9 ? `${displayName.substring(0, 7)}...` : displayName}
                </text>
                {/* Number indicator */}
                <text
                  x={polarToCartesian(cx, cy, innerR + 8, centre).x}
                  y={polarToCartesian(cx, cy, innerR + 8, centre).y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  className={`sector-number-text ${isSelected ? 'selected' : ''}`}
                >
                  {i + 1}
                </text>
              </g>
            );
          })}

          {/* Outer bounding ring */}
          <circle
            cx={cx}
            cy={cy}
            r={outerR}
            className="wheel-outer-ring"
          />

          {/* Dead zone center circle */}
          <circle
            cx={cx}
            cy={cy}
            r={innerR}
            className="wheel-inner-ring"
          />

          {/* Inner anchor dot */}
          <circle
            cx={cx}
            cy={cy}
            r={2.5}
            className="wheel-center-dot"
          />
        </svg>
      </div>
      <div className="wheel-selection-info">
        Selected: {selectedSectorIndex !== null ? `Sector ${selectedSectorIndex + 1}` : 'None'}
      </div>
    </div>
  );
};
