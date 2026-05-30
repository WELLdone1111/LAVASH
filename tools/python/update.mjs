import { execFileSync } from "node:child_process";

import {
  pythonChannel,
  readManifest,
  resolveUvExecutable,
  runUv,
  uvEnv,
  writeManifest,
} from "./common.mjs";

function uvOutput(uvPath, args) {
  return execFileSync(uvPath, args, { encoding: "utf8", env: uvEnv() }).trim();
}

const uvPath = await resolveUvExecutable();
console.log(`Updating Python runtime via ${uvPath}`);

try {
  runUv(uvPath, ["self", "update"]);
} catch {
  await resolveUvExecutable();
}

try {
  runUv(uvPath, ["python", "upgrade", pythonChannel]);
} catch {
  runUv(uvPath, ["python", "install", pythonChannel]);
}

runUv(uvPath, ["sync", "--group", "dev", "--upgrade", "--python", pythonChannel]);

const pythonPath = uvOutput(uvPath, ["python", "find", pythonChannel]);
const uvVersion = uvOutput(uvPath, ["--version"]);

await writeManifest({
  ...(await readManifest()),
  uvVersion,
  pythonVersion: pythonPath,
  lastUpdateCheckMs: Date.now(),
});

console.log(`Python updated: ${pythonPath}`);
