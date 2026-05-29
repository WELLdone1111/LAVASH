import { useEffect } from "react";
import { isTauri } from "@tauri-apps/api/core";
import { useI18n } from "@/i18n/context";
import {
  buildLavashDocument,
  LAVASH_DOCUMENT_EXTENSION,
  parseLavashDocumentText,
  applyLavashDocument,
  type LavashDocumentApplyTarget,
} from "@/features/lavashconstruct/documents/model/lavashDocument";
import { isLavashDocumentPath } from "@/features/lavashconstruct/documents/model/lavashDocumentPath";
import {
  useLavashDocumentStore,
  type LavashDocumentBuildInput,
} from "@/features/lavashconstruct/documents/model/lavashDocumentStore";
import { sanitizeArtboardPanels } from "@/features/lavashconstruct/artboard/model/sanitizeArtboardPanels";
import {
  dispatchNewChatTabRequest,
  registerFileMenuHandlers,
} from "../model/fileMenuBus";
import {
  downloadTextFile,
  pickOpenFiles,
  pickOpenFolderFiles,
  spawnLavashWindow,
} from "../model/fileMenuWindowActions";
import type { AdvancedExportKind, ExportFormat } from "@/features/lavashconstruct/shared/model/types";
import type { ArtboardPanel, ConstructEditableState } from "@/features/lavashconstruct/artboard/ui/types";
import type { ConstructLibraryItem } from "@/features/lavashconstruct/shared/model/libraryItem";
import {
  openProjectFolderFromMenu,
  useProjectWorkspaceStore,
} from "@/features/lavashconstruct/project/model/projectWorkspaceStore";
import { confirmDiscardWorkspaceChanges } from "@/features/lavashconstruct/project/model/workspaceUnsavedGuard";

export type FileMenuSaveContext = {
  constructState: ConstructEditableState;
  artboardPanels: ArtboardPanel[];
  selectedPanelId: string | null;
  selectedPanelIds: string[];
  userLibraryItems: ConstructLibraryItem[];
  selectedExportFormat: ExportFormat;
  selectedAdvancedExport: AdvancedExportKind;
  setConstructStateDirect: (state: ConstructEditableState) => void;
  setArtboardPanelsDirect: (panels: ArtboardPanel[]) => void;
  setSelectedPanelId: (id: string | null) => void;
  setSelectedExportFormat: (format: ExportFormat) => void;
  setSelectedAdvancedExport: (kind: AdvancedExportKind) => void;
  setUserLibraryItems: (items: ConstructLibraryItem[]) => void;
  onImportFiles: (files: File[]) => Promise<void>;
};

function buildApplyTarget(ctx: FileMenuSaveContext): LavashDocumentApplyTarget {
  return {
    setConstructState: ctx.setConstructStateDirect,
    setArtboardPanels: (panels) => ctx.setArtboardPanelsDirect(sanitizeArtboardPanels(panels) ?? []),
    setSelectedPanelId: ctx.setSelectedPanelId,
    setSelectedExportFormat: ctx.setSelectedExportFormat,
    setSelectedAdvancedExport: ctx.setSelectedAdvancedExport,
    setUserLibraryItems: ctx.setUserLibraryItems,
  };
}

function buildDocInput(ctx: FileMenuSaveContext): LavashDocumentBuildInput {
  return {
    constructState: ctx.constructState,
    artboardPanels: ctx.artboardPanels,
    selectedPanelId: ctx.selectedPanelId,
    selectedExportFormat: ctx.selectedExportFormat,
    selectedAdvancedExport: ctx.selectedAdvancedExport,
    userLibraryItems: ctx.userLibraryItems,
  };
}

