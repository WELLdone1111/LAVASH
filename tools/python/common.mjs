import { execFileSync } from "node:child_process";
import { createWriteStream } from "node:fs";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "../..");
const pythonChannel = "3.13";

export function lavashAppDataRoot() {
  if (process.platform === "win32") {
    const base = process.env.LOCALAPPDATA;
    if (!base) throw new Error("LOCALAPPDATA is not set");
    return path.join(base, "lavash");
  }
  if (process.platform === "darwin") {
    const home = process.env.HOME;
    if (!home) throw new Error("HOME is not set");
    return path.join(home, "Library", "Application Support", "lavash");
  }
  const home = process.env.HOME;
  if (!home) throw new Error("HOME is not set");
  const dataHome = process.env.XDG_DATA_HOME ?? path.join(home, ".local", "share");
  return path.join(dataHome, "lavash");
}

function uvAssetName() {
  if (process.platform === "win32") return "uv-x86_64-pc-windows-msvc.zip";
  if (process.platform === "darwin") {
    return process.arch === "arm64"
      ? "uv-aarch64-apple-darwin.tar.gz"
      : "uv-x86_64-apple-darwin.tar.gz";
  }
  return "uv-x86_64-unknown-linux-gnu.tar.gz";
}

async function fetchLatestUvVersion() {
  const response = await fetch("https://api.github.com/repos/astral-sh/uv/releases/latest", {
    headers: { "User-Agent": "LAVASH-IDE" },
  });
  if (!response.ok) return "0.7.13";
  const payload = (await response.json()) as { tag_name?: string };
  return (payload.tag_name ?? "0.7.13").replace(/^v/, "");
}

export async function resolveUvExecutable() {
  const installDir = path.join(lavashAppDataRoot(), "tools", "uv");
  const uvName = process.platform === "win32" ? "uv.exe" : "uv";
  const uvPath = path.join(installDir, uvName);
  if (process.env.LAVASH_UV?.trim()) {
    return process.env.LAVASH_UV.trim();
  }
  try {
    execFileSync(uvPath, ["--version"], { stdio: "ignore" });
    return uvPath;
  } catch {
    const version = await fetchLatestUvVersion();
    const asset = uvAssetName();
    const url = `https://github.com/astral-sh/uv/releases/download/v${version}/${asset}`;
    const response = await fetch(url, { headers: { "User-Agent": "LAVASH-IDE" } });
    if (!response.ok || !response.body) {
      throw new Error(`Failed to download uv ${version}`);
    }
    await mkdir(installDir, { recursive: true });
    const archivePath = path.join(installDir, "uv-download.archive");
    await pipeline(response.body, createWriteStream(archivePath));
    if (asset.endsWith(".zip")) {
      if (process.platform === "win32") {
        execFileSync(
          "powershell",
          ["-NoProfile", "-Command", `Expand-Archive -Path '${archivePath}' -DestinationPath '${installDir}' -Force`],
          { stdio: "inherit" },
        );
      } else {
        throw new Error("Zip uv archive requires PowerShell on Windows");
      }
    } else {
      execFileSync("tar", ["-xzf", archivePath, "-C", installDir], { stdio: "inherit" });
    }
    await rm(archivePath, { force: true });
    return uvPath;
  }
}

export function uvEnv() {
  const pythonHome = path.join(lavashAppDataRoot(), "python");
  return {
    ...process.env,
    UV_PYTHON_INSTALL_DIR: pythonHome,
    UV_PROJECT_ENVIRONMENT: path.join(pythonHome, "venv"),
    UV_TOOL_DIR: path.join(lavashAppDataRoot(), "tools", "uv-tools"),
  };
}

export function runUv(uvPath, args, options = {}) {
  execFileSync(uvPath, args, {
    cwd: projectRoot,
    stdio: "inherit",
    env: uvEnv(),
    ...options,
  });
}

export async function writeManifest(payload) {
  const manifestPath = path.join(lavashAppDataRoot(), "python", "runtime-manifest.json");
  await mkdir(path.dirname(manifestPath), { recursive: true });
  await writeFile(manifestPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

export async function readManifest() {
  const manifestPath = path.join(lavashAppDataRoot(), "python", "runtime-manifest.json");
  try {
    return JSON.parse(await readFile(manifestPath, "utf8"));
  } catch {
    return {};
  }
}

export { projectRoot, pythonChannel };
