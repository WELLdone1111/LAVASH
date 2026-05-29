import { create } from "zustand";
import { invoke, isTauri } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import {
  ensureWorkspaceReady,
  readWorkspaceFile,
  syncWorkspaceFile,
} from "@/features/lavashconstruct/editor/model/lsp/workspaceApi";
import {
  ensureArtboardPanelForProjectFile,
  isProjectFilePreviewable,
} from "@/features/lavashconstruct/project/model/projectArtboardLink";

export type ProjectViewMode = "split" | "design" | "code";

const PROJECT_VIEW_MODE_KEY = "lavash-project-view-mode";

function readPersistedViewMode(): ProjectViewMode {
  try {
    const raw = localStorage.getItem(PROJECT_VIEW_MODE_KEY);
    if (raw === "design" || raw === "code" || raw === "split") return raw;
  } catch {
    /* ignore */
  }
  return "split";
}

export type WorkspaceTreeNode = {
  path: string;
  name: string;
  kind: "file" | "dir";
  children?: WorkspaceTreeNode[];
};

type OpenProjectFile = {
  path: string;
  content: string;
  dirty: boolean;
  diskMtimeMs: number | null;
};

type ProjectExternalKind = "project-file" | null;

function joinRelativePath(parentDir: string, name: string): string {
  const base = parentDir.replace(/\\/g, "/").replace(/\/+$/, "");
  const leaf = name.replace(/\\/g, "/").replace(/^\/+/, "");
  return base ? `${base}/${leaf}` : leaf;
}

type ProjectWorkspaceState = {
  projectRoot: string | null;
  tree: WorkspaceTreeNode[];
  loading: boolean;
  openFile: OpenProjectFile | null;
  viewMode: ProjectViewMode;
  gitStatusMap: Record<string, string>;
  setViewMode: (mode: ProjectViewMode) => void;
  hydrate: () => Promise<void>;
  pickAndOpenFolder: () => Promise<string | null>;
  setProjectRootFromPath: (path: string) => Promise<string | null>;
  refreshTree: () => Promise<void>;
  refreshGitStatus: () => Promise<void>;
  openProjectFile: (relativePath: string) => Promise<void>;
  setOpenFileContent: (content: string, markDirty?: boolean) => void;
  saveOpenFile: () => Promise<void>;
  closeProject: () => Promise<void>;
  closeOpenFile: () => void;
  createFile: (parentDir: string, name: string) => Promise<void>;
  createFolder: (parentDir: string, name: string) => Promise<void>;
  renameEntry: (relativePath: string, newName: string) => Promise<void>;
  deleteEntry: (relativePath: string, isDir: boolean) => Promise<void>;
  externalStale: boolean;
  externalStaleKind: ProjectExternalKind;
  reloadOpenFileFromDisk: () => Promise<boolean>;
  dismissExternalStale: () => void;
};

let saveTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleSave(path: string, content: string) {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = null;
    void syncWorkspaceFile(path, content);
  }, 700);
}

