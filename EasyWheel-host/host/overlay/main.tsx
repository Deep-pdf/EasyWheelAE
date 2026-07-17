import React from "react";
import ReactDOM from "react-dom/client";
import Overlay from "./Overlay";

/**
 * Overlay window entry point.
 *
 * This file is the React root for the overlay window only. It is completely
 * independent of `host/main.tsx` (the main/settings window entry point).
 * Vite processes both entry points separately via `build.rollupOptions.input`.
 */
ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <Overlay />
  </React.StrictMode>,
);
