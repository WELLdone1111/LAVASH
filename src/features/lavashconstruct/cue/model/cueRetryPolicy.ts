import type { ConstructAssistantApplySummary } from "@/features/lavashconstruct/chat/model/constructAssistantApply";
import type { ConstructChatAgentMode } from "@/features/lavashconstruct/chat/model/constructChatAgentMode";
import type { ConstructChatThreadTurn } from "@/features/lavashconstruct/chat/model/constructChatThread";
import type { CueValidationResult } from "@/features/lavashconstruct/cue/model/cueTypes";

export type CueRetryDecisionInput = {
  mode: ConstructChatAgentMode;
  applyEnabled: boolean;
  validation: CueValidationResult;
  summary: ConstructAssistantApplySummary;
  /** Zero-based attempt index (0 = first model reply). */
  attemptIndex: number;
  maxRetries: number;
};

function applySucceeded(summary: ConstructAssistantApplySummary): boolean {
  return (
    summary.artboardApplied ||
    summary.constructPanelsSpawned > 0 ||
    summary.codeFencesApplied > 0 ||
    summary.cueActionsApplied > 0
  );
}

/** Whether CUE should ask the model to repair and stream again. */
export function shouldCueRetry(input: CueRetryDecisionInput): boolean {
  if (input.mode !== "agent" || !input.applyEnabled) return false;
  if (input.attemptIndex >= input.maxRetries) return false;
  if (input.validation.ok) return false;
  if (applySucceeded(input.summary)) return false;
  return input.validation.issues.length > 0;
}

export function buildCueRepairUserMessage(validation: CueValidationResult): string {
  const lines = validation.issues.map((issue) => `- ${issue.code}: ${issue.message}`);
  return [
    "[LAVASH CUE repair — fix your previous reply]",
    "Your last response could not be applied. Send a NEW complete reply that fixes every issue below.",
    "Use ```html lavash-panel Title```, ```json lavash-artboard``` with merge:true, or ```json lavash-actions``` JSON array.",
    "Close every fence with a line containing only ```. No manual IDE steps.",
    "",
    "Issues:",
    ...lines,
  ].join("\n");
}

export function extendApiThreadForCueRetry(
  prior: readonly ConstructChatThreadTurn[],
  assistantReply: string,
  validation: CueValidationResult,
): ConstructChatThreadTurn[] {
  return [
    ...prior,
    { role: "assistant", content: assistantReply.trim() || "." },
    { role: "user", content: buildCueRepairUserMessage(validation) },
  ];
}
