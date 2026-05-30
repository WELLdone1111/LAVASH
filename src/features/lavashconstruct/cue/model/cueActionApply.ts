import type { ConstructAssistantApplySummary } from "@/features/lavashconstruct/chat/model/constructAssistantApply";
import {
  applyArtboardPayload,
  buildScratchCodeLibraryItem,
  pasteConstructLibraryItems,
} from "@/features/lavashconstruct/chat/model/assistantConstructSync";
import type { CueAction } from "@/features/lavashconstruct/cue/model/cueActionSchema";

export type CueActionApplyOptions = {
  linkedScratchTabId?: string | null;
};

export type CueActionApplyResult = Pick<
  ConstructAssistantApplySummary,
  "artboardApplied" | "constructPanelsSpawned" | "cueActionsApplied"
>;

/** Applies structured CUE actions (spawn_panel, patch_artboard). */
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
      const payload = {
        merge: action.merge,
        artboardPanels: action.artboardPanels,
      };
      if (applyArtboardPayload(payload)) {
        artboardApplied = true;
        cueActionsApplied += 1;
      }
    }
  }

  return { artboardApplied, constructPanelsSpawned, cueActionsApplied };
}
