import { parseCodeFencesFromMarkdown } from "@/features/lavashconstruct/editor/model/codeScratchStore";
import {
  isCueActionsFenceHint,
  parseCueActionsPayload,
  type CueAction,
} from "@/features/lavashconstruct/cue/model/cueActionSchema";

export function parseCueActionsFromMarkdown(markdown: string): CueAction[] {
  const actions: CueAction[] = [];
  for (const fence of parseCodeFencesFromMarkdown(markdown)) {
    if (fence.lang.toLowerCase() !== "json") continue;
    if (!isCueActionsFenceHint(fence.tabHint)) continue;
    try {
      const parsed = JSON.parse(fence.body);
      actions.push(...parseCueActionsPayload(parsed));
    } catch {
      /* invalid json handled in validation */
    }
  }
  return actions;
}

export function markdownHasCueActionsFence(markdown: string): boolean {
  return parseCodeFencesFromMarkdown(markdown).some(
    (fence) => fence.lang.toLowerCase() === "json" && isCueActionsFenceHint(fence.tabHint),
  );
}
