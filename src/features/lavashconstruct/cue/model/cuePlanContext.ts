import type { ConstructChatAgentMode } from "@/features/lavashconstruct/chat/model/constructChatAgentMode";

/** Extra CUE instruction when `/apply` forces Agent after Plan. */
export function buildCuePlanApplyInstruction(forcedApply: boolean, tabMode: ConstructChatAgentMode): string {
  if (!forcedApply || tabMode !== "plan") return "";
  return [
    "[LAVASH CUE — apply plan]",
    "The user confirmed the plan. Execute it now with lavash-actions or lavash-panel fences.",
    "Do not replan — apply the design to the artboard in this reply.",
  ].join("\n");
}
