import { useEffect } from "react";
import {
  canCutSelection,
  copyPanelsFromSelection,
  deleteSelectedPanels,
  pastePanelsOntoArtboard,
  resolveCurrentPanelIds,
} from "@/features/edit-menu/model/editMenuPanelActions";
import { registerEditMenuHandlers } from "@/features/edit-menu/model/editMenuBus";
import { useConstructStore } from "@/features/lavashconstruct/artboard/model/store";
import type { ArtboardPanel } from "@/features/lavashconstruct/artboard/ui/types";

export type EditMenuContext = {
  artboardPanels: ArtboardPanel[];
  selectedPanelId: string | null;
  selectedPanelIds: string[];
  copiedPanels: ArtboardPanel[];
  setCopiedPanels: (panels: ArtboardPanel[]) => void;
  setSelectedPanelId: (id: string | null) => void;
  setSelectedPanelIds: (ids: string[]) => void;
  commitArtboardPanels: (
    action: string,
    nextPanels: ArtboardPanel[],
    options?: { mergeKey?: string; mergeWindowMs?: number },
  ) => void;
};

export function useRegisterEditMenuHandlers(ctx: EditMenuContext) {
  const undo = useConstructStore((state) => state.undo);
  const redo = useConstructStore((state) => state.redo);
  const pastLength = useConstructStore((state) => state.past.length);
  const futureLength = useConstructStore((state) => state.future.length);

  useEffect(() => {
    const currentIds = () =>
      resolveCurrentPanelIds(ctx.selectedPanelIds, ctx.selectedPanelId);

    return registerEditMenuHandlers(
      {
        undo: () => undo(),
        redo: () => redo(),
        copy: () => {
          const ids = currentIds();
          const selected = copyPanelsFromSelection(ctx.artboardPanels, ids);
          if (selected.length > 0) ctx.setCopiedPanels(selected);
        },
        cut: () => {
          const ids = currentIds();
          const selected = copyPanelsFromSelection(ctx.artboardPanels, ids);
          if (selected.length === 0) return;
          ctx.setCopiedPanels(selected);
          const result = deleteSelectedPanels(ctx.artboardPanels, ids);
          if (!result) return;
          ctx.commitArtboardPanels("Cut panels", result.nextPanels);
          ctx.setSelectedPanelId(result.nextSelectedId);
          ctx.setSelectedPanelIds(result.nextSelectedId ? [result.nextSelectedId] : []);
        },
        paste: () => {
          const result = pastePanelsOntoArtboard(ctx.copiedPanels, ctx.artboardPanels);
          if (!result) return;
          ctx.commitArtboardPanels("Paste panels", result.nextPanels);
          ctx.setSelectedPanelIds(result.nextIds);
          ctx.setSelectedPanelId(result.nextIds[result.nextIds.length - 1] ?? null);
        },
      },
      {
        undo: () => pastLength > 0,
        redo: () => futureLength > 0,
        copy: () => currentIds().length > 0,
        cut: () => canCutSelection(ctx.artboardPanels, currentIds()),
        paste: () => ctx.copiedPanels.length > 0,
      },
    );
  }, [ctx, undo, redo, pastLength, futureLength]);
}
