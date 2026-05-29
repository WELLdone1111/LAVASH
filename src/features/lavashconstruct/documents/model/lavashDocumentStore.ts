import { create } from "zustand";
import { invoke, isTauri } from "@tauri-apps/api/core";
import { open, save } from "@tauri-apps/plugin-dialog";
import {
  buildLavashDocument,
  createBlankLavashDocument,
  parseLavashDocumentText,
  applyLavashDocument,
  LAVASH_DOCUMENT_EXTENSION,
  type LavashDocumentApplyTarget,
} from "@/features/lavashconstruct/documents/model/lavashDocument";
import { lavashDocumentDisplayName } from "@/features/lavashconstruct/documents/model/lavashDocumentPath";
import type { AdvancedExportKind, ExportFormat } from "@/features/lavashconstruct/shared/model/types";
import type { ArtboardPanel, ConstructEditableState } from "@/features/lavashconstruct/artboard/ui/types";
import type { ConstructLibraryItem } from "@/features/lavashconstruct/shared/model/libraryItem";
import { ensureWorkspaceReady } from "@/features/lavashconstruct/editor/model/lsp/workspaceApi";

const ACTIVE_DOC_STORAGE_KEY = "lavash-active-document-path";

export type LavashDocumentBuildInput = {
  constructState: ConstructEditableState;
  artboardPanels: ArtboardPanel[];
  selectedPanelId: string | null;
  selectedExportFormat: ExportFormat;
  selectedAdvancedExport: AdvancedExportKind;
  userLibraryItems: ConstructLibraryItem[];
};

type LavashDocumentStoreState = {
  filePath: string | null;
  displayName: string;
  dirty: boolean;
  diskMtimeMs: number | null;
  externalStale: boolean;
  saving: boolean;
  markDirty: () => void;
  hydratePersistedPath: (apply: LavashDocumentApplyTarget) => Promise<void>;
  openAbsolutePath: (absolutePath: string, apply: LavashDocumentApplyTarget) => Promise<boolean>;
  openProjectRelative: (relativePath: string, apply: LavashDocumentApplyTarget) => Promise<boolean>;
  pickAndOpen: (apply: LavashDocumentApplyTarget) => Promise<boolean>;
  openFromText: (text: string, displayName: string, apply: LavashDocumentApplyTarget) => boolean;
  save: (input: LavashDocumentBuildInput) => Promise<boolean>;
  saveAs: (input: LavashDocumentBuildInput) => Promise<boolean>;
  reloadFromDisk: (apply: LavashDocumentApplyTarget) => Promise<boolean>;
  dismissExternalStale: () => void;
  clear: () => void;
  newBlankDocument: (apply: LavashDocumentApplyTarget, name?: string) => void;
};

let autosaveTimer: ReturnType<typeof setTimeout> | null = null;
let pendingAutosave: (() => void) | null = null;

async function readFsMetadata(absolutePath: string): Promise<{ modified_ms: number; size: number } | null> {
  if (!isTauri()) return null;
  try {
    return await invoke<{ modified_ms: number; size: number }>("fs_metadata", { absolutePath });
  } catch {
    return null;
  }
}

async function readFsText(absolutePath: string): Promise<string | null> {
  if (!isTauri()) return null;
  try {
    return await invoke<string>("fs_read_text", { absolutePath });
  } catch (error) {
    console.warn("[lavash-doc] read failed", absolutePath, error);
    return null;
  }
}

async function writeFsText(absolutePath: string, contents: string): Promise<boolean> {
  if (!isTauri()) return false;
  try {
    await invoke("fs_write_text", { absolutePath, contents });
    return true;
  } catch (error) {
    console.warn("[lavash-doc] write failed", absolutePath, error);
    return false;
  }
}

function persistActivePath(path: string | null) {
  try {
    if (path) localStorage.setItem(ACTIVE_DOC_STORAGE_KEY, path);
    else localStorage.removeItem(ACTIVE_DOC_STORAGE_KEY);
  } catch {
    /* ignore quota */
  }
}

function applyFromText(
  text: string,
  absolutePath: string,
  apply: LavashDocumentApplyTarget,
): boolean {
  const doc = parseLavashDocumentText(text);
  if (!doc) return false;
  applyLavashDocument(
    { ...doc, name: doc.name || lavashDocumentDisplayName(absolutePath) },
    apply,
  );
  return true;
}

