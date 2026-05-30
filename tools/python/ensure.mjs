import { execFileSync } from "node:child_process";

import {
  pythonChannel,
  readManifest,
  resolveUvExecutable,
  runUv,
  uvEnv,
  writeManifest,
} from "./common.mjs";

const quiet = process.argv.includes("--quiet");

function log(message) {
  if (!quiet) console.log(message);
}

function uvOutput(uvPath, args) {
  return execFileSync(uvPath, args, { encoding: "utf8", env: uvEnv() }).trim();
}

const uvPath = await resolveUvExecutable();
log(`Using uv at ${uvPath}`);

runUv(uvPath, ["python", "install", pythonChannel]);
runUv(uvPath, ["sync", "--group", "dev", "--python", pythonChannel]);

const pythonPath = uvOutput(uvPath, ["python", "find", pythonChannel]);
const uvVersion = uvOutput(uvPath, ["--version"]);

await writeManifest({
  ...(await readManifest()),
  uvVersion,
  pythonVersion: pythonPath,
  lastUpdateCheckMs: Date.now(),
});

log(`Python ready: ${pythonPath}`);
