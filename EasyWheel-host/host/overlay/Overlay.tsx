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
  const windowOffsetRef = useRef<WindowOffset>({ x: 0, y: 0 });

  // Stores the RAF cancellation ID for cleanup on unmount.
  const rafRef = useRef<number>(0);

  useEffect(() => {
    invoke("overlay_log", {
      msg: `Overlay mounted. Viewport=${window.innerWidth}x${window.innerHeight}, DPR=${window.devicePixelRatio}`,
    }).catch(() => {});

    // Fetch the window's physical-pixel position once on mount.
    getCurrentWindow()
      .innerPosition()
      .then((pos) => {
        setWindowOffset({ x: pos.x, y: pos.y });
        windowOffsetRef.current = { x: pos.x, y: pos.y };
        invoke("overlay_log", {
          msg: `Overlay innerPosition resolved: (${pos.x}, ${pos.y})`,
        }).catch(() => {});
      })
      .catch((err) => {
        invoke("overlay_log", {
          msg: `Overlay innerPosition failed: ${String(err)}`,
        }).catch(() => {});
      });

    let eventCount = 0;
    const handlePointer = (e: MouseEvent | PointerEvent, source: string): void => {
      eventCount++;
      const dpr = window.devicePixelRatio || 1;
      const physX = e.clientX * dpr + windowOffsetRef.current.x;
      const physY = e.clientY * dpr + windowOffsetRef.current.y;

      if (eventCount === 1 || eventCount % 30 === 0) {
        const pe = e as PointerEvent;
        const msg = `[${source} #${eventCount}] type=${e.type}, client=(${e.clientX}, ${e.clientY}), page=(${e.pageX}, ${e.pageY}), screen=(${e.screenX}, ${e.screenY}), pointerType=${pe.pointerType || "mouse"}, isPrimary=${pe.isPrimary ?? true}, phys=(${physX.toFixed(1)}, ${physY.toFixed(1)})`;
        invoke("overlay_log", { msg }).catch(() => {});
      }

      invoke("report_pointer_position", { x: physX, y: physY }).catch((err) => {
        invoke("overlay_log", {
          msg: `invoke report_pointer_position error: ${String(err)}`,
        }).catch(() => {});
      });
    };

    const onPointerMove = (e: PointerEvent) => handlePointer(e, "window.pointermove");
    const onMouseMove = (e: MouseEvent) => handlePointer(e, "window.mousemove");
    const onPointerDown = (e: PointerEvent) => handlePointer(e, "window.pointerdown");
    const onPointerEnter = (e: PointerEvent) => handlePointer(e, "window.pointerenter");

    window.addEventListener("pointermove", onPointerMove, { passive: true, capture: true });
    window.addEventListener("mousemove", onMouseMove, { passive: true, capture: true });
    window.addEventListener("pointerdown", onPointerDown, { passive: true, capture: true });
    window.addEventListener("pointerenter", onPointerEnter, { passive: true, capture: true });
    document.addEventListener("pointermove", onPointerMove, { passive: true, capture: true });

    invoke("overlay_log", { msg: "Pointer and mouse event listeners installed on window & document (capture=true)" }).catch(() => {});

    let alive = true;
    let pollCount = 0;

    /**
     * RAF polling loop.
     */
    const poll = (): void => {
      if (!alive) return;
      invoke<GeometryState>("get_geometry_state")
        .then((s) => {
          pollCount++;
          if (s.active && pollCount % 60 === 0) {
            invoke("overlay_log", {
              msg: `[RAF Poll #${pollCount}] active=${s.active}, origin=(${s.origin_x.toFixed(0)}, ${s.origin_y.toFixed(0)}), sector=${s.sector}, in_dead_zone=${s.in_dead_zone}`,
            }).catch(() => {});
          }
          setGeo(s);
        })
        .catch(() => {})
        .finally(() => {
          if (alive) rafRef.current = requestAnimationFrame(poll);
        });
    };

    rafRef.current = requestAnimationFrame(poll);

    const onResize = () => {
      invoke("overlay_log", {
        msg: `Overlay window resize event. Viewport=${window.innerWidth}x${window.innerHeight}, DPR=${window.devicePixelRatio}`,
      }).catch(() => {});
    };
    window.addEventListener("resize", onResize);

    return () => {
      alive = false;
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", onPointerMove, { capture: true });
      window.removeEventListener("mousemove", onMouseMove, { capture: true });
      window.removeEventListener("pointerdown", onPointerDown, { capture: true });
      window.removeEventListener("pointerenter", onPointerEnter, { capture: true });
      document.removeEventListener("pointermove", onPointerMove, { capture: true });
    };
  }, []);

  // Convert the physical-pixel origin to CSS pixels for the SVG layout.
  const center = toCssPx(geo.origin_x, geo.origin_y, windowOffset);

  return (
    <div className="overlay-root">
      {/*
       * Render wheel whenever tracking is active.
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
          wheelOpacity={geo.wheel_opacity}
          sectorLabels={geo.sector_labels}
        />
      )}
    </div>
  );
}

export default Overlay;
