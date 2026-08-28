/**
 * WheelRenderer.tsx
 *
 * Premium glassmorphism radial wheel renderer.
 *
 * Icon & Container Rules:
 * - Extracted Windows app icons rendered via <foreignObject> + flexbox + object-fit:contain
 * - Built-in action sectors fallback to clean SVG vector paths
 * - All icons centered in a fixed circular frosted container with sufficient internal padding
 * - Hover state (+15% scale) maintains safe internal padding to prevent any clipping
 * - Floating text tooltip pill shown for the currently active/hovered sector
 */

import React from "react";

// ---------------------------------------------------------------------------
// Fallback Default Constants (used only if props are unspecified)
// ---------------------------------------------------------------------------

const DEFAULT_WHEEL_RADIUS     = 180;
const DEFAULT_DEAD_ZONE_RADIUS = 70;
const DEFAULT_SECTOR_COUNT     = 8;

/** Angular half-gaps (trimmed from each edge of a sector, in degrees). */
const BASE_GAP     = 0.8;
const ACTIVE_GAP   = 0.2;
const NEIGHBOR_GAP = 1.4;
const DIM_GAP      = 1.0;

/** Active sector hover translation (radial push outward in px). */
const EXPAND_PX = 6;

/** Active sector inner expansion toward hub (px). */
const ACTIVE_INNER_SHRINK = 3;

/** Neighbor sector subtle shrink amounts (px). */
const NEIGHBOR_OUTER_SHRINK = 4;
const NEIGHBOR_INNER_GROW   = 2;

/** Far sector subtle shrink amounts (px). */
const DIM_OUTER_SHRINK = 2;
const DIM_INNER_GROW   = 1;

const EASE = "160ms cubic-bezier(0.22, 1, 0.36, 1)";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isNeighbor(i: number, active: number, count: number): boolean {
  const d = Math.abs(i - active);
  return d === 1 || d === count - 1;
}

interface Point { x: number; y: number; }

