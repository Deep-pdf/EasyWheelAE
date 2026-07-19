/**
 * Overlay.tsx
 *
 * Phase 4 — Radial wheel overlay.
 *
 * Responsibilities:
 * - Poll `get_geometry_state` from the Rust backend at ~60 FPS.
 * - Convert the physical-pixel origin into CSS-pixel wheel center coordinates.
 * - Render <WheelRenderer> when tracking is active.
 *
 * Design constraints:
 * - `pointer-events: none` at every level — never intercepts mouse input.
 * - Background fully transparent at html / body / #root / .overlay-root.
 * - No debug UI, no coordinate readout, no angle or sector display.
 */

import React, { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import WheelRenderer from "./WheelRenderer";
import "./Overlay.css";

// ---------------------------------------------------------------------------
// Data model — mirrors geometry_manager::GeometryState on the Rust side
// ---------------------------------------------------------------------------

interface GeometryState {
  origin_x: number;
  origin_y: number;
  angle_deg: number;
  distance: number;
  /** 0–7 for active sector, 255 when in dead zone. */
  sector: number;
  in_dead_zone: boolean;
  /** `false` between tracking sessions — suppresses render until fresh data. */
  active: boolean;
  wheel_radius: number;
  dead_zone_radius: number;
  sector_count: number;
  highlight_color: string;
  default_color: string;
  wheel_opacity: number;
  /** Array of display labels for each sector. */
  sector_labels: string[];
}

const DEFAULT_STATE: GeometryState = {
  origin_x: 0,
  origin_y: 0,
  angle_deg: 0,
  distance: 0,
  sector: 255,
  in_dead_zone: true,
  active: false,
  wheel_radius: 120,
  dead_zone_radius: 40,
  sector_count: 8,
  highlight_color: "#FFFFFF33",
  default_color: "#FFFFFF11",
  wheel_opacity: 0.8,
  sector_labels: [],
};

// ---------------------------------------------------------------------------
// Coordinate helper
// ---------------------------------------------------------------------------

interface WindowOffset {
  x: number;
  y: number;
}

/**
 * Converts a physical screen coordinate (from GetCursorPos via Rust) into a
 * CSS pixel coordinate within this overlay window.
 *
 * GetCursorPos and innerPosition() both return physical pixels, so we subtract
 * the window's physical origin first, then divide by devicePixelRatio to get
 * CSS pixels — the unit used by the SVG layout engine.
 */
function toCssPx(screenX: number, screenY: number, offset: WindowOffset): { x: number; y: number } {
  const dpr = window.devicePixelRatio || 1;
  return {
    x: (screenX - offset.x) / dpr,
    y: (screenY - offset.y) / dpr,
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Overlay
 *
 * The top-level component for the EasyWheel transparent overlay window.
 * Mounts a single RAF polling loop that feeds geometry data into
 * WheelRenderer each frame. The component itself performs no geometry
 * calculations — it is a thin IPC-to-props bridge.
 */
function Overlay(): React.JSX.Element {
  const [geo, setGeo] = useState<GeometryState>(DEFAULT_STATE);
  const [windowOffset, setWindowOffset] = useState<WindowOffset>({ x: 0, y: 0 });

  // Stores the RAF cancellation ID for cleanup on unmount.
  const rafRef = useRef<number>(0);

  useEffect(() => {
    // Fetch the window's physical-pixel position once on mount.
    // The overlay window is full-screen and does not move, so a single read
    // is sufficient for the entire application lifetime.
    getCurrentWindow()
      .innerPosition()
      .then((pos) => setWindowOffset({ x: pos.x, y: pos.y }))
      .catch(() => {
        // Non-fatal: wheel will appear at slightly wrong position if the
        // window has a non-zero physical origin. Acceptable fallback.
      });

    let alive = true;

    /**
     * RAF polling loop.
     *
     * Invokes `get_geometry_state` every frame. On success, updates state
     * which triggers a re-render of WheelRenderer. `finally` ensures the loop
     * keeps running even when the invoke rejects transiently (e.g., during
     * app shutdown), preventing the loop from silently stalling.
     */
    const poll = (): void => {
      if (!alive) return;
      invoke<GeometryState>("get_geometry_state")
        .then((s) => setGeo(s))
        .catch(() => {
          // Transient IPC errors are non-fatal; continue polling.
        })
        .finally(() => {
          if (alive) rafRef.current = requestAnimationFrame(poll);
        });
    };

    rafRef.current = requestAnimationFrame(poll);

    return () => {
      alive = false;
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // Convert the physical-pixel origin to CSS pixels for the SVG layout.
  const center = toCssPx(geo.origin_x, geo.origin_y, windowOffset);

  return (
    <div className="overlay-root" style={{ opacity: geo.wheel_opacity }}>
      {/*
       * Suppress rendering entirely until tracking is active.
       * The brief gap between window.show() and the first fresh poll
       * resolving would otherwise flash the wheel at stale coordinates
       * from the previous session.
       */}
      {geo.active && (
        <WheelRenderer
          cx={center.x}
          cy={center.y}
          sector={geo.sector}
          inDeadZone={geo.in_dead_zone}
          wheelRadius={geo.wheel_radius}
          deadZoneRadius={geo.dead_zone_radius}
          sectorCount={geo.sector_count}
          highlightColor={geo.highlight_color}
          defaultColor={geo.default_color}
          sectorLabels={geo.sector_labels}
        />
      )}
    </div>
  );
}

export default Overlay;