export function useRegisterFileMenuHandlers(ctx: FileMenuSaveContext) {
  const { t } = useI18n();

  useEffect(() => {
    const applyTarget = buildApplyTarget(ctx);

    const applyDocumentFromText = (text: string, fallbackName: string): boolean => {
      const doc = parseLavashDocumentText(text);
      if (!doc) return false;
      applyLavashDocument({ ...doc, name: doc.name || fallbackName }, applyTarget);
      return true;
    };

    const exportDocumentDownload = (name: string) => {
      const doc = buildLavashDocument({ name, ...buildDocInput(ctx) });
      const safeName = name.replace(/[^\w\u0400-\u04FF.-]+/g, "_").slice(0, 80) || "lavash";
      downloadTextFile(`${safeName}${LAVASH_DOCUMENT_EXTENSION}`, JSON.stringify(doc, null, 2));
    };

    return registerFileMenuHandlers({
      newTextFile: () => dispatchNewChatTabRequest(),
      newLavashDocument: () => {
        if (!confirmDiscardWorkspaceChanges(t("construct.unsaved.discardConfirm"))) return;
        useProjectWorkspaceStore.getState().closeOpenFile();
        useLavashDocumentStore.getState().newBlankDocument(applyTarget);
      },
      newWindow: () => spawnLavashWindow("lavash-main-secondary", "LAVASH"),
      newAgentsWindow: () => spawnLavashWindow("lavash-agents", "LAVASH Agents"),
      openLavashDocument: async () => {
        if (!confirmDiscardWorkspaceChanges(t("construct.unsaved.discardConfirm"))) return;
        if (isTauri()) {
          useProjectWorkspaceStore.getState().closeOpenFile();
          await useLavashDocumentStore.getState().pickAndOpen(applyTarget);
          return;
        }
        const files = await pickOpenFiles();
        if (!files.length) return;
        const file = files.find((f) => isLavashDocumentPath(f.name));
        if (!file) {
          window.alert(t("file.menu.openLavashOnly"));
          return;
        }
        const text = await file.text();
        const name = file.name.replace(/\.[^.]+$/, "");
        useLavashDocumentStore.getState().openFromText(text, name, applyTarget);
      },
      openFile: async () => {
        const files = await pickOpenFiles();
        if (!files.length) return;
        for (const file of files) {
          if (isLavashDocumentPath(file.name)) {
            const text = await file.text();
            const name = file.name.replace(/\.[^.]+$/, "");
            if (isTauri()) {
              /* pickAndOpen already handles desktop; webkit path for dropped paths is rare */
            }
            if (
              useLavashDocumentStore.getState().openFromText(text, name, applyTarget) ||
              applyDocumentFromText(text, name)
            ) {
              continue;
            }
          }
          await ctx.onImportFiles([file]);
        }
      },
      openFolder: async () => {
        if (isTauri()) {
          const root = await openProjectFolderFromMenu();
          if (root) window.alert(t("file.menu.openFolderDone", { path: root }));
          return;
        }
        const files = await pickOpenFolderFiles();
        if (!files.length) return;
        const root = files[0]?.webkitRelativePath?.split("/")[0] ?? files[0]?.name ?? "";
        await ctx.onImportFiles(files);
        window.alert(t("file.menu.openFolderDone", { path: root }));
      },
      import: async () => {
        const files = await pickOpenFiles();
        if (!files.length) return;
        for (const file of files) {
          if (isLavashDocumentPath(file.name)) {
            const text = await file.text();
            const name = file.name.replace(/\.[^.]+$/, "");
            if (
              useLavashDocumentStore.getState().openFromText(text, name, applyTarget) ||
              applyDocumentFromText(text, name)
            ) {
              continue;
            }
          }
          await ctx.onImportFiles([file]);
        }
      },
      export: () => {
        if (ctx.artboardPanels.length === 0) {
          window.alert(t("file.menu.exportEmpty"));
          return;
        }
        const name =
          window.prompt(t("file.menu.saveAsPrompt"), "lavash-design")?.trim() || "lavash-design";
        exportDocumentDownload(name);
      },
      save: async () => {
        if (isTauri()) {
          const store = useLavashDocumentStore.getState();
          if (store.filePath) {
            await store.save(buildDocInput(ctx));
            return;
          }
          const saved = await store.saveAs(buildDocInput(ctx));
          if (!saved) return;
          return;
        }
        /* Без Tauri — snapshot лишається в localStorage. */
      },
      saveAs: async () => {
        if (isTauri()) {
          await useLavashDocumentStore.getState().saveAs(buildDocInput(ctx));
          return;
        }
        const name = window.prompt(t("file.menu.saveAsPrompt"), "lavash-design")?.trim();
        if (!name) return;
        exportDocumentDownload(name);
      },
    });
  }, [ctx, t]);
}
