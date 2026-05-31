/**
 * Tauri beforeDevCommand: унікальний build id + Vite dev на 127.0.0.1:1421.
 * Build id змушує WebView2 перезавантажити UI після змін (див. main.tsx).
 */
import { writeFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const buildId = String(Date.now());

writeFileSync(
  path.join(root, "src/lavash-ui-build-id.ts"),
  `/** Auto-generated on tauri dev start — не редагуй вручну */\nexport const LAVASH_UI_BUILD_ID = "${buildId}";\n`,
  "utf8",
);

writeFileSync(
  path.join(root, "public/lavash-build-id.js"),
  `window.__LAVASH_UI_BUILD_ID__="${buildId}";\n`,
  "utf8",
);

console.log(`[lavash] UI build id: ${buildId}`);

const viteBin = path.join(root, "node_modules", "vite", "bin", "vite.js");
const child = spawn(process.execPath, [viteBin], {
  cwd: root,
  stdio: "inherit",
  env: { ...process.env, LAVASH_TAURI_DEV: "1" },
});

child.on("exit", (code) => process.exit(code ?? 1));