export const useLavashDocumentStore = create<LavashDocumentStoreState>((set, get) => ({
  filePath: null,
  displayName: "LAVASH",
  dirty: false,
  diskMtimeMs: null,
  externalStale: false,
  saving: false,

  markDirty() {
    const { dirty } = get();
    if (!dirty) set({ dirty: true, externalStale: false });
  },

  async hydratePersistedPath(apply) {
    if (!isTauri()) return;
    const stored = localStorage.getItem(ACTIVE_DOC_STORAGE_KEY);
    if (!stored?.trim()) return;
    await get().openAbsolutePath(stored.trim(), apply);
  },

  async openAbsolutePath(absolutePath, apply) {
    if (!isTauri()) return false;
    const text = await readFsText(absolutePath);
    if (text == null) return false;
    if (!applyFromText(text, absolutePath, apply)) return false;
    const meta = await readFsMetadata(absolutePath);
    const name = lavashDocumentDisplayName(absolutePath);
    persistActivePath(absolutePath);
    set({
      filePath: absolutePath,
      displayName: name,
      dirty: false,
      diskMtimeMs: meta?.modified_ms ?? null,
      externalStale: false,
    });
    return true;
  },

  async openProjectRelative(relativePath, apply) {
    if (!isTauri()) return false;
    await ensureWorkspaceReady();
    try {
      const absolutePath = await invoke<string>("workspace_resolve_file", { relativePath });
      const text = await invoke<string>("workspace_read_file", { relativePath });
      if (!applyFromText(text, absolutePath, apply)) return false;
      const meta = await invoke<{ modified_ms: number; size: number }>("workspace_file_metadata", {
        relativePath,
      });
      persistActivePath(absolutePath);
      set({
        filePath: absolutePath,
        displayName: lavashDocumentDisplayName(absolutePath),
        dirty: false,
        diskMtimeMs: meta.modified_ms,
        externalStale: false,
      });
      return true;
    } catch (error) {
      console.warn("[lavash-doc] open project file failed", relativePath, error);
      return false;
    }
  },

  async pickAndOpen(apply) {
    if (!isTauri()) return false;
    const selected = await open({
      multiple: false,
      title: "Open LAVASH document",
      filters: [{ name: "LAVASH", extensions: ["lavash.json", "lavash"] }],
    });
    if (!selected || Array.isArray(selected)) return false;
    return get().openAbsolutePath(selected, apply);
  },

  openFromText(text, displayName, apply) {
    const virtualPath = `/${displayName}${LAVASH_DOCUMENT_EXTENSION}`;
    if (!applyFromText(text, virtualPath, apply)) return false;
    persistActivePath(null);
    set({
      filePath: null,
      displayName,
      dirty: true,
      diskMtimeMs: null,
      externalStale: false,
    });
    return true;
  },

  async save(input) {
    const path = get().filePath;
    if (!path || !isTauri()) return false;
    set({ saving: true });
    const doc = buildLavashDocument({
      name: get().displayName,
      ...input,
    });
    const ok = await writeFsText(path, JSON.stringify(doc, null, 2));
    const meta = ok ? await readFsMetadata(path) : null;
    set({
      saving: false,
      dirty: !ok,
      diskMtimeMs: meta?.modified_ms ?? get().diskMtimeMs,
      externalStale: false,
    });
    return ok;
  },

  async saveAs(input) {
    if (!isTauri()) return false;
    const selected = await save({
      title: "Save LAVASH document",
      defaultPath: `${get().displayName || "lavash-design"}${LAVASH_DOCUMENT_EXTENSION}`,
      filters: [{ name: "LAVASH", extensions: ["lavash.json", "lavash"] }],
    });
    if (!selected) return false;
    persistActivePath(selected);
    set({
      filePath: selected,
      displayName: lavashDocumentDisplayName(selected),
    });
    return get().save(input);
  },

  async reloadFromDisk(apply) {
    const path = get().filePath;
    if (!path || !isTauri()) return false;
    const text = await readFsText(path);
    if (text == null) return false;
    if (!applyFromText(text, path, apply)) return false;
    const meta = await readFsMetadata(path);
    set({ dirty: false, diskMtimeMs: meta?.modified_ms ?? null, externalStale: false });
    return true;
  },

  dismissExternalStale() {
    set({ externalStale: false });
  },

  clear() {
    persistActivePath(null);
    set({
      filePath: null,
      displayName: "LAVASH",
      dirty: false,
      diskMtimeMs: null,
      externalStale: false,
      saving: false,
    });
  },

  newBlankDocument(apply, name = "Untitled") {
    applyLavashDocument(createBlankLavashDocument(name), apply);
    persistActivePath(null);
    set({
      filePath: null,
      displayName: name,
      dirty: true,
      diskMtimeMs: null,
      externalStale: false,
    });
  },
}));

export function scheduleLavashDocumentAutosave(run: () => void) {
  pendingAutosave = run;
  if (autosaveTimer) clearTimeout(autosaveTimer);
  autosaveTimer = setTimeout(() => {
    autosaveTimer = null;
    const fn = pendingAutosave;
    pendingAutosave = null;
    fn?.();
  }, 1200);
}

export function cancelLavashDocumentAutosave(): void {
  if (autosaveTimer) clearTimeout(autosaveTimer);
  autosaveTimer = null;
  pendingAutosave = null;
}

export async function checkLavashDocumentExternalChange(): Promise<boolean> {
  const { filePath, diskMtimeMs, dirty, externalStale } = useLavashDocumentStore.getState();
  if (!filePath || dirty || externalStale || diskMtimeMs == null || !isTauri()) return false;
  const meta = await readFsMetadata(filePath);
  if (!meta || meta.modified_ms === diskMtimeMs) return false;
  useLavashDocumentStore.setState({ externalStale: true, diskMtimeMs: meta.modified_ms });
  return true;
}
