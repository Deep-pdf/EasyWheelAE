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
import type { AppConfig, ConfiguredCommand } from "../settings/types";
import WheelRenderer from "./WheelRenderer";
import "./Overlay.css";

// ---------------------------------------------------------------------------
// launch_app sector metadata
// ---------------------------------------------------------------------------

interface SectorCommandInfo {
  commandType: string;
  /** Basename of the exe without extension, e.g. "chrome" for chrome.exe */
  exeName?: string;
  url?: string;
}

/** Extract exe basename (without path or .exe) from a Windows file path. */
function exeBasename(filePath: string): string {
  const parts = filePath.replace(/\\/g, "/").split("/");
  const file  = parts[parts.length - 1] ?? "";
  return file.replace(/\.exe$/i, "").toLowerCase();
}

/** Build a label → SectorCommandInfo map from all profiles in the config. */
function buildLabelMap(config: AppConfig): Record<string, SectorCommandInfo> {
  const map: Record<string, SectorCommandInfo> = {};
  for (const profile of config.profiles) {
    for (const raw of Object.values(profile.sector_assignments)) {
      if (typeof raw === "object" && raw !== null) {
        const cmd = raw as ConfiguredCommand;
        const label = (cmd.label ?? "").trim();
        if (!label) continue;
        if (cmd.command === "launch_app" && cmd.parameters?.path) {
          map[label] = {
            commandType: "launch_app",
            exeName: exeBasename(cmd.parameters.path as string),
          };
        } else if (cmd.command === "open_website" && cmd.parameters?.url) {
          map[label] = {
            commandType: "open_website",
            url: cmd.parameters.url as string,
          };
        } else {
          map[label] = { commandType: cmd.command };
        }
      }
    }
  }
  return map;
}

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
  /** Active executable filename of the focused application. */
  active_executable: string;
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
  active_executable: "",
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
  const [labelToCommand, setLabelToCommand] = useState<Record<string, SectorCommandInfo>>({});
  const [appIcons, setAppIcons] = useState<Record<string, string>>({});
  const [hubIconUrl, setHubIconUrl] = useState<string>("");

  // Stores the RAF cancellation ID for cleanup on unmount.
  const rafRef = useRef<number>(0);

  // Load config once on mount to resolve launch_app labels → exe names & extract native icons.
  useEffect(() => {
    invoke<AppConfig>("get_config")
      .then((cfg) => {
        setLabelToCommand(buildLabelMap(cfg));
        // Extract app and web icons
        for (const profile of cfg.profiles) {
          for (const [sectorKey, raw] of Object.entries(profile.sector_assignments)) {
            if (typeof raw === "object" && raw !== null) {
              const cmd = raw as ConfiguredCommand;
              const isLaunchApp = cmd.command === "launch_app" && cmd.parameters?.path;
              const isOpenWebsite = cmd.command === "open_website" && cmd.parameters?.url;
              if (isLaunchApp || isOpenWebsite) {
                const pathStr = isLaunchApp ? String(cmd.parameters.path) : String(cmd.parameters.url);
                const label = (cmd.label ?? "").trim();
                const exe = isLaunchApp ? exeBasename(pathStr) : "";

                invoke<string>("get_app_icon", { path: pathStr, label: label })
                  .then((iconUrl) => {
                    setAppIcons((prev) => ({
                      ...prev,
                      [sectorKey]: iconUrl,
                      [pathStr]: iconUrl,
                      ...(exe ? { [exe]: iconUrl } : {}),
                      ...(label ? { [label]: iconUrl } : {}),
                    }));
                  })
                  .catch((err) => {
                    console.log("[Overlay] Icon loading failed for:", pathStr, err);
                  });
              }
            }
          }
        }
      })
      .catch(() => {
        // Non-fatal: icons fall back to keyword-matched defaults.
      });
  }, []);

  // Sync theme on mount and when changed
  useEffect(() => {
    const resolveTheme = () => {
      const storedTheme = localStorage.getItem("ew-theme") || "dark";
      if (storedTheme === "system") {
        const isLight = window.matchMedia("(prefers-color-scheme: light)").matches;
        document.documentElement.setAttribute("data-theme", isLight ? "light" : "dark");
      } else {
        document.documentElement.setAttribute("data-theme", storedTheme);
      }
    };

    resolveTheme();

    const handleStorage = (e: StorageEvent) => {
      if (e.key === "ew-theme") {
        resolveTheme();
      }
    };

    const mediaQuery = window.matchMedia("(prefers-color-scheme: light)");
    const handleThemeChange = () => {
      const storedTheme = localStorage.getItem("ew-theme") || "dark";
      if (storedTheme === "system") {
        resolveTheme();
      }
    };

    window.addEventListener("storage", handleStorage);
    mediaQuery.addEventListener("change", handleThemeChange);

    return () => {
      window.removeEventListener("storage", handleStorage);
      mediaQuery.removeEventListener("change", handleThemeChange);
    };
  }, []);

  // Hub icon loading effect
  useEffect(() => {
    if (geo.active_executable) {
      invoke<string>("get_app_icon", { path: geo.active_executable })
        .then((iconUrl) => {
          setHubIconUrl(iconUrl);
        })
        .catch(() => {
          setHubIconUrl("");
        });
    } else {
      setHubIconUrl("");
    }
  }, [geo.active_executable]);

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
    <div className="overlay-root">
      {/*
       * Suppress rendering entirely until tracking is active.
       * The brief gap between window.show() and the first fresh poll
       * resolving would otherwise flash the wheel at stale coordinates
       * from the previous session.
       *
       * NOTE: opacity is intentionally NOT set on this div. Applying
       * opacity < 1 to a full-viewport container forces WebView2 to
       * allocate a separate compositing surface, which bleeds a faint
       * rectangle on some Windows/GPU configurations. Opacity control
       * is applied directly on the <svg> element inside WheelRenderer.
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
          labelToCommand={labelToCommand}
          appIcons={appIcons}
          hubIconUrl={hubIconUrl}
        />
      )}
    </div>
  );
}

export default Overlay;
