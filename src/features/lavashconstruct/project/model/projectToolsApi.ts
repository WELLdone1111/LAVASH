import { invoke, isTauri } from "@tauri-apps/api/core";

import type {
  DevToolsProbe,
  GitFileStatus,
  GitProbeResult,
  TerminalProbeResult,
} from "@/features/lavashconstruct/project/model/projectToolsModel";
import { formatDevToolsError } from "@/features/lavashconstruct/project/model/projectToolsModel";

export class DevToolsUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DevToolsUnavailableError";
  }
}

export async function probeDevTools(): Promise<DevToolsProbe> {
  if (!isTauri()) {
    return {
      terminal: { available: false, shell: "PowerShell" },
      git: { available: false, version: null },
    };
  }
  const [terminal, git] = await Promise.all([probeTerminal(), probeGit()]);
  return { terminal, git };
}

export async function probeTerminal(): Promise<TerminalProbeResult> {
  if (!isTauri()) return { available: false, shell: "PowerShell" };
  try {
    return await invoke<TerminalProbeResult>("terminal_probe");
  } catch {
    return { available: false, shell: "PowerShell" };
  }
}

export async function probeGit(): Promise<GitProbeResult> {
  if (!isTauri()) return { available: false, version: null };
  try {
    return await invoke<GitProbeResult>("git_probe");
  } catch {
    return { available: false, version: null };
  }
}

export async function fetchGitStatus(): Promise<GitFileStatus[]> {
  if (!isTauri()) return [];
  try {
    return await invoke<GitFileStatus[]>("git_status");
  } catch (error) {
    throw new Error(formatDevToolsError(error, "Git status failed"));
  }
}

export async function fetchGitIsRepo(): Promise<boolean> {
  if (!isTauri()) return false;
  try {
    return await invoke<boolean>("git_is_repo");
  } catch {
    return false;
  }
}

export async function fetchGitDiff(relativePath: string): Promise<string> {
  if (!isTauri()) return "";
  try {
    return await invoke<string>("git_diff", { relativePath });
  } catch (error) {
    throw new Error(formatDevToolsError(error, "Git diff failed"));
  }
}

export async function spawnTerminalSession(cwd?: string | null): Promise<string> {
  if (!isTauri()) {
    throw new DevToolsUnavailableError("Terminal requires LAVASH desktop.");
  }
  try {
    return await invoke<string>("terminal_spawn", { cwd: cwd ?? null });
  } catch (error) {
    throw new Error(formatDevToolsError(error, "Failed to start terminal"));
  }
}

export async function writeTerminalSession(sessionId: string, data: string): Promise<void> {
  if (!isTauri()) return;
  try {
    await invoke("terminal_write", { sessionId, data });
  } catch (error) {
    throw new Error(formatDevToolsError(error, "Failed to write to terminal"));
  }
}

export async function resizeTerminalSession(
  sessionId: string,
  rows: number,
  cols: number,
): Promise<void> {
  if (!isTauri()) return;
  try {
    await invoke("terminal_resize", { sessionId, rows, cols });
  } catch {
    /* resize is best-effort */
  }
}

export async function killTerminalSession(sessionId: string): Promise<void> {
  if (!isTauri()) return;
  try {
    await invoke("terminal_kill", { sessionId });
  } catch {
    /* session may already be gone */
  }
}
