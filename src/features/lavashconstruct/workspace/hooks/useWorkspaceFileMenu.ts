import type { Dispatch, SetStateAction } from "react";
import type { AdvancedExportKind, ExportFormat } from "@/features/lavashconstruct/shared/model/types";
import { useConstructStore } from "@/features/lavashconstruct/artboard/model/store";
import type { ConstructLibraryItem } from "@/features/lavashconstruct/shared/model/libraryItem";
import type { ArtboardPanel, ConstructEditableState } from "@/features/lavashconstruct/artboard/ui/types";
import { useRegisterFileMenuHandlers } from "@/features/file-menu/hooks/useRegisterFileMenuHandlers";
import { useRegisterEditMenuHandlers } from "@/features/edit-menu/hooks/useRegisterEditMenuHandlers";

export type UseWorkspaceFileMenuParams = {
  constructState: ConstructEditableState;
  artboardPanels: ArtboardPanel[];
  selectedPanelId: string | null;
  selectedPanelIds: string[];
  copiedPanels: ArtboardPanel[];
  userLibraryItems: ConstructLibraryItem[];
  selectedExportFormat: ExportFormat;
  selectedAdvancedExport: AdvancedExportKind;
  setConstructStateDirect: ReturnType<typeof useConstructStore.getState>["setConstructStateDirect"];
  setArtboardPanelsDirect: ReturnType<typeof useConstructStore.getState>["setArtboardPanelsDirect"];
  setSelectedPanelId: (id: string | null) => void;
  setSelectedExportFormat: (format: ExportFormat) => void;
  setSelectedAdvancedExport: (kind: AdvancedExportKind) => void;
  setUserLibraryItems: Dispatch<SetStateAction<ConstructLibraryItem[]>>;
  setCopiedPanels: Dispatch<SetStateAction<ArtboardPanel[]>>;
  setSelectedPanelIds: (ids: string[] | ((current: string[]) => string[])) => void;
  commitArtboardPanels: ReturnType<typeof useConstructStore.getState>["commitArtboardPanels"];
  onImportFiles: (files: File[]) => Promise<void>;
};

export function useWorkspaceFileMenu({
  constructState,
  artboardPanels,
  selectedPanelId,
  selectedPanelIds,
  copiedPanels,
  userLibraryItems,
  selectedExportFormat,
  selectedAdvancedExport,
  setConstructStateDirect,
  setArtboardPanelsDirect,
  setSelectedPanelId,
  setSelectedExportFormat,
  setSelectedAdvancedExport,
  setUserLibraryItems,
  setCopiedPanels,
  setSelectedPanelIds,
  commitArtboardPanels,
  onImportFiles,
}: UseWorkspaceFileMenuParams) {
  useRegisterFileMenuHandlers({
    constructState,
    artboardPanels,
    selectedPanelId,
    selectedPanelIds,
    userLibraryItems,
    selectedExportFormat,
    selectedAdvancedExport,
    setConstructStateDirect,
    setArtboardPanelsDirect,
    setSelectedPanelId,
    setSelectedExportFormat,
    setSelectedAdvancedExport,
    setUserLibraryItems,
    onImportFiles,
  });

  useRegisterEditMenuHandlers({
    artboardPanels,
    selectedPanelId,
    selectedPanelIds,
    copiedPanels,
    setCopiedPanels,
    setSelectedPanelId,
    setSelectedPanelIds,
    commitArtboardPanels,
  });
}
