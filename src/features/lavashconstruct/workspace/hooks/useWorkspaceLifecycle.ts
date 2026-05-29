import { useCallback, useEffect, useMemo, type Dispatch, type RefObject, type SetStateAction } from "react";
import {
  CONSTRUCT_SETTINGS_SCHEMA_VERSION,
  CONSTRUCT_SETTINGS_STORAGE_KEY,
} from "@/features/lavashconstruct/shared/model/constants";
import type { AdvancedExportKind, ExportFormat } from "@/features/lavashconstruct/shared/model/types";
import { normalizeExportFormat } from "@/features/lavashconstruct/shared/model/normalizeExportFormat";
import { safeNumber } from "@/features/lavashconstruct/shared/model/utils";
import { registerConstructArtboardLibraryPaster } from "@/features/lavashconstruct/chat/model/assistantConstructSync";
import { useConstructStore } from "@/features/lavashconstruct/artboard/model/store";
import { sanitizeArtboardPanels } from "@/features/lavashconstruct/artboard/model/sanitizeArtboardPanels";
import type { ConstructLibraryItem } from "@/features/lavashconstruct/shared/model/libraryItem";
import type { ArtboardPanel, ConstructEditableState } from "@/features/lavashconstruct/artboard/ui/types";
import { useProjectWorkspaceStore } from "@/features/lavashconstruct/project/model/projectWorkspaceStore";
import {
  cancelLavashDocumentAutosave,
  scheduleLavashDocumentAutosave,
  useLavashDocumentStore,
} from "@/features/lavashconstruct/documents/model/lavashDocumentStore";
import { useWorkspaceExternalWatch } from "@/features/lavashconstruct/project/model/useWorkspaceExternalWatch";
import { useLavashWindowTitle } from "@/features/lavashconstruct/workspace/model/useLavashWindowTitle";
import { confirmDiscardWorkspaceChanges } from "@/features/lavashconstruct/project/model/workspaceUnsavedGuard";
import { startConstructArtboardCodeSync } from "@/features/lavashconstruct/sync";
import { focusPanelLinkedCode } from "@/features/lavashconstruct/sync/model/panelSelectionSync";
import { safeLocalStorageSet } from "@/shared/lib/safeLocalStorage";
import { useI18n } from "@/i18n/context";
import { sanitizeUserLibraryItems } from "@/features/lavashconstruct/workspace/model/constructWorkspaceUtils";

export type UseWorkspaceLifecycleParams = {
  constructState: ConstructEditableState;
  artboardPanels: ArtboardPanel[];
  selectedPanelId: string | null;
  selectedExportFormat: ExportFormat;
  selectedAdvancedExport: AdvancedExportKind;
  userLibraryItems: ConstructLibraryItem[];
  setConstructStateDirect: ReturnType<typeof useConstructStore.getState>["setConstructStateDirect"];
  setArtboardPanelsDirect: ReturnType<typeof useConstructStore.getState>["setArtboardPanelsDirect"];
  setSelectedPanelId: (id: string | null) => void;
  setSelectedExportFormat: (format: ExportFormat) => void;
  setSelectedAdvancedExport: (kind: AdvancedExportKind) => void;
  setUserLibraryItems: Dispatch<SetStateAction<ConstructLibraryItem[]>>;
  openEditPanelRef: RefObject<(panelId: string) => void>;
  pasteImportedItemsToArtboardRef: RefObject<
    (items: ConstructLibraryItem[], targetWorld?: { x: number; y: number }) => void
  >;
};

