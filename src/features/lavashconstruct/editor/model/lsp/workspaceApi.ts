import { invoke, isTauri } from "@tauri-apps/api/core";

let workspaceReady: Promise<string> | null = null;

export async function ensureWorkspaceReady(): Promise<string | null> {
  if (!isTauri()) return null;
  if (!workspaceReady) {
    workspaceReady = invoke<string>("workspace_init");
  }
  try {
    return await workspaceReady;
  } catch (error) {
    workspaceReady = null;
    console.warn("[workspace] init failed", error);
    return null;
  }
}

export async function syncWorkspaceFile(relativePath: string, contents: string): Promise<void> {
  if (!isTauri()) return;
  await ensureWorkspaceReady();
  await invoke("workspace_write_file", { relativePath, contents });
}

export async function getWorkspaceFileUri(relativePath: string): Promise<string | null> {
  if (!isTauri()) return null;
  await ensureWorkspaceReady();
  try {
    return await invoke<string>("workspace_file_uri", { relativePath });
  } catch {
    return null;
  }
}

export async function getWorkspaceRoot(): Promise<string | null> {
  if (!isTauri()) return null;
  return ensureWorkspaceReady();
}

export async function readWorkspaceFile(relativePath: string): Promise<string | null> {
  if (!isTauri()) return null;
  await ensureWorkspaceReady();
  try {
    return await invoke<string>("workspace_read_file", { relativePath });
  } catch (error) {
    console.warn("[workspace] read failed", relativePath, error);
    return null;
  }
}

export type WorkspaceFileMetadata = {
  modified_ms: number;
  size: number;
};

export async function getWorkspaceFileMetadata(
  relativePath: string,
): Promise<WorkspaceFileMetadata | null> {
  if (!isTauri()) return null;
  try {
    return await invoke<WorkspaceFileMetadata>("workspace_file_metadata", { relativePath });
  } catch {
    return null;
  }
}

export async function getProjectRoot(): Promise<string | null> {
  if (!isTauri()) return null;
  try {
    return (await invoke<string | null>("workspace_get_project_root")) ?? null;
  } catch {
    return null;
  }
}
