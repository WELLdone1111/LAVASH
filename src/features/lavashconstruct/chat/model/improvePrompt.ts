import { isTauri } from "@tauri-apps/api/core";
import {
  getConstructProviderDef,
  type ConstructChatProvider,
} from "@/features/lavashconstruct/chat/model/constructChatProviders";
import { readConstructChatApiKey } from "@/features/lavashconstruct/chat/model/constructChatSettings";
import { runConstructChatStream } from "@/features/lavashconstruct/chat/model/constructChatStreamClient";
import { tauriIpcReady } from "@/features/lavashconstruct/chat/ui/constructChatPanelTypes";

export type ImprovePromptOptions = {
  provider: ConstructChatProvider;
  model: string;
};

const META_REPLY_RE =
  /\b(уточни|уточніть|будь ласка,? уточни|please clarify|please specify|what (?:capabilities|steps)|what would you like|which of the following|обери один|варіант(?:и)?\s*:|наприклад,?\s*чи)\b/i;

function buildImprovePromptRequest(trimmed: string): string {
  return [
    "You are a prompt rewriter for LAVASH Construct chat (UI design IDE with artboard + code).",
    "Rewrite the DRAFT below so it is clearer and more actionable for the IDE assistant.",
    "",
    "STRICT RULES:",
    "- Output ONLY the rewritten draft — nothing else.",
    "- Keep the same language as the DRAFT.",
    "- Do NOT answer the draft as a question.",
    "- Do NOT ask clarifying questions, list options, or suggest what the user should choose.",
    "- Do NOT mention artboard capabilities unless the draft already does.",
    "- No quotes, labels, markdown headings, or numbered menus.",
    "",
    "DRAFT:",
    trimmed,
  ].join("\n");
}

function stripImproveOutput(text: string): string {
  let trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:\w+)?\s*([\s\S]*?)```$/);
  if (fenced?.[1]) trimmed = fenced[1].trim();
  trimmed = trimmed.replace(/^["']|["']$/g, "").trim();
  trimmed = trimmed.replace(/^(?:rewritten draft|покращений промпт|draft|output)\s*:\s*/i, "").trim();
  return trimmed;
}

function looksLikeAssistantMetaReply(original: string, output: string): boolean {
  if (!output.trim()) return true;
  const lower = output.toLowerCase();
  if (META_REPLY_RE.test(output)) return true;
  const numberedOptions = (output.match(/^\s*\d+[.)]\s+/gm) ?? []).length;
  if (numberedOptions >= 2) return true;
  if (
    output.length > original.length * 2.2 &&
    (lower.includes("наприклад") || lower.includes("for example")) &&
    output.includes("?")
  ) {
    return true;
  }
  return false;
}

/** Покращує чернетку через ту саму модель/провайдер, що обрані в чаті. */
export async function improvePrompt(userInput: string, options: ImprovePromptOptions): Promise<string> {
  const trimmed = userInput.trim();
  if (!trimmed) return userInput;

  if (!isTauri() || !tauriIpcReady()) {
    return userInput;
  }

  const def = getConstructProviderDef(options.provider);
  const model = options.model.trim() || def.defaultModel;
  const apiKey = readConstructChatApiKey(options.provider).trim();
  if (def.needsApiKey && !apiKey) {
    throw new Error(`${def.label} API key is required to improve the prompt.`);
  }

  const abort = new AbortController();
  const timeoutId = window.setTimeout(() => abort.abort(), 45_000);

  try {
    const full = await runConstructChatStream({
      streamId: `improve-${crypto.randomUUID().slice(0, 12)}`,
      provider: options.provider,
      apiKey,
      model,
      modelOverride: def.kind === "local" ? model : null,
      baseUrl: def.baseUrl,
      httpReferer: options.provider === "openrouter" ? "https://github.com/WELLdone1111/LAVASH" : null,
      messages: [{ role: "user", content: buildImprovePromptRequest(trimmed) }],
      replyInEnglish: false,
      preferUkrainian: false,
      userSignedIn: true,
      signal: abort.signal,
    });

    const improved = stripImproveOutput(full);
    if (!improved) {
      throw new Error("Model returned an empty prompt.");
    }
    if (looksLikeAssistantMetaReply(trimmed, improved)) {
      throw new Error("Model replied instead of rewriting the draft.");
    }
    return improved;
  } finally {
    window.clearTimeout(timeoutId);
  }
}
