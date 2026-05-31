import type { ConstructAssistantApplySummary } from "@/features/lavashconstruct/chat/model/constructAssistantApply";
import {
  buildScratchCodeLibraryItem,
  pasteConstructLibraryItems,
} from "@/features/lavashconstruct/chat/model/assistantConstructSync";
import type { CueAction } from "@/features/lavashconstruct/cue/model/cueActionSchema";
import {
  applyCueClearArtboard,
  applyCuePatchArtboard,
  applyCueRemovePanels,
  applyCueReplaceArtboard,
  applyCueReorderPanels,
  applyCueSelectPanel,
} from "@/features/lavashconstruct/cue/model/artboardCueApply";

export type CueActionApplyOptions = {
  linkedScratchTabId?: string | null;
};

export type CueActionApplyResult = Pick<
  ConstructAssistantApplySummary,
  "artboardApplied" | "constructPanelsSpawned" | "cueActionsApplied"
>;

/** Applies structured CUE actions on the artboard and construct panels. */
export function applyCueActions(
  actions: readonly CueAction[],
  options?: CueActionApplyOptions,
): CueActionApplyResult {
  const scratchLink = options?.linkedScratchTabId?.trim() || undefined;
  let artboardApplied = false;
  let constructPanelsSpawned = 0;
  let cueActionsApplied = 0;

  for (const action of actions) {
    if (action.type === "spawn_panel") {
      const item = buildScratchCodeLibraryItem({
        panelTitle: action.title,
        code: action.html,
        langExt: action.lang || "html",
        scratchTabId: scratchLink,
      });
      if (!item) continue;
      constructPanelsSpawned += pasteConstructLibraryItems([item]);
      cueActionsApplied += 1;
      continue;
    }

    if (action.type === "patch_artboard") {
      if (applyCuePatchArtboard(action.artboardPanels, action.merge)) {
        artboardApplied = true;
        cueActionsApplied += 1;
      }
      continue;
    }

    if (action.type === "replace_artboard") {
      if (applyCueReplaceArtboard(action.artboardPanels)) {
        artboardApplied = true;
        cueActionsApplied += 1;
      }
      continue;
    }

    if (action.type === "remove_panels") {
      if (applyCueRemovePanels(action.panelIds)) {
        artboardApplied = true;
        cueActionsApplied += 1;
      }
      continue;
    }

    if (action.type === "clear_artboard") {
      if (applyCueClearArtboard()) {
        artboardApplied = true;
        cueActionsApplied += 1;
      }
      continue;
    }

    if (action.type === "reorder_panels") {
      if (applyCueReorderPanels(action.orderedIds, action.parentId)) {
        artboardApplied = true;
        cueActionsApplied += 1;
      }
      continue;
    }

    if (action.type === "select_panel") {
      if (applyCueSelectPanel(action.panelId)) {
        artboardApplied = true;
        cueActionsApplied += 1;
      }
    }
  }

  return { artboardApplied, constructPanelsSpawned, cueActionsApplied };
}
