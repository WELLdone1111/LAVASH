import type { ConstructChatAgentMode } from "@/features/lavashconstruct/chat/model/constructChatAgentMode";

export const CUE_APPLY_COMMAND = "/apply";

export type CueSendModeResolution = {
  mode: ConstructChatAgentMode;
  userText: string;
  /** User invoked /apply — force Agent apply for this turn. */
  forcedApply: boolean;
};

/**
 * Resolve effective agent mode for a send.
 * `/apply` switches to Agent (e.g. after Plan) without changing the tab mode.
 */
export function resolveCueSendMode(
  tabMode: ConstructChatAgentMode,
  rawUserText: string,
): CueSendModeResolution {
  const trimmed = rawUserText.trim();
  const lower = trimmed.toLowerCase();
  if (lower === CUE_APPLY_COMMAND || lower.startsWith(`${CUE_APPLY_COMMAND} `)) {
    const rest = trimmed.slice(CUE_APPLY_COMMAND.length).trim();
    return {
      mode: "agent",
      userText:
        rest ||
        "Apply the planned design changes from your previous assistant message to the artboard now.",
      forcedApply: true,
    };
  }
  return { mode: tabMode, userText: rawUserText, forcedApply: false };
}
