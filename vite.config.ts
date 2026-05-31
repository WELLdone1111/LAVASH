import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;
// @ts-expect-error process is a nodejs global
const tauriDev = process.env.LAVASH_TAURI_DEV === "1";

export default defineConfig(async () => ({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: [
      {
        find: /^@\/lib\/(.+)$/,
        replacement: `${path.resolve(__dirname, "./src/shared/lib")}/$1`,
      },
      {
        find: /^@\/components\/(.+)$/,
        replacement: `${path.resolve(__dirname, "./src/shared/components")}/$1`,
      },
      { find: "@", replacement: path.resolve(__dirname, "./src") },
    ],
  },
  clearScreen: false,
  server: {
    port: 1421,
    strictPort: true,
    host: host || (tauriDev ? "127.0.0.1" : false),
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
      Pragma: "no-cache",
    },
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1422,
        }
      : tauriDev
        ? {
            protocol: "ws",
            host: "127.0.0.1",
            port: 1422,
          }
        : undefined,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
}));
