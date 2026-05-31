export type ConstructChatAgentMode = "agent" | "plan" | "ask" | "debug";

export const CONSTRUCT_CHAT_AGENT_MODES: ConstructChatAgentMode[] = ["agent", "plan", "ask", "debug"];

export const CONSTRUCT_CHAT_AGENT_MODE_I18N: Record<ConstructChatAgentMode, string> = {
  agent: "construct.chat.agentMode.agent",
  plan: "construct.chat.agentMode.plan",
  ask: "construct.chat.agentMode.ask",
  debug: "construct.chat.agentMode.debug",
};

export function isConstructChatAgentMode(value: unknown): value is ConstructChatAgentMode {
  return value === "agent" || value === "plan" || value === "ask" || value === "debug";
}

/** Чи застосовувати fenced apply (artboard / code) під час стріму. */
export function shouldApplyAssistantOutput(mode: ConstructChatAgentMode): boolean {
  return mode === "agent";
}

/** Системна інструкція для поточного режиму (додається до construct snapshot). */
export function buildAgentModeSystemInstruction(mode: ConstructChatAgentMode): string {
  switch (mode) {
    case "ask":
      return [
        "[LAVASH mode: Ask]",
        "Analyze the artboard, attached screenshots, and user question.",
        "Give design advice and critique only.",
        "Do NOT output ```json lavash-artboard fences, ``` lavash-panel fences, or code fences that modify the workspace.",
      ].join("\n");
    case "plan":
      return [
        "[LAVASH mode: Plan]",
        "Propose a clear step-by-step plan for the requested design change.",
        "Do NOT apply changes yet — no lavash-artboard, lavash-panel, or code scratch fences.",
        "End with numbered steps the user can confirm before Agent mode applies them.",
      ].join("\n");
    case "debug":
      return [
        "[LAVASH mode: Debug]",
        "Diagnose artboard/code sync, panel linkage, and context issues using the debug snapshot.",
        "Explain root cause and suggested fixes in prose.",
        "Do NOT auto-apply lavash-artboard or code fences unless the user explicitly asks to fix in Agent mode.",
      ].join("\n");
    case "agent":
    default:
      return [
        "[LAVASH mode: Agent]",
        "You have full programmatic control over the artboard via ```json lavash-actions``` or markdown fences.",
        "Use lavash-actions for spawn, patch, replace, remove, clear, reorder, and select.",
        "Use ```html lavash-panel Title``` for new UI. Use ```json lavash-artboard``` with merge:true for partial patches by id.",
        "Do NOT give manual IDE steps — LAVASH applies automatically during streaming.",
      ].join("\n");
  }
}

/** Префікс для slash-команди генерації asset через Gemini Image. */
export const CONSTRUCT_IMAGE_GEN_PREFIX = "/image ";

export function parseConstructImageGenPrompt(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed.toLowerCase().startsWith(CONSTRUCT_IMAGE_GEN_PREFIX.trim())) return null;
  const prompt = trimmed.slice(CONSTRUCT_IMAGE_GEN_PREFIX.trim().length).trim();
  return prompt.length > 0 ? prompt : null;
}
