import { useEffect } from "react";
import { useConstructStore } from "@/features/lavashconstruct/artboard/model/store";
import { collectPanelSubtreeIds } from "@/features/lavashconstruct/artboard/model/panelHierarchy";
import type { ArtboardPanel } from "@/features/lavashconstruct/artboard/ui/types";
import {
  isEditMenuActionEnabled,
  runEditMenuAction,
  type EditMenuActionId,
} from "@/features/edit-menu/model/editMenuBus";

export type UseWorkspaceKeyboardShortcutsParams = {
  artboardPanels: ArtboardPanel[];
  selectedPanelId: string | null;
  selectedPanelIds: string[];
  commitArtboardPanels: ReturnType<typeof useConstructStore.getState>["commitArtboardPanels"];
  setSelectedPanelId: (id: string | null) => void;
  setSelectedPanelIds: (ids: string[] | ((current: string[]) => string[])) => void;
};

export function useWorkspaceKeyboardShortcuts({
  artboardPanels,
  selectedPanelId,
  selectedPanelIds,
  commitArtboardPanels,
  setSelectedPanelId,
  setSelectedPanelIds,
}: UseWorkspaceKeyboardShortcutsParams) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }

      const currentIds =
        selectedPanelIds.length > 0
          ? selectedPanelIds
          : selectedPanelId
            ? [selectedPanelId]
            : [];

      if (event.key === "Delete" || event.key === "Backspace") {
        if (currentIds.length === 0) return;
        event.preventDefault();
        const selected = artboardPanels.filter((panel) => currentIds.includes(panel.id));
        const deletable = selected.filter((panel) => !panel.isLocked).map((panel) => panel.id);
        if (deletable.length === 0) return;
        const idsToRemove = collectPanelSubtreeIds(artboardPanels, deletable);
        const nextPanels = artboardPanels.filter((panel) => !idsToRemove.has(panel.id));
        commitArtboardPanels("Delete selected panels", nextPanels);
        const nextSelected = nextPanels[nextPanels.length - 1]?.id ?? null;
        setSelectedPanelId(nextSelected);
        setSelectedPanelIds(nextSelected ? [nextSelected] : []);
        return;
      }

      if ((event.ctrlKey || event.metaKey) && !event.shiftKey) {
        const editShortcut: Record<string, EditMenuActionId> = {
          z: "undo",
          y: "redo",
          x: "cut",
          c: "copy",
          v: "paste",
        };
        const action = editShortcut[event.key.toLowerCase()];
        if (action && isEditMenuActionEnabled(action)) {
          event.preventDefault();
          runEditMenuAction(action);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    artboardPanels,
    commitArtboardPanels,
    selectedPanelId,
    selectedPanelIds,
    setSelectedPanelId,
    setSelectedPanelIds,
  ]);
}
