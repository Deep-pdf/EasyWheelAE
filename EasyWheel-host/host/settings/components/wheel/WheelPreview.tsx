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
    <div
      className="flex flex-col items-center justify-center rounded-xl p-4"
      style={{ background: 'var(--color-surface-elevated)', border: '1px solid var(--color-border)' }}
    >
      <h4 className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--color-text-muted)' }}>Live Preview</h4>
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="w-full h-auto max-w-[300px] overflow-visible"
      >
        {/* Draw sectors */}
        {Array.from({ length: sectorCount }, (_, i) => {
          const centre = i * sectorSpan;
          const startAngle = centre - sectorSpan / 2 + sectorGap;
          const endAngle = centre + sectorSpan / 2 - sectorGap;
          const isHighlighted = i === 0; // Highlight the first one for live visual demonstration

          const rad = (centre * Math.PI) / 180;
          // Apply same radial translation to the highlighted preview sector
          const tx = isHighlighted ? Math.cos(rad) * 10 : 0;
          const ty = isHighlighted ? Math.sin(rad) * 10 : 0;

          const transformStyle: React.CSSProperties = {
            transform: isHighlighted
              ? `translate(${tx}px, ${ty}px) scale(1.08)`
              : `translate(0px, 0px) scale(1)`,
            transformOrigin: `${cx}px ${cy}px`,
            transition: 'transform 150ms cubic-bezier(0.22, 1, 0.36, 1)',
          };

          return (
            <g key={i} style={transformStyle}>
              <path
                d={annularSectorPath(cx, cy, innerR + 6, outerR - 2, startAngle, endAngle)}
                style={{
                  fill: isHighlighted ? highlightColor || '#FF4365' : defaultColor || 'rgba(18, 18, 24, 0.82)',
                  stroke: isHighlighted ? '#FC909A' : 'rgba(131, 175, 155, 0.22)',
                  strokeWidth: isHighlighted ? 2 : 1,
                  filter: isHighlighted ? 'drop-shadow(0 0 8px rgba(255, 67, 101, 0.4))' : 'none',
                }}
              />
            </g>
          );
        })}

        {/* Outer border */}
        <circle
          cx={cx}
          cy={cy}
          r={outerR}
          className="fill-none"
          style={{ stroke: 'rgba(131, 175, 155, 0.22)' }}
          strokeWidth={1}
        />

        {/* Center Hub & Logo */}
        <g>
          <circle
            cx={cx}
            cy={cy}
            r={Math.max(0, innerR - 4)}
            style={{
              fill: 'rgba(22, 22, 28, 0.95)',
              stroke: 'rgba(131, 175, 155, 0.45)',
              strokeWidth: 1.5,
              filter: 'drop-shadow(0 0 12px rgba(255, 67, 101, 0.15))',
            }}
          />
          {innerR > 16 && (
            <g
              transform={`translate(${cx - (innerR * 0.75) / 2}, ${cy - (innerR * 0.75) / 2})`}
              style={{ color: '#FF4365' }}
            >
              <svg width={innerR * 0.75} height={innerR * 0.75} viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="10" />
                <circle cx="50" cy="50" r="18" fill="currentColor" />
              </svg>
            </g>
          )}
        </g>
      </svg>
      <span className="text-[10px] mt-4" style={{ color: 'var(--color-text-faint)' }}>Sector index 0 highlighted (simulated hover)</span>
    </div>
  );
}
