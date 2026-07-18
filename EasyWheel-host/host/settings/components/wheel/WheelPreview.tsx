import React from 'react';

interface WheelPreviewProps {
  wheelRadius: number;
  deadZoneRadius: number;
  sectorCount: number;
  highlightColor: string;
  defaultColor: string;
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

export function WheelPreview({
  wheelRadius,
  deadZoneRadius,
  sectorCount,
  highlightColor,
  defaultColor,
}: WheelPreviewProps): React.JSX.Element {
  const size = 300;
  const cx = size / 2;
  const cy = size / 2;

  // Scale the preview relative to container size
  const maxBound = Math.max(wheelRadius, 100);
  const scale = (size / 2 - 20) / maxBound;
  
  const outerR = wheelRadius * scale;
  const innerR = deadZoneRadius * scale;

  const sectorSpan = 360 / sectorCount;
  const sectorGap = 1.5;

  return (
    <div className="flex flex-col items-center justify-center bg-zinc-950/20 border border-zinc-800 rounded-xl p-4">
      <h4 className="text-xs text-zinc-500 font-semibold uppercase tracking-wider mb-4">Live Preview</h4>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="overflow-visible"
      >
        {/* Draw sectors */}
        {Array.from({ length: sectorCount }, (_, i) => {
          const centre = i * sectorSpan;
          const startAngle = centre - sectorSpan / 2 + sectorGap;
          const endAngle = centre + sectorSpan / 2 - sectorGap;
          const isHighlighted = i === 0; // Highlight the first one for live visual demonstration

          return (
            <path
              key={i}
              d={annularSectorPath(cx, cy, innerR + 1, outerR, startAngle, endAngle)}
              style={{
                fill: isHighlighted ? highlightColor : defaultColor,
                stroke: isHighlighted ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                strokeWidth: 1,
              }}
            />
          );
        })}

        {/* Outer border */}
        <circle
          cx={cx}
          cy={cy}
          r={outerR}
          className="fill-none stroke-zinc-700/20"
          strokeWidth={1}
        />

        {/* Inner boundary */}
        <circle
          cx={cx}
          cy={cy}
          r={innerR}
          className="fill-zinc-950/40 stroke-zinc-700/30"
          strokeWidth={1}
        />

        {/* Origin dot */}
        <circle
          cx={cx}
          cy={cy}
          r={3}
          className="fill-zinc-500"
        />
      </svg>
      <span className="text-[10px] text-zinc-500 mt-4">Sector index 0 highlighted</span>
    </div>
  );
}
