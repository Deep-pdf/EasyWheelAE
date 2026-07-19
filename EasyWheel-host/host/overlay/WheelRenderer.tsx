/**
 * WheelRenderer.tsx
 *
 * Pure SVG rendering component for the EasyWheel radial wheel.
 *
 * Responsibilities:
 * - Render one outer circle.
 * - Render one dead-zone circle at the wheel center.
 * - Render eight annular sector paths (donut slices) between the
 *   dead-zone radius and the outer radius.
 * - Highlight the active sector.
 * - Render subtle radial separator lines between sectors.
 *
 * Out of Scope:
 * - This component never performs geometry calculations.
 * - All sector/angle/dead-zone values arrive via props from Overlay.tsx,
 *   which derives them from the GeometryManager IPC command.
 */

import React from "react";

// ---------------------------------------------------------------------------
// Rendering constants — mirrors host_config.rs.
// Update both if any value changes.
// ---------------------------------------------------------------------------

/** Outer radius of the wheel in CSS pixels. */
const WHEEL_RADIUS = 220;

/** Inner radius of the wheel (dead zone boundary) in CSS pixels. */
const DEAD_ZONE_RADIUS = 100;

/** Number of equal sectors. Must divide 360 evenly. */
const SECTOR_COUNT = 8;

/** Half-gap in degrees applied to each side of a sector arc for visual separation. */
const SECTOR_GAP = 1.5;

// ---------------------------------------------------------------------------
// SVG math helpers
// ---------------------------------------------------------------------------

interface Point {
  x: number;
  y: number;
}

/**
 * Converts polar coordinates to a Cartesian SVG point.
 *
 * SVG uses a left-hand coordinate system where +Y is down, matching the
 * screen pixel space returned by GetCursorPos. No axis flip is needed.
 */
function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number): Point {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

/**
 * Builds an SVG path string for one annular sector (donut slice).
 *
 * The path traces: outer arc (CW) → inner arc (CCW) → close.
 * A 1° angular gap is applied symmetrically on each side for visual
 * separation between adjacent sectors.
 *
 * @param cx         - Wheel center X in CSS px
 * @param cy         - Wheel center Y in CSS px
 * @param innerR     - Inner radius of the annulus in CSS px
 * @param outerR     - Outer radius of the annulus in CSS px
 * @param startAngle - Start angle in degrees (inclusive, after gap)
 * @param endAngle   - End angle in degrees (inclusive, before gap)
 */
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

  // Sectors are 45° — never exceeds 180° — so largeArcFlag is always 0.
  const largeArc = 0;

  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${outerR} ${outerR} 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A ${innerR} ${innerR} 0 ${largeArc} 0 ${innerStart.x} ${innerStart.y}`,
    "Z",
  ].join(" ");
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export interface WheelRendererProps {
  /** Wheel center X in CSS pixels (already converted from physical px). */
  cx: number;
  /** Wheel center Y in CSS pixels (already converted from physical px). */
  cy: number;
  /**
   * Index of the currently active sector (0–7).
   * `255` signals no active sector (cursor is in the dead zone).
   */
  sector: number;
  /** `true` when the cursor is within the dead-zone radius. */
  inDeadZone: boolean;

  // --- Dynamic configuration values ---
  wheelRadius?: number;
  deadZoneRadius?: number;
  sectorCount?: number;
  highlightColor?: string;
  defaultColor?: string;
  
  /** Array of display labels for each sector. */
  sectorLabels?: string[];
}

/**
 * WheelRenderer
 *
 * Renders the full-screen SVG overlay containing the radial selection wheel.
 * The SVG is absolutely positioned and covers the entire window viewport.
 * `pointer-events: none` is set at every level — the overlay never
 * intercepts mouse input from applications running beneath it.
 */
function WheelRenderer({
  cx,
  cy,
  sector,
  inDeadZone,
  wheelRadius = WHEEL_RADIUS,
  deadZoneRadius = DEAD_ZONE_RADIUS,
  sectorCount = SECTOR_COUNT,
  highlightColor,
  defaultColor,
  sectorLabels = [],
}: WheelRendererProps): React.JSX.Element {
  const sectorSpan = 360 / sectorCount;

  return (
    <svg
      className="overlay-svg"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* ------------------------------------------------------------------ */}
      {/* Sectors — annular slices rendered back-to-front                     */}
      {/* ------------------------------------------------------------------ */}
      {Array.from({ length: sectorCount }, (_, i) => {
        // Sector i is centred at i * sectorSpan degrees.
        // Half the gap is trimmed from each edge for visual separation.
        const centre = i * sectorSpan;
        const startAngle = centre - sectorSpan / 2 + SECTOR_GAP;
        const endAngle = centre + sectorSpan / 2 - SECTOR_GAP;
        const isActive = !inDeadZone && sector === i;
        
        const labelR = (deadZoneRadius + wheelRadius) / 2;
        const labelPos = polarToCartesian(cx, cy, labelR, centre);
        const displayName = sectorLabels[i];
        
        let rotation = centre;
        if (centre > 90 && centre < 270) {
          rotation = centre + 180;
        }

        return (
          <g key={i}>
            <path
              d={annularSectorPath(cx, cy, deadZoneRadius + 2, wheelRadius, startAngle, endAngle)}
              className={isActive ? "wheel-sector wheel-sector--active" : "wheel-sector"}
              style={{
                fill: isActive
                  ? highlightColor || "rgba(99, 102, 241, 0.88)"
                  : defaultColor || "rgba(12, 12, 22, 0.80)",
              }}
            />
            {displayName && (
              <text
                x={0}
                y={0}
                transform={`translate(${labelPos.x}, ${labelPos.y}) rotate(${rotation})`}
                className="wheel-sector-label"
              >
                {displayName.length > 11 ? `${displayName.substring(0, 8)}...` : displayName}
              </text>
            )}
          </g>
        );
      })}

      {/* ------------------------------------------------------------------ */}
      {/* Outer ring — thin stroke circle bounding the wheel                 */}
      {/* ------------------------------------------------------------------ */}
      <circle
        cx={cx}
        cy={cy}
        r={wheelRadius}
        className="wheel-outer-ring"
      />

      {/* ------------------------------------------------------------------ */}
      {/* Dead zone circle — visual center well                              */}
      {/* ------------------------------------------------------------------ */}
      <circle
        cx={cx}
        cy={cy}
        r={deadZoneRadius}
        className="wheel-dead-zone"
      />

      {/* ------------------------------------------------------------------ */}
      {/* Center dot — anchor point at the captured origin                   */}
      {/* ------------------------------------------------------------------ */}
      <circle
        cx={cx}
        cy={cy}
        r={3}
        className="wheel-center-dot"
      />
    </svg>
  );
}

export default WheelRenderer;
