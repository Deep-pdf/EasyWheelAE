import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// TAURI_DEV_HOST is set by `tauri dev` when running on a remote device.
// @ts-expect-error process is a Node.js global available in the Vite config context.
const host = process.env.TAURI_DEV_HOST;

export default defineConfig({
  plugins: [react()],

  // Prevent Vite from obscuring Rust compile errors in the terminal.
  clearScreen: false,

  server: {
    // Tauri expects a fixed port; fail fast if it is already in use.
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // Exclude the Rust workspace from Vite's file watcher.
      ignored: ["**/src-tauri/**"],
    },
  },
});