function polarToCartesian(cx: number, cy: number, r: number, deg: number): Point {
  const rad = (deg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function annularSectorPath(
  cx: number, cy: number,
  innerR: number, outerR: number,
  startAngle: number, endAngle: number,
): string {
  const oS = polarToCartesian(cx, cy, outerR, startAngle);
  const oE = polarToCartesian(cx, cy, outerR, endAngle);
  const iE = polarToCartesian(cx, cy, innerR, endAngle);
  const iS = polarToCartesian(cx, cy, innerR, startAngle);
  return [
    `M ${oS.x} ${oS.y}`,
    `A ${outerR} ${outerR} 0 0 1 ${oE.x} ${oE.y}`,
    `L ${iE.x} ${iE.y}`,
    `A ${innerR} ${innerR} 0 0 0 ${iS.x} ${iS.y}`,
    `Z`,
  ].join(" ");
}

// ---------------------------------------------------------------------------
// Built-in action vector icons (used as default when there is NO app icon)
// ---------------------------------------------------------------------------

interface ActionVector {
  color: string;
  paths: React.JSX.Element;
}

function getActionVector(label: string): ActionVector {
  const n = label.toLowerCase();

  if (n.includes("ease"))
    return {
      color: "#FF4365",
      paths: (
        <>
          <path d="M3 12C6 12 7 4 12 4s6 8 9 8" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="3"  cy="12" r="1.8" fill="currentColor" stroke="none" />
          <circle cx="21" cy="12" r="1.8" fill="currentColor" stroke="none" />
        </>
      ),
    };
  if (n.includes("compose") || n.includes("pre-comp"))
    return {
      color: "#F9CDAD",
      paths: (
        <>
          <rect x="3"  y="7"  width="10" height="10" rx="2" />
          <rect x="11" y="3"  width="10" height="10" rx="2" fillOpacity="0.25" fill="currentColor" />
          <path d="M11 12V7l5 0" strokeDasharray="2 2" strokeLinecap="round" />
        </>
      ),
    };
  if (n.includes("trim"))
    return {
      color: "#83AF9B",
      paths: (
        <>
          <path d="M21 12a9 9 0 1 1-4.5-7.8" strokeDasharray="14 6" strokeLinecap="round" />
          <path d="M16.5 4.2l2.5-1.7.5 3" fill="currentColor" stroke="none" />
        </>
      ),
    };
  if (n.includes("duplicate") || n.includes("copy"))
    return {
      color: "#C8C8A9",
      paths: (
        <>
          <rect x="9"  y="9"  width="11" height="11" rx="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </>
      ),
    };
  if (n.includes("parent") || n.includes("child") || n.includes("link"))
    return {
      color: "#F9CDAD",
      paths: (
        <>
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </>
      ),
    };
  if (n.includes("graph") || n.includes("editor"))
    return {
      color: "#C8C8A9",
      paths: (
        <>
          <polyline points="3 18 9 12 13 16 21 7" strokeLinecap="round" strokeLinejoin="round" />
          <line x1="3" y1="21" x2="21" y2="21" strokeLinecap="round" />
        </>
      ),
    };
  if (n.includes("folder") || n.includes("explorer") || n.includes("file"))
    return {
      color: "#FFD700",
      paths: (
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
      ),
    };
  if (n.includes("setting") || n.includes("easywheel") || n.includes("wheel"))
    return {
      color: "#C8C8A9",
      paths: (
        <>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </>
      ),
    };
  if (n.includes("browser") || n.includes("website") || n.includes("web") || n.includes("url"))
    return {
      color: "#83AF9B",
      paths: (
        <>
          <circle cx="12" cy="12" r="10" />
          <line x1="2" y1="12" x2="22" y2="12" />
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </>
      ),
    };
  if (n.includes("terminal") || n.includes("shell") || n.includes("cmd") || n.includes("powershell"))
    return {
      color: "#00D2FF",
      paths: (
        <>
          <polyline points="4 17 10 11 4 5" strokeLinecap="round" strokeLinejoin="round" />
          <line x1="12" y1="19" x2="20" y2="19" strokeLinecap="round" />
        </>
      ),
    };

  // Default: generic radial icon
  return {
    color: "#C8C8A9",
    paths: (
      <>
        <circle cx="12" cy="12" r="9" />
        <line x1="12" y1="3"  x2="12" y2="21" strokeLinecap="round" />
        <line x1="3"  y1="12" x2="21" y2="12" strokeLinecap="round" />
        <line x1="5.6"  y1="5.6"  x2="18.4" y2="18.4" strokeLinecap="round" />
        <line x1="18.4" y1="5.6"  x2="5.6"  y2="18.4" strokeLinecap="round" />
      </>
    ),
  };
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface WheelRendererProps {
  cx: number;
  cy: number;
  sector: number;
  inDeadZone: boolean;
  wheelRadius?: number;
  deadZoneRadius?: number;
  sectorCount?: number;
  highlightColor?: string;
  defaultColor?: string;
  wheelOpacity?: number;
  sectorLabels?: string[];
  labelToCommand?: Record<string, { commandType: string; exeName?: string; url?: string }>;
  appIcons?: Record<string, string>;
  hubIconUrl?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function WheelRenderer({
  cx,
  cy,
  sector,
  inDeadZone,
  wheelRadius    = DEFAULT_WHEEL_RADIUS,
  deadZoneRadius = DEFAULT_DEAD_ZONE_RADIUS,
  sectorCount    = DEFAULT_SECTOR_COUNT,
  highlightColor,
  defaultColor,
  wheelOpacity   = 1.0,
  sectorLabels   = [],
  labelToCommand = {},
  appIcons       = {},
  hubIconUrl     = "",
}: WheelRendererProps): React.JSX.Element {
  const sectorSpan        = 360 / sectorCount;
  const isAnySectorActive = !inDeadZone && sector !== 255;

  // Hub radius strictly stays within deadZoneRadius
  const hubR = Math.max(16, deadZoneRadius - 3);

  // Ring thickness drives container sizing
  const ringThickness = wheelRadius - deadZoneRadius;

  // Icon size & container size — capped so icons fit comfortably
  const iconSize = Math.max(16, Math.min(44, ringThickness * 0.40));
  const containerSize = iconSize + 14;

  // Content midpoint radius
  const baseContentR = deadZoneRadius + ringThickness * 0.50;

  return (
    <svg
      className="overlay-svg"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      style={{ opacity: wheelOpacity ?? 1.0 }}
    >
      <defs>
        {/* Glassmorphism: dark warm base */}
        <linearGradient id="glass-dark" x1="0%" y1="0%" x2="60%" y2="100%">
          <stop offset="0%"   stopColor={defaultColor || "rgba(42, 32, 37, 0.95)"} />
          <stop offset="100%" stopColor={defaultColor || "rgba(18, 14, 16, 0.93)"} />
        </linearGradient>

        {/* Glassmorphism: light sheen */}
        <linearGradient id="glass-sheen" x1="0%" y1="0%" x2="80%" y2="100%">
          <stop offset="0%"   stopColor="rgba(255,255,255,0.09)" />
          <stop offset="50%"  stopColor="rgba(255,255,255,0.02)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0.00)" />
        </linearGradient>

        {/* Active sector fill */}
        <radialGradient id="active-fill" cx="42%" cy="38%" r="62%">
          <stop offset="0%"   stopColor={highlightColor || "#FF4365"} stopOpacity="0.94" />
          <stop offset="100%" stopColor={highlightColor || "#C0183A"} stopOpacity="0.98" />
        </radialGradient>

        {/* Active sector sheen */}
        <linearGradient id="active-sheen" x1="0%" y1="0%" x2="70%" y2="100%">
          <stop offset="0%"   stopColor="rgba(255,255,255,0.20)" />
          <stop offset="50%"  stopColor="rgba(255,255,255,0.05)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0.00)" />
        </linearGradient>

        {/* Hub gradient */}
        <radialGradient id="hub-fill" cx="38%" cy="32%" r="70%">
          <stop offset="0%"   stopColor="#2E222A" />
          <stop offset="100%" stopColor="#120D10" />
        </radialGradient>

        {/* Hub glow filter */}
        <filter id="hub-glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* ------------------------------------------------------------------ */}
      {/* Sectors                                                              */}
      {/* ------------------------------------------------------------------ */}
      {Array.from({ length: sectorCount }, (_, i) => {
        const centre      = i * sectorSpan;
        const isActive    = isAnySectorActive && sector === i;
        const isNeighbor_ = isAnySectorActive && !isActive && isNeighbor(i, sector, sectorCount);
        const isDimmed    = isAnySectorActive && !isActive;

        // ── Angular gaps ──────────────────────────────────────────────────
        const gap = isActive
          ? ACTIVE_GAP
          : isNeighbor_
          ? NEIGHBOR_GAP
          : isDimmed
          ? DIM_GAP
          : BASE_GAP;

        const startAngle = centre - sectorSpan / 2 + gap;
        const endAngle   = centre + sectorSpan / 2 - gap;

        // ── Radial bounds ─────────────────────────────────────────────────
        const outerR = isActive
          ? wheelRadius - 1
          : isNeighbor_
          ? wheelRadius - 1 - NEIGHBOR_OUTER_SHRINK
          : isDimmed
          ? wheelRadius - 1 - DIM_OUTER_SHRINK
          : wheelRadius - 1;

        const innerR = isActive
          ? deadZoneRadius + 3 - ACTIVE_INNER_SHRINK
          : isNeighbor_
          ? deadZoneRadius + 3 + NEIGHBOR_INNER_GROW
          : isDimmed
          ? deadZoneRadius + 3 + DIM_INNER_GROW
          : deadZoneRadius + 3;

        const sectorPath = annularSectorPath(cx, cy, innerR, outerR, startAngle, endAngle);

        // ── Radial translate ──────────────────────────────────────────────
        const rad = (centre * Math.PI) / 180;
        const tx  = isActive ? Math.cos(rad) * EXPAND_PX : 0;
        const ty  = isActive ? Math.sin(rad) * EXPAND_PX : 0;
        const groupTransform = (tx !== 0 || ty !== 0) ? `translate(${tx}, ${ty})` : "";

        // ── Border colors & strokes ───────────────────────────────────────
        const outerBorder = isActive
          ? highlightColor || "rgba(255, 100, 130, 0.65)"
          : isNeighbor_
          ? "rgba(255, 255, 255, 0.08)"
          : isDimmed
          ? "rgba(255, 255, 255, 0.05)"
          : "rgba(255, 255, 255, 0.12)";

        const topBorder = isActive
          ? highlightColor || "rgba(255, 200, 210, 0.40)"
          : "rgba(255, 255, 255, 0.14)";

        // ── Icon resolution ───────────────────────────────────────────────
        const displayName = sectorLabels[i] ?? "";
        const cmdInfo     = labelToCommand[displayName];
        const isAppOrWeb  = cmdInfo?.commandType === "launch_app" || cmdInfo?.commandType === "open_website";
 
        const appIconUrl: string | undefined | false =
          isAppOrWeb && (
            appIcons[i.toString()] ||
            appIcons[displayName] ||
            (cmdInfo?.exeName && appIcons[cmdInfo.exeName]) ||
            (cmdInfo?.url && appIcons[cmdInfo.url])
          );

        const actionVector = !isAppOrWeb && displayName
          ? getActionVector(displayName)
          : null;

        const displayIconSize = iconSize;
        const displayContainerSize = isActive ? containerSize + 4 : containerSize;

        const contentRAdj = baseContentR + (isActive ? 2 : 0);
        const contentPos  = polarToCartesian(cx, cy, contentRAdj, centre);

        const halfContainer = displayContainerSize / 2;
        const halfIcon      = displayIconSize / 2;

        const iconPadding = 4;
        const foSize = displayContainerSize;

        const labelR   = contentRAdj + displayContainerSize / 2 + 11;
        const labelPos = polarToCartesian(cx, cy, labelR, centre);

        const shortLabel = displayName.length > 13 ? displayName.slice(0, 11) + "…" : displayName;

        return (
          <g
            key={i}
            transform={groupTransform}
            style={{ transition: `transform ${EASE}, opacity ${EASE}` }}
          >
            {/* Base glass fill */}
            <path
              d={sectorPath}
              fill={isActive ? "url(#active-fill)" : "url(#glass-dark)"}
              stroke={outerBorder}
              strokeWidth={isActive ? "1.2" : "0.8"}
              style={{
                filter: isActive
                  ? `drop-shadow(0 0 10px ${highlightColor || "rgba(255,50,90,0.45)"})`
                  : isNeighbor_
                  ? "brightness(0.85)"
                  : isDimmed
                  ? "brightness(0.88)"
                  : "none",
                opacity: isNeighbor_ ? 0.88 : isDimmed ? 0.90 : 1,
                transition: `opacity ${EASE}, filter ${EASE}, stroke ${EASE}`,
              }}
            />

            {/* Glass sheen overlay */}
            <path
              d={sectorPath}
              fill={isActive ? "url(#active-sheen)" : "url(#glass-sheen)"}
              stroke={topBorder}
              strokeWidth="0.5"
              style={{ pointerEvents: "none", opacity: isNeighbor_ ? 0.7 : 1 }}
            />

            {/* ── Icon container + icon ── */}
            {displayName && (
              <g style={{ transition: `opacity ${EASE}`, opacity: isNeighbor_ ? 0.80 : isDimmed ? 0.82 : 1 }}>
                {/* Circular frosted container */}
                <circle
                  cx={contentPos.x}
                  cy={contentPos.y}
                  r={halfContainer}
                  fill={isActive ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.08)"}
                  stroke={isActive ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.15)"}
                  strokeWidth={isActive ? "1.2" : "0.7"}
                  style={{
                    transition: `fill ${EASE}, stroke ${EASE}, r ${EASE}`,
                    filter: isActive ? "drop-shadow(0 0 5px rgba(255,255,255,0.25))" : "none",
                  }}
                />

                {appIconUrl ? (
                  /* Real extracted app icon — rendered via foreignObject + HTML img */
                  <foreignObject
                    x={contentPos.x - foSize / 2}
                    y={contentPos.y - foSize / 2}
                    width={foSize}
                    height={foSize}
                    style={{ overflow: "visible" }}
                  >
                    <div
                      style={{
                        width: "100%",
                        height: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: `${iconPadding}px`,
                        boxSizing: "border-box" as const,
                        borderRadius: "50%",
                        overflow: "hidden",
                        pointerEvents: "none" as const,
                      }}
                    >
                      <img
                        src={appIconUrl as string}
                        alt=""
                        draggable={false}
                        style={{
                          maxWidth: "100%",
                          maxHeight: "100%",
                          width: "auto",
                          height: "auto",
                          objectFit: "contain" as const,
                          display: "block",
                          imageRendering: "auto" as const,
                          userSelect: "none" as const,
                          filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.35))",
                        }}
                      />
                    </div>
                  </foreignObject>
                ) : actionVector ? (
                  /* Built-in action SVG vector */
                  <svg
                    x={contentPos.x - halfIcon}
                    y={contentPos.y - halfIcon}
                    width={displayIconSize}
                    height={displayIconSize}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={
                      isActive
                        ? "#FFFFFF"
                        : isNeighbor_
                        ? `rgba(210,195,200,0.70)`
                        : actionVector.color
                    }
                    strokeWidth={isActive ? "2.2" : "1.8"}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{
                      filter: isActive
                        ? "drop-shadow(0 0 6px rgba(255,255,255,0.65))"
                        : "none",
                      transition: `stroke ${EASE}, opacity ${EASE}`,
                      overflow: "visible",
                    }}
                  >
                    {actionVector.paths}
                  </svg>
                ) : null}

                {/* Tooltip label on active hover */}
                {isActive && (
                  <>
                    <rect
                      x={labelPos.x - (shortLabel.length * 3.8 + 8)}
                      y={labelPos.y - 8}
                      width={shortLabel.length * 7.6 + 16}
                      height={16}
                      rx={8}
                      fill="rgba(20,14,18,0.82)"
                      stroke="rgba(255,255,255,0.18)"
                      strokeWidth="0.6"
                    />
                    <text
                      x={labelPos.x}
                      y={labelPos.y + 4.5}
                      textAnchor="middle"
                      fill="rgba(255,255,255,0.92)"
                      fontSize="9.5"
                      fontFamily="Inter, -apple-system, Segoe UI, sans-serif"
                      fontWeight="500"
                      letterSpacing="0.3"
                      style={{ pointerEvents: "none", userSelect: "none" }}
                    >
                      {shortLabel}
                    </text>
                  </>
                )}
              </g>
            )}
          </g>
        );
      })}

      {/* ------------------------------------------------------------------ */}
      {/* Outer decorative ring                                               */}
      {/* ------------------------------------------------------------------ */}
      <circle
        cx={cx} cy={cy} r={wheelRadius}
        fill="none"
        stroke="rgba(255,255,255,0.06)"
        strokeWidth="0.8"
      />

      {/* ------------------------------------------------------------------ */}
      {/* Center Hub — strictly within deadZoneRadius                          */}
      {/* ------------------------------------------------------------------ */}
      <g filter="url(#hub-glow)">
        <circle
          cx={cx} cy={cy} r={hubR + 3}
          fill="none"
          stroke={highlightColor || "rgba(255, 67, 101, 0.15)"}
          strokeWidth="4"
        />

        <circle
          cx={cx} cy={cy} r={hubR}
          fill="url(#hub-fill)"
          stroke={inDeadZone ? (highlightColor || "rgba(255,80,115,0.75)") : "rgba(255,255,255,0.2)"}
          strokeWidth={inDeadZone ? "2" : "1.2"}
          style={{
            filter: inDeadZone
              ? `drop-shadow(0 0 16px ${highlightColor || "rgba(255,67,101,0.55)"})`
              : `drop-shadow(0 0 8px ${highlightColor || "rgba(255,67,101,0.22)"})`,
            transition: `stroke ${EASE}, stroke-width ${EASE}, filter ${EASE}`,
          }}
        />

        {hubIconUrl ? (
          <foreignObject
            x={cx - (hubR * 1.0) / 2}
            y={cy - (hubR * 1.0) / 2}
            width={hubR * 1.0}
            height={hubR * 1.0}
            style={{ pointerEvents: "none" }}
          >
            <div style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "4px",
              boxSizing: "border-box",
            }}>
              <img
                src={hubIconUrl}
                alt=""
                style={{
                  maxWidth: "100%",
                  maxHeight: "100%",
                  objectFit: "contain",
                  filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.4))",
                }}
              />
            </div>
          </foreignObject>
        ) : (
          <>
            <circle
              cx={cx - hubR * 0.15}
              cy={cy - hubR * 0.18}
              r={hubR * 0.65}
              fill="none"
              stroke="rgba(255,255,255,0.06)"
              strokeWidth="0.5"
            />
            <circle
              cx={cx} cy={cy} r={Math.max(8, hubR - 5)}
              fill="none"
              stroke={inDeadZone ? (highlightColor || "rgba(255,100,130,0.30)") : "rgba(255,255,255,0.04)"}
              strokeWidth="0.8"
              style={{ transition: `stroke ${EASE}` }}
            />
          </>
        )}
      </g>
    </svg>
  );
}

export default WheelRenderer;