export function useWorkspaceLifecycle({
  constructState,
  artboardPanels,
  selectedPanelId,
  selectedExportFormat,
  selectedAdvancedExport,
  userLibraryItems,
  setConstructStateDirect,
  setArtboardPanelsDirect,
  setSelectedPanelId,
  setSelectedExportFormat,
  setSelectedAdvancedExport,
  setUserLibraryItems,
  openEditPanelRef,
  pasteImportedItemsToArtboardRef,
}: UseWorkspaceLifecycleParams) {
  const { t } = useI18n();
  const hydrateProjectWorkspace = useProjectWorkspaceStore((s) => s.hydrate);

  const lavashDocumentApplyTarget = useMemo(
    () => ({
      setConstructState: setConstructStateDirect,
      setArtboardPanels: (panels: ArtboardPanel[]) =>
        setArtboardPanelsDirect(sanitizeArtboardPanels(panels) ?? []),
      setSelectedPanelId,
      setSelectedExportFormat,
      setSelectedAdvancedExport,
      setUserLibraryItems,
    }),
    [
      setConstructStateDirect,
      setArtboardPanelsDirect,
      setSelectedPanelId,
      setSelectedExportFormat,
      setSelectedAdvancedExport,
      setUserLibraryItems,
    ],
  );

  const lavashDocFilePath = useLavashDocumentStore((s) => s.filePath);

  const handleOpenLavashDocumentFromProject = useCallback(
    (relativePath: string) => {
      void useLavashDocumentStore
        .getState()
        .openProjectRelative(relativePath, lavashDocumentApplyTarget)
        .then((ok) => {
          if (ok) useProjectWorkspaceStore.getState().closeOpenFile();
        });
    },
    [lavashDocumentApplyTarget],
  );

  const handleNewLavashDocument = useCallback(() => {
    if (!confirmDiscardWorkspaceChanges(t("construct.unsaved.discardConfirm"))) return;
    useProjectWorkspaceStore.getState().closeOpenFile();
    useLavashDocumentStore.getState().newBlankDocument(lavashDocumentApplyTarget);
  }, [lavashDocumentApplyTarget, t]);

  const handleOpenLavashDocumentPicker = useCallback(() => {
    if (!confirmDiscardWorkspaceChanges(t("construct.unsaved.discardConfirm"))) return;
    useProjectWorkspaceStore.getState().closeOpenFile();
    void useLavashDocumentStore.getState().pickAndOpen(lavashDocumentApplyTarget);
  }, [lavashDocumentApplyTarget, t]);

  const handleReloadLavashDocument = useCallback(() => {
    void useLavashDocumentStore.getState().reloadFromDisk(lavashDocumentApplyTarget);
  }, [lavashDocumentApplyTarget]);

  useEffect(() => {
    void hydrateProjectWorkspace();
    void useLavashDocumentStore.getState().hydratePersistedPath(lavashDocumentApplyTarget);
  }, [hydrateProjectWorkspace, lavashDocumentApplyTarget]);

  useWorkspaceExternalWatch(true);
  useLavashWindowTitle();

  useEffect(() => {
    if (!lavashDocFilePath) return;
    useLavashDocumentStore.getState().markDirty();
    scheduleLavashDocumentAutosave(() => {
      const input = {
        constructState,
        artboardPanels,
        selectedPanelId,
        selectedExportFormat,
        selectedAdvancedExport,
        userLibraryItems,
      };
      void useLavashDocumentStore.getState().save(input);
    });
    return () => cancelLavashDocumentAutosave();
  }, [
    lavashDocFilePath,
    constructState,
    artboardPanels,
    selectedPanelId,
    selectedExportFormat,
    selectedAdvancedExport,
    userLibraryItems,
  ]);

  useEffect(() => {
    if (!selectedPanelId) return;
    const panel = artboardPanels.find((p) => p.id === selectedPanelId);
    if (!panel) return;
    focusPanelLinkedCode(panel, {
      openEditPanel: (id) => openEditPanelRef.current(id),
      setProjectViewMode: useProjectWorkspaceStore.getState().setViewMode,
    });
  }, [selectedPanelId, artboardPanels, openEditPanelRef]);

  useEffect(() => {
    const raw = localStorage.getItem(CONSTRUCT_SETTINGS_STORAGE_KEY);
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      const saved = {
        ...parsed,
        constructState: parsed.constructState as Partial<ConstructEditableState> | undefined,
      } as {
        schemaVersion?: number;
        constructState?: Partial<ConstructEditableState>;
        artboardPanels?: ArtboardPanel[];
        canvasPanels?: ArtboardPanel[];
        selectedPanelId?: string | null;
        selectedExportFormat?: string;
        selectedAdvancedExport?: AdvancedExportKind;
        userLibraryItems?: unknown;
      };
      const schemaVersion =
        typeof saved.schemaVersion === "number" ? saved.schemaVersion : 1;
      const currentState = useConstructStore.getState();

      const savedConstructState = saved.constructState;
      if (savedConstructState) {
        setConstructStateDirect({
          ...currentState.constructState,
          ...savedConstructState,
          magneticThreshold: safeNumber(
            savedConstructState.magneticThreshold,
            currentState.constructState.magneticThreshold,
            1,
            50,
          ),
        });
      }
      if (schemaVersion >= 2) {
        if (schemaVersion === 2) {
          setArtboardPanelsDirect([]);
          setSelectedPanelId(null);
        } else {
          const nextPanels = sanitizeArtboardPanels(saved.artboardPanels ?? saved.canvasPanels);
          setArtboardPanelsDirect(nextPanels ?? []);
          if (typeof saved.selectedPanelId === "string" || saved.selectedPanelId === null) {
            setSelectedPanelId(saved.selectedPanelId);
          }
        }
        if (saved.userLibraryItems !== undefined) {
          setUserLibraryItems(sanitizeUserLibraryItems(saved.userLibraryItems));
        }
      }
      if (saved.selectedExportFormat) {
        const fmt = normalizeExportFormat(saved.selectedExportFormat);
        if (fmt) setSelectedExportFormat(fmt);
      }
      if (saved.selectedAdvancedExport) setSelectedAdvancedExport(saved.selectedAdvancedExport);
    } catch {
      localStorage.removeItem(CONSTRUCT_SETTINGS_STORAGE_KEY);
    }
  // перший гідрат — один раз; eslint deps свідомо off
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const payload = {
      schemaVersion: CONSTRUCT_SETTINGS_SCHEMA_VERSION,
      constructState,
      artboardPanels,
      selectedPanelId,
      selectedExportFormat,
      selectedAdvancedExport,
      userLibraryItems,
    };
    safeLocalStorageSet(CONSTRUCT_SETTINGS_STORAGE_KEY, JSON.stringify(payload));
  }, [
    constructState,
    selectedExportFormat,
    selectedAdvancedExport,
    artboardPanels,
    selectedPanelId,
    userLibraryItems,
  ]);

  useEffect(() => {
    registerConstructArtboardLibraryPaster((items) => {
      pasteImportedItemsToArtboardRef.current(items);
    });
    return () => registerConstructArtboardLibraryPaster(null);
  }, [pasteImportedItemsToArtboardRef]);

  useEffect(() => {
    const stop = startConstructArtboardCodeSync();
    return stop;
  }, []);

  return {
    handleOpenLavashDocumentFromProject,
    handleNewLavashDocument,
    handleOpenLavashDocumentPicker,
    handleReloadLavashDocument,
  };
}
