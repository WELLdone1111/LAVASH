import { invoke, isTauri } from "@tauri-apps/api/core";

export type GitFileStatus = {
  path: string;
  status: string;
};

export async function workspaceCreateFile(relativePath: string, contents = ""): Promise<void> {
  if (!isTauri()) return;
  await invoke("workspace_create_file", { relativePath, contents: contents || null });
}

export async function workspaceCreateDir(relativeDir: string): Promise<void> {
  if (!isTauri()) return;
  await invoke("workspace_create_dir", { relativeDir });
}

export async function workspaceRename(oldRelative: string, newRelative: string): Promise<void> {
  if (!isTauri()) return;
  await invoke("workspace_rename", { oldRelative, newRelative });
}

export async function workspaceDelete(relativePath: string, recursive = false): Promise<void> {
  if (!isTauri()) return;
  await invoke("workspace_delete", { relativePath, recursive });
}

export async function gitIsRepo(): Promise<boolean> {
  if (!isTauri()) return false;
  try {
    return await invoke<boolean>("git_is_repo");
  } catch {
    return false;
  }
}

export async function gitStatus(): Promise<GitFileStatus[]> {
  if (!isTauri()) return [];
  try {
    return await invoke<GitFileStatus[]>("git_status");
  } catch {
    return [];
  }
}

export async function gitDiff(relativePath: string): Promise<string> {
  if (!isTauri()) return "";
  return invoke<string>("git_diff", { relativePath });
}

export async function terminalSpawn(cwd?: string): Promise<string> {
  return invoke<string>("terminal_spawn", { cwd: cwd ?? null });
}

export async function terminalWrite(sessionId: string, data: string): Promise<void> {
  await invoke("terminal_write", { sessionId, data });
}

export async function terminalKill(sessionId: string): Promise<void> {
  await invoke("terminal_kill", { sessionId });
}
