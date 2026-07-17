import React, { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import "./Overlay.css";

// ---------------------------------------------------------------------------
// Data model — mirrors input_manager::PointerState on the Rust side
// ---------------------------------------------------------------------------

interface PointerState {
  origin_x: number;
  origin_y: number;
  current_x: number;
  current_y: number;
  delta_x: number;
  delta_y: number;
  distance: number;
  /** Mirrors input_manager::PointerState.active. False between sessions. */
  active: boolean;
}

const DEFAULT_STATE: PointerState = {
  origin_x: 0,
  origin_y: 0,
  current_x: 0,
  current_y: 0,
  delta_x: 0,
  delta_y: 0,
  distance: 0,
  active: false,
};

// ---------------------------------------------------------------------------
// Coordinate helpers
// ---------------------------------------------------------------------------

interface WindowOffset {
  x: number;
  y: number;
}

/**
 * Converts a physical screen coordinate (from GetCursorPos) into a CSS pixel
 * coordinate within this overlay window.
 *
 * GetCursorPos and innerPosition() both return physical pixels, so we subtract
 * the window's physical origin first, then divide by devicePixelRatio to get
 * CSS pixels (the unit used by SVG layout).
 */
function toSvg(
  screenX: number,
  screenY: number,
  offset: WindowOffset,
): { x: number; y: number } {
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
 * Overlay — Phase 4 debug interface.
 *
 * Responsibilities:
 * - Poll `get_pointer_state` from the Rust backend at ~60 FPS.
 * - Render a monospace debug panel showing Origin / Current / Delta / Distance.
 * - Render an SVG canvas with an origin dot, cursor dot, and connecting line.
 *
 * Design constraints (inherited from Phase 3):
 * - `pointer-events: none` at every level — the overlay must never intercept
 *   mouse input from applications running beneath it.
 * - Background transparent at html / body / #root levels.
 * - No state, logic, or side effects beyond what this phase requires.
 */
function Overlay(): React.JSX.Element {
  const [state, setState] = useState<PointerState>(DEFAULT_STATE);
  const [windowOffset, setWindowOffset] = useState<WindowOffset>({ x: 0, y: 0 });

  // Ref holds the RAF id so the cleanup can cancel it even if the component
  // unmounts before the first invoke resolves.
  const rafRef = useRef<number>(0);

  useEffect(() => {
    // Fetch the window's physical-pixel position once on mount.
    // The overlay window is centered and does not move while active,
    // so a single read is sufficient for the entire session.
    getCurrentWindow()
      .innerPosition()
      .then((pos) => setWindowOffset({ x: pos.x, y: pos.y }))
      .catch(() => {
        // Non-fatal: coordinates will be screen-absolute if this fails.
        // In practice this call succeeds on all supported Windows versions.
      });

    let alive = true;

    /**
     * Polling loop: invoke `get_pointer_state`, update state, queue next frame.
     * Using `finally` ensures the next frame is always queued — even when the
     * invoke rejects (e.g., window is being torn down) — preventing the loop
     * from silently stalling.
     */
    const poll = (): void => {
      if (!alive) return;
      invoke<PointerState>("get_pointer_state")
        .then((s) => setState(s))
        .catch(() => {
          // Transient IPC errors are non-fatal; keep polling.
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

  // Derive SVG positions for this frame.
  const originPt = toSvg(state.origin_x, state.origin_y, windowOffset);
  const cursorPt = toSvg(state.current_x, state.current_y, windowOffset);

  return (
    <div className="overlay-root">
      {/* Render nothing until active: the brief gap between window.show()  */}
      {/* and the first fresh poll resolving would otherwise flash stale     */}
      {/* dot positions from the previous session.                           */}
      {state.active && (
        <>
          {/* -------------------------------------------------------------- */}
          {/* SVG canvas — covers the full viewport, pointer-events: none    */}
          {/* -------------------------------------------------------------- */}
          <svg
            className="overlay-svg"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            {/* Red line connecting origin to current cursor position */}
            <line
              x1={originPt.x}
              y1={originPt.y}
              x2={cursorPt.x}
              y2={cursorPt.y}
              stroke="#ef4444"
              strokeWidth="2"
              strokeLinecap="round"
            />
            {/* Origin dot */}
            <circle cx={originPt.x} cy={originPt.y} r="6" fill="#ffffff" />
            {/* Current cursor dot */}
            <circle cx={cursorPt.x} cy={cursorPt.y} r="6" fill="#ffffff" />
          </svg>

          {/* -------------------------------------------------------------- */}
          {/* Debug panel — top-left readout of all tracked values           */}
          {/* -------------------------------------------------------------- */}
          <div className="debug-panel" aria-label="Pointer debug readout">
            <div className="debug-group">
              <span className="debug-label">Origin</span>
              <span className="debug-value">X: {Math.round(state.origin_x)}</span>
              <span className="debug-value">Y: {Math.round(state.origin_y)}</span>
            </div>

            <div className="debug-group">
              <span className="debug-label">Current</span>
              <span className="debug-value">X: {Math.round(state.current_x)}</span>
              <span className="debug-value">Y: {Math.round(state.current_y)}</span>
            </div>

            <div className="debug-group">
              <span className="debug-label">Delta</span>
              <span className="debug-value">{Math.round(state.delta_x)}</span>
              <span className="debug-value">{Math.round(state.delta_y)}</span>
            </div>

            <div className="debug-group">
              <span className="debug-label">Distance</span>
              <span className="debug-value">{state.distance.toFixed(1)}</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default Overlay;
