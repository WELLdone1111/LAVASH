import {
  applyConstructAssistantMarkdown,
  type ConstructAssistantApplyOptions,
  type ConstructAssistantApplySummary,
} from "@/features/lavashconstruct/chat/model/constructAssistantApply";
import type { ConstructChatAgentMode } from "@/features/lavashconstruct/chat/model/constructChatAgentMode";
import { applyCueActions } from "@/features/lavashconstruct/cue/model/cueActionApply";
import {
  formatCueValidationNote,
  validateCueAssistantOutput,
} from "@/features/lavashconstruct/cue/model/cueActionValidate";
import { parseCueActionsFromMarkdown } from "@/features/lavashconstruct/cue/model/cueActionParse";
import type { CueApplyResult } from "@/features/lavashconstruct/cue/model/cueTypes";

export type CueApplyPipelineOptions = ConstructAssistantApplyOptions & {
  mode?: ConstructChatAgentMode;
  artboardPanelIds?: readonly string[];
  validate?: boolean;
};

function appliedFromSummary(summary: ConstructAssistantApplySummary): boolean {
  return (
    summary.artboardApplied ||
    summary.constructPanelsSpawned > 0 ||
    summary.codeFencesApplied > 0 ||
    summary.cueActionsApplied > 0
  );
}

function mergeSummaries(
  actionPart: Pick<
    ConstructAssistantApplySummary,
    "artboardApplied" | "constructPanelsSpawned" | "cueActionsApplied"
  >,
  fencePart: ConstructAssistantApplySummary,
): ConstructAssistantApplySummary {
  return {
    codeFencesApplied: fencePart.codeFencesApplied,
    artboardApplied: actionPart.artboardApplied || fencePart.artboardApplied,
    constructPanelsSpawned: actionPart.constructPanelsSpawned + fencePart.constructPanelsSpawned,
    cueActionsApplied: actionPart.cueActionsApplied,
  };
}

/** CUE apply path: validate → structured actions → fences → validation report. */
export function runCueApplyPipeline(markdown: string, options?: CueApplyPipelineOptions): CueApplyResult {
  const mode = options?.mode ?? "agent";
  const panelIds = options?.artboardPanelIds ?? [];
  const shouldValidate = options?.validate !== false && options?.applyEnabled !== false;

  const validation = shouldValidate
    ? validateCueAssistantOutput(markdown, mode, panelIds)
    : { ok: true, issues: [] };

  const parsedActions = parseCueActionsFromMarkdown(markdown);
  const actionPart =
    parsedActions.length > 0
      ? applyCueActions(parsedActions, {
          linkedScratchTabId: options?.linkConstructPanelToScratchTabId,
        })
      : { artboardApplied: false, constructPanelsSpawned: 0, cueActionsApplied: 0 };

  const fencePart = applyConstructAssistantMarkdown(markdown, {
    ...options,
    skipPanelAndArtboardFences: parsedActions.length > 0,
  });

  const summary = mergeSummaries(actionPart, fencePart);
  const applied = appliedFromSummary(summary);

  return { summary, validation, applied };
}

export { formatCueValidationNote };
