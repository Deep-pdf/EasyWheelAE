import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/global.css";

/**
 * Application entry point.
 *
 * Mounts the React component tree into the `#root` element defined in
 * `index.html`. StrictMode is enabled unconditionally to surface potential
 * issues during development without any runtime cost in production.
 */
ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
