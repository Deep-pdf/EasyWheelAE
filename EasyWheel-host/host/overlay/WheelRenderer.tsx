/**
 * WheelRenderer.tsx
 *
 * Premium glassmorphism radial wheel renderer.
 *
 * Sizing & Animation Rules:
 * - Fully controllable via wheelRadius and deadZoneRadius props.
 * - Subtly refined hover expansion (6px push, 3px inner depth).
 * - Very subtle neighbor shrink (4px outer, 2px inner).
 * - Minimal gaps between sectors (0.8° base, 0.2° active).
 * - Sleek, thin glass borders (0.8px base, 1.2px active).
 * - Hub geometry stays strictly within deadZoneRadius bounds to avoid overlap.
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
// Action icon theme
// ---------------------------------------------------------------------------

interface ActionTheme {
  color: string;
  icon: React.JSX.Element;
}

function nameToHue(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h) + s.charCodeAt(i);
  return Math.abs(h) % 360;
}

function getAppTheme(exeName: string): ActionTheme {
  const n = exeName.toLowerCase().replace(/\.exe$/i, "").replace(/[_-]/g, " ").trim();

  if (/^(chrome|google chrome)$/.test(n)) return {
    color: "#4285F4",
    icon: (
      <>
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="4" fill="currentColor" stroke="none" />
        <line x1="12" y1="3" x2="12" y2="8" strokeLinecap="round" />
        <line x1="4.5" y1="16" x2="8.8" y2="13.5" strokeLinecap="round" />
        <line x1="19.5" y1="16" x2="15.2" y2="13.5" strokeLinecap="round" />
      </>
    ),
  };
  if (/firefox/.test(n)) return { color: "#FF7139", icon: (<><circle cx="12" cy="12" r="9" /><path d="M12 3C7 3 3 7 3 12c0 5 4 9 9 9" strokeDasharray="4 2" /><circle cx="12" cy="12" r="3" fill="currentColor" stroke="none" /></>) };
  if (/edge|msedge/.test(n)) return { color: "#0F7ECA", icon: (<><path d="M5 8C5 5 8 3 12 3c5 0 8 3.5 8 7.5C20 15 16 18 12 18c-4 0-7-2-8-5" /><line x1="4" y1="13" x2="18" y2="13" strokeLinecap="round" /></>) };
  if (/^(code|vscode|visual studio code)$/.test(n)) return { color: "#007ACC", icon: (<><path d="M17 3L3 12l14 9 4-3-12-6 12-6-4-3z" /></>) };
  if (/photoshop|pshop/.test(n)) return { color: "#31A8FF", icon: (<><rect x="2" y="2" width="20" height="20" rx="3" fill="currentColor" fillOpacity="0.15" /><rect x="2" y="2" width="20" height="20" rx="3" /><text x="12" y="15.5" textAnchor="middle" fontSize="8" fontWeight="bold" fontFamily="'Outfit','Inter',sans-serif" fill="currentColor" stroke="none">Ps</text></>) };
  if (/afterfx|after.?effects/.test(n)) return { color: "#9B8BFF", icon: (<><rect x="2" y="2" width="20" height="20" rx="3" fill="currentColor" fillOpacity="0.15" /><rect x="2" y="2" width="20" height="20" rx="3" /><text x="12" y="15.5" textAnchor="middle" fontSize="8" fontWeight="bold" fontFamily="'Outfit','Inter',sans-serif" fill="currentColor" stroke="none">Ae</text></>) };
  if (/premiere|ppro/.test(n)) return { color: "#9B55FF", icon: (<><rect x="2" y="2" width="20" height="20" rx="3" fill="currentColor" fillOpacity="0.15" /><rect x="2" y="2" width="20" height="20" rx="3" /><text x="12" y="15.5" textAnchor="middle" fontSize="8" fontWeight="bold" fontFamily="'Outfit','Inter',sans-serif" fill="currentColor" stroke="none">Pr</text></>) };
  if (/illustrator/.test(n)) return { color: "#FF9A00", icon: (<><rect x="2" y="2" width="20" height="20" rx="3" fill="currentColor" fillOpacity="0.15" /><rect x="2" y="2" width="20" height="20" rx="3" /><text x="12" y="15.5" textAnchor="middle" fontSize="8" fontWeight="bold" fontFamily="'Outfit','Inter',sans-serif" fill="currentColor" stroke="none">Ai</text></>) };
  if (/blender/.test(n)) return { color: "#F5792A", icon: (<><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4" fill="currentColor" fillOpacity="0.25" stroke="none" /><path d="M12 3v4M12 17v4M3 12h4M17 12h4" strokeLinecap="round" /></>) };
  if (/spotify/.test(n)) return { color: "#1DB954", icon: (<><circle cx="12" cy="12" r="9" /><path d="M7 9c4-2 8-1 10 2M7 12c3-1.5 7-1 9 2M8 15c3-1 6-.5 7.5 1.5" strokeLinecap="round" /></>) };
  if (/discord/.test(n)) return { color: "#5865F2", icon: (<><path d="M20 4C18 3 15 2.5 12 2.5S6 3 4 4 2 7 3.5 15c1.5 2 4 3.5 6.5 4l2 2 2-2c2.5-.5 5-2 6.5-4C22 7 22 5 20 4z" /><circle cx="9" cy="11" r="1.5" fill="currentColor" stroke="none" /><circle cx="15" cy="11" r="1.5" fill="currentColor" stroke="none" /></>) };
  if (/slack/.test(n)) return { color: "#E01E5A", icon: (<><circle cx="8.5" cy="7.5" r="2" /><circle cx="15.5" cy="7.5" r="2" /><circle cx="8.5" cy="14.5" r="2" /><circle cx="15.5" cy="14.5" r="2" /><line x1="8.5" y1="9.5" x2="8.5" y2="12.5" /><line x1="15.5" y1="9.5" x2="15.5" y2="12.5" /><line x1="10.5" y1="7.5" x2="13.5" y2="7.5" /><line x1="10.5" y1="14.5" x2="13.5" y2="14.5" /></>) };
  if (/explorer|finder/.test(n)) return { color: "#FFD700", icon: (<><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></>) };
  if (/terminal|powershell|cmd|wt\.?exe|alacritty|wezterm/.test(n)) return { color: "#00D2FF", icon: (<><polyline points="4 17 10 11 4 5" /><line x1="12" y1="19" x2="20" y2="19" /></>) };
  if (/notepad/.test(n)) return { color: "#90E66E", icon: (<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></>) };

  const initial = (n[0] ?? "?").toUpperCase();
  const hue = nameToHue(n);
  return {
    color: `hsl(${hue}, 65%, 65%)`,
    icon: (<>
      <circle cx="12" cy="12" r="10" fill="currentColor" fillOpacity="0.20" stroke="currentColor" />
      <text x="12" y="16" textAnchor="middle" fontSize="12" fontWeight="bold"
        fontFamily="'Outfit','Inter',sans-serif" fill="currentColor" stroke="none">{initial}</text>
    </>),
  };
}

function getActionTheme(label: string): ActionTheme {
  const n = label.toLowerCase();

  if (n.includes("ease")) return { color: "#FF4365", icon: (<><path d="M3 12C6 12 7 4 12 4s6 8 9 8" strokeLinecap="round" /><circle cx="3" cy="12" r="1.5" fill="currentColor" stroke="none" /><circle cx="21" cy="12" r="1.5" fill="currentColor" stroke="none" /></>) };
  if (n.includes("compose")) return { color: "#F9CDAD", icon: (<><rect x="3" y="7" width="10" height="10" rx="1.5" /><rect x="11" y="3" width="10" height="10" rx="1.5" fill="currentColor" fillOpacity="0.2" /><path d="M11 12V7l5 0" strokeDasharray="2 2" /></>) };
  if (n.includes("trim")) return { color: "#83AF9B", icon: (<><path d="M21 12a9 9 0 1 1-4.5-7.8" strokeDasharray="14 6" strokeLinecap="round" /><path d="M16.5 4.2l2.5-1.7.5 3" fill="currentColor" stroke="none" /></>) };
  if (n.includes("duplicate") || n.includes("copy")) return { color: "#C8C8A9", icon: (<><rect x="9" y="9" width="11" height="11" rx="1.5" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></>) };
  if (n.includes("parent") || n.includes("child")) return { color: "#F9CDAD", icon: (<><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></>) };
  if (n.includes("graph")) return { color: "#C8C8A9", icon: (<><line x1="18" y1="20" x2="18" y2="10" strokeLinecap="round" /><line x1="12" y1="20" x2="12" y2="4" strokeLinecap="round" /><line x1="6" y1="20" x2="6" y2="14" strokeLinecap="round" /><line x1="3" y1="20" x2="21" y2="20" /></>) };
  if (n.includes("setting") || n.includes("easywheel")) return { color: "#C8C8A9", icon: (<><circle cx="12" cy="12" r="3" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" /></>) };
  if (n.includes("folder") || n.includes("explorer")) return { color: "#FFD700", icon: (<><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></>) };
  if (n.includes("browser") || n.includes("website") || n.includes("web")) return { color: "#83AF9B", icon: (<><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></>) };
  if (n.includes("undo")) return { color: "#83AF9B", icon: (<><polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 .49-3.27" /></>) };
  if (n.includes("ae") || n.includes("after effect")) return { color: "#9B8BFF", icon: (<><rect x="2" y="2" width="20" height="20" rx="3" fill="currentColor" fillOpacity="0.15" /><rect x="2" y="2" width="20" height="20" rx="3" /><text x="12" y="15.5" textAnchor="middle" fontSize="8" fontWeight="bold" fontFamily="'Outfit','Inter',sans-serif" fill="currentColor" stroke="none">Ae</text></>) };
  if (n.includes("clipboard") || n.includes("paste")) return { color: "#F9CDAD", icon: (<><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><rect x="8" y="2" width="8" height="4" rx="1" /></>) };
  if (n.includes("cut")) return { color: "#FF4365", icon: (<><circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><line x1="20" y1="4" x2="8.12" y2="15.88" /><line x1="14.47" y1="14.47" x2="20" y2="20" /><line x1="8.12" y1="8.12" x2="12" y2="12" /></>) };

  return { color: "#C8C8A9", icon: (<><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></>) };
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
  labelToCommand?: Record<string, { commandType: string; exeName?: string }>;
  appIcons?: Record<string, string>;
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
}: WheelRendererProps): React.JSX.Element {
  const sectorSpan       = 360 / sectorCount;
  const isAnySectorActive = !inDeadZone && sector !== 255;
  
  // Hub radius strictly stays within deadZoneRadius
  const hubR = Math.max(16, deadZoneRadius - 3);

  // Content midpoint radius dynamically placed between deadZoneRadius and wheelRadius
  const ringThickness = wheelRadius - deadZoneRadius;
  const baseContentR  = deadZoneRadius + ringThickness * 0.52;

  // Calculate icon scaling factor if the wheel ring is small
  const iconScale = Math.min(1.0, Math.max(0.65, ringThickness / 80));

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
        const centre     = i * sectorSpan;
        const isActive   = isAnySectorActive && sector === i;
        const isNeighbor_ = isAnySectorActive && !isActive && isNeighbor(i, sector, sectorCount);
        const isDimmed   = isAnySectorActive && !isActive;

        // ── Angular gaps ────────────────────────────────────────────────────
        const gap = isActive
          ? ACTIVE_GAP
          : isNeighbor_
          ? NEIGHBOR_GAP
          : isDimmed
          ? DIM_GAP
          : BASE_GAP;

        const startAngle = centre - sectorSpan / 2 + gap;
        const endAngle   = centre + sectorSpan / 2 - gap;

        // ── Radial bounds ───────────────────────────────────────────────────
        const outerR = isActive
          ? wheelRadius - 1                             // full boundary
          : isNeighbor_
          ? wheelRadius - 1 - NEIGHBOR_OUTER_SHRINK     // subtle 4px pullback
          : isDimmed
          ? wheelRadius - 1 - DIM_OUTER_SHRINK          // subtle 2px pullback
          : wheelRadius - 1;

        const innerR = isActive
          ? deadZoneRadius + 3 - ACTIVE_INNER_SHRINK    // subtle 3px expansion inward
          : isNeighbor_
          ? deadZoneRadius + 3 + NEIGHBOR_INNER_GROW     // subtle 2px pullback
          : isDimmed
          ? deadZoneRadius + 3 + DIM_INNER_GROW          // subtle 1px pullback
          : deadZoneRadius + 3;

        const sectorPath = annularSectorPath(cx, cy, innerR, outerR, startAngle, endAngle);

        // ── Radial translate ────────────────────────────────────────────────
        const rad = (centre * Math.PI) / 180;
        const tx  = isActive ? Math.cos(rad) * EXPAND_PX : 0;
        const ty  = isActive ? Math.sin(rad) * EXPAND_PX : 0;
        const groupTransform = (tx !== 0 || ty !== 0) ? `translate(${tx}, ${ty})` : "";

        // ── Icon / label theme & custom app icon resolution ────────────────
        const displayName = sectorLabels[i] ?? "";
        const cmdInfo = labelToCommand[displayName];
        const theme: ActionTheme = cmdInfo?.commandType === "launch_app" && cmdInfo.exeName
          ? getAppTheme(cmdInfo.exeName)
          : getActionTheme(displayName);

        const customAppIconUrl =
          appIcons[i.toString()] ||
          appIcons[displayName] ||
          (cmdInfo?.exeName && appIcons[cmdInfo.exeName]);

        // ── Content position ────────────────────────────────────────────────
        const contentRAdj = baseContentR + (isActive ? 2 : 0);
        const contentPos  = polarToCartesian(cx, cy, contentRAdj, centre);

        // ── Border colors & strokes ─────────────────────────────────────────
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

        return (
          <g
            key={i}
            className={`wheel-sector-group${isActive ? " wheel-sector-group--active" : ""}${isDimmed ? " wheel-sector-group--dimmed" : ""}`}
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

            {/* Icon + Label */}
            {displayName && (
              <g
                transform={`translate(${contentPos.x}, ${contentPos.y}) scale(${iconScale})`}
                style={{ transition: `transform ${EASE}` }}
              >
                {/* Icon: Native extracted exe logo (no filter) or vector fallback */}
                {customAppIconUrl ? (
                  <image
                    href={customAppIconUrl}
                    x={isActive ? -14 : -12}
                    y={isActive ? -26 : -22}
                    width={isActive ? 28 : 24}
                    height={isActive ? 28 : 24}
                    preserveAspectRatio="xMidYMid meet"
                    style={{
                      filter: "none",
                    }}
                  />
                ) : (
                  <svg
                    x={isActive ? -13 : -11}
                    y={isActive ? -24 : -20}
                    width={isActive ? 26 : 22}
                    height={isActive ? 26 : 22}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={isActive ? "#FFFFFF" : isNeighbor_ ? "rgba(210,195,200,0.75)" : theme.color}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{
                      filter: isActive
                        ? "drop-shadow(0 0 5px rgba(255,255,255,0.60))"
                        : "none",
                      transition: `stroke ${EASE}`,
                    }}
                  >
                    {theme.icon}
                  </svg>
                )}

                {/* Label */}
                <text
                  x={0}
                  y={isActive ? 16 : 14}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill={isActive ? "#FFFFFF" : isNeighbor_ ? "rgba(210,195,200,0.70)" : "#E0D8D4"}
                  fontSize={isActive ? "11" : "10"}
                  fontWeight={isActive ? "700" : "500"}
                  fontFamily="'Outfit','Inter',ui-sans-serif,system-ui,sans-serif"
                  style={{
                    userSelect: "none",
                    filter: isActive
                      ? "drop-shadow(0 0 6px rgba(252,144,154,0.70))"
                      : "none",
                    transition: `fill ${EASE}, font-size ${EASE}`,
                  }}
                >
                  {displayName.length > 13
                    ? `${displayName.substring(0, 10)}\u2026`
                    : displayName}
                </text>
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
        {/* Soft glow ring strictly within deadZone bounds */}
        <circle
          cx={cx} cy={cy} r={hubR + 3}
          fill="none"
          stroke={highlightColor || "rgba(255, 67, 101, 0.15)"}
          strokeWidth="4"
        />

        {/* Hub base */}
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

        {/* Hub glass sheen */}
        <circle
          cx={cx - hubR * 0.15}
          cy={cy - hubR * 0.18}
          r={hubR * 0.65}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="0.5"
        />

        {/* Hub inner accent ring */}
        <circle
          cx={cx} cy={cy} r={Math.max(8, hubR - 5)}
          fill="none"
          stroke={inDeadZone ? (highlightColor || "rgba(255,100,130,0.30)") : "rgba(255,255,255,0.04)"}
          strokeWidth="0.8"
          style={{ transition: `stroke ${EASE}` }}
        />
      </g>
    </svg>
  );
}

export default WheelRenderer;