export const useProjectWorkspaceStore = create<ProjectWorkspaceState>((set, get) => ({
  projectRoot: null,
  tree: [],
  loading: false,
  openFile: null,
  viewMode: readPersistedViewMode(),
  gitStatusMap: {},
  externalStale: false,
  externalStaleKind: null,

  setViewMode(mode) {
    try {
      localStorage.setItem(PROJECT_VIEW_MODE_KEY, mode);
    } catch {
      /* ignore */
    }
    set({ viewMode: mode });
  },

  async hydrate() {
    if (!isTauri()) return;
    await ensureWorkspaceReady();
    try {
      const root = await invoke<string | null>("workspace_get_project_root");
      if (!root) return;
      set({ projectRoot: root, loading: true });
      const tree = await invoke<WorkspaceTreeNode[]>("workspace_list_tree");
      set({ tree, loading: false });
    } catch (error) {
      console.warn("[project] hydrate failed", error);
      set({ loading: false });
    }
  },

  async pickAndOpenFolder() {
    if (!isTauri()) return null;
    const selected = await open({
      directory: true,
      multiple: false,
      title: "Open folder",
    });
    if (!selected || Array.isArray(selected)) return null;
    return get().setProjectRootFromPath(selected);
  },

  async setProjectRootFromPath(path: string) {
    if (!isTauri()) return null;
    await ensureWorkspaceReady();
    set({ loading: true, openFile: null });
    try {
      const root = await invoke<string>("workspace_set_project_root", { path });
      const tree = await invoke<WorkspaceTreeNode[]>("workspace_list_tree");
      set({ projectRoot: root, tree, loading: false });
      return root;
    } catch (error) {
      console.warn("[project] set root failed", error);
      set({ loading: false });
      return null;
    }
  },

  async refreshTree() {
    if (!isTauri() || !get().projectRoot) return;
    set({ loading: true });
    try {
      const tree = await invoke<WorkspaceTreeNode[]>("workspace_list_tree");
      set({ tree, loading: false });
    } catch (error) {
      console.warn("[project] list tree failed", error);
      set({ loading: false });
    }
  },

  async refreshGitStatus() {
    if (!isTauri() || !get().projectRoot) {
      set({ gitStatusMap: {} });
      return;
    }
    // Git status UI is optional; keep empty until a dedicated command exists.
    set({ gitStatusMap: {} });
  },

  async createFile(parentDir: string, name: string) {
    if (!isTauri() || !get().projectRoot) return;
    const relativePath = joinRelativePath(parentDir, name);
    try {
      await invoke("workspace_write_file", { relativePath, contents: "" });
      await get().refreshTree();
    } catch (error) {
      console.warn("[project] create file failed", relativePath, error);
    }
  },

  async createFolder(parentDir: string, name: string) {
    if (!isTauri() || !get().projectRoot) return;
    const relativePath = joinRelativePath(parentDir, name);
    try {
      await invoke("workspace_create_dir", { relativePath });
      await get().refreshTree();
    } catch (error) {
      console.warn("[project] create folder failed", relativePath, error);
    }
  },

  async renameEntry(relativePath: string, newName: string) {
    if (!isTauri() || !get().projectRoot) return;
    try {
      await invoke("workspace_rename_entry", { relativePath, newName });
      await get().refreshTree();
    } catch (error) {
      console.warn("[project] rename failed", relativePath, error);
    }
  },

  async deleteEntry(relativePath: string, isDir: boolean) {
    if (!isTauri() || !get().projectRoot) return;
    try {
      await invoke("workspace_delete_entry", { relativePath, isDir });
      const open = get().openFile;
      if (open?.path === relativePath) {
        set({ openFile: null });
      }
      await get().refreshTree();
    } catch (error) {
      console.warn("[project] delete failed", relativePath, error);
    }
  },

  async openProjectFile(relativePath: string) {
    if (!isTauri() || !get().projectRoot) return;
    set({ loading: true });
    try {
      const content = await readWorkspaceFile(relativePath);
      if (content == null) throw new Error("read failed");
      const meta = await readProjectFileMetadata(relativePath);
      const previewable = isProjectFilePreviewable(relativePath);
      set({
        openFile: {
          path: relativePath,
          content,
          dirty: false,
          diskMtimeMs: meta?.modified_ms ?? null,
        },
        viewMode: previewable ? "split" : "code",
        externalStale: false,
        externalStaleKind: null,
        loading: false,
      });
      if (previewable) {
        ensureArtboardPanelForProjectFile(relativePath, content);
      }
    } catch (error) {
      console.warn("[project] open file failed", relativePath, error);
      set({ loading: false });
    }
  },

  setOpenFileContent(content: string, markDirty = true) {
    const file = get().openFile;
    if (!file || file.content === content) return;
    set({ openFile: { ...file, content, dirty: markDirty ? true : file.dirty } });
    scheduleSave(file.path, content);
  },

  async saveOpenFile() {
    const file = get().openFile;
    if (!file) return;
    try {
      await syncWorkspaceFile(file.path, file.content);
      const meta = await readProjectFileMetadata(file.path);
      set({
        openFile: { ...file, dirty: false, diskMtimeMs: meta?.modified_ms ?? file.diskMtimeMs },
        externalStale: false,
        externalStaleKind: null,
      });
    } catch (error) {
      console.error("[project] saveOpenFile failed", file.path, error);
    }
  },

  async reloadOpenFileFromDisk() {
    const file = get().openFile;
    if (!file || !isTauri()) return false;
    try {
      const content = await readWorkspaceFile(file.path);
      if (content == null) return false;
      const meta = await readProjectFileMetadata(file.path);
      const previewable = isProjectFilePreviewable(file.path);
      set({
        openFile: {
          path: file.path,
          content,
          dirty: false,
          diskMtimeMs: meta?.modified_ms ?? null,
        },
        externalStale: false,
        externalStaleKind: null,
      });
      if (previewable) {
        ensureArtboardPanelForProjectFile(file.path, content);
      }
      return true;
    } catch (error) {
      console.warn("[project] reload failed", error);
      return false;
    }
  },

  dismissExternalStale() {
    set({ externalStale: false, externalStaleKind: null });
  },

  async closeProject() {
    if (!isTauri()) {
      set({ projectRoot: null, tree: [], openFile: null });
      return;
    }
    try {
      await invoke("workspace_clear_project_root");
    } catch (error) {
      console.warn("[project] clear root failed", error);
    }
    set({ projectRoot: null, tree: [], openFile: null });
  },

  closeOpenFile() {
    set({ openFile: null, viewMode: "split", externalStale: false, externalStaleKind: null });
  },
}));

async function readProjectFileMetadata(
  relativePath: string,
): Promise<{ modified_ms: number; size: number } | null> {
  if (!isTauri()) return null;
  try {
    return await invoke<{ modified_ms: number; size: number }>("workspace_file_metadata", {
      relativePath,
    });
  } catch {
    return null;
  }
}

export async function checkProjectFileExternalChange(): Promise<boolean> {
  const { openFile, externalStale } = useProjectWorkspaceStore.getState();
  if (!openFile || openFile.dirty || externalStale || openFile.diskMtimeMs == null || !isTauri()) {
    return false;
  }
  const meta = await readProjectFileMetadata(openFile.path);
  if (!meta || meta.modified_ms === openFile.diskMtimeMs) return false;
  useProjectWorkspaceStore.setState({
    externalStale: true,
    externalStaleKind: "project-file",
    openFile: { ...openFile, diskMtimeMs: meta.modified_ms },
  });
  return true;
}

export async function openProjectFolderFromMenu(): Promise<string | null> {
  return useProjectWorkspaceStore.getState().pickAndOpenFolder();
}
