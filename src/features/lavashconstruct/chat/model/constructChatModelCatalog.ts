/** Моделі та дефолти провайдерів — без імпорту providers/settings (уникаємо циклу модулів). */

export type ConstructModelTier = "premium" | "freemium" | "free";

export type ConstructModelOption = {
  id: string;
  label: string;
  tier?: ConstructModelTier;
};

/** @deprecated Використовуйте ConstructModelOption */
export type GeminiModelOption = ConstructModelOption;

export const MODEL_TIER_ORDER: readonly ConstructModelTier[] = ["premium", "freemium", "free"];

const m = (id: string, label: string, tier?: ConstructModelTier): ConstructModelOption => ({
  id,
  label,
  tier,
});

export const DEFAULT_OLLAMA_MODEL_UI = "llama3.2:3b";
export const DEFAULT_GROQ_MODEL = "llama-3.3-70b-versatile";
export const DEFAULT_GEMINI_MODEL = "gemini-3.1-pro-preview";

export function sortModelOptionsByTier(options: readonly ConstructModelOption[]): ConstructModelOption[] {
  const rank = (t?: ConstructModelTier) =>
    t ? MODEL_TIER_ORDER.indexOf(t) : MODEL_TIER_ORDER.length;
  return [...options].sort(
    (a, b) => rank(a.tier) - rank(b.tier) || a.label.localeCompare(b.label, undefined, { sensitivity: "base" }),
  );
}

export const ANTHROPIC_MODEL_OPTIONS: ConstructModelOption[] = [
  m("claude-opus-4-6", "Claude Opus 4.6", "premium"),
  m("claude-sonnet-4-6", "Claude Sonnet 4.6", "freemium"),
  m("claude-3-5-sonnet-latest", "Claude 3.5 Sonnet", "freemium"),
];

export const OPENAI_MODEL_OPTIONS: ConstructModelOption[] = [
  m("gpt-5.3-codex", "GPT-5.3 Codex", "premium"),
  m("gpt-4.1", "GPT-4.1", "premium"),
  m("gpt-4o", "GPT-4o", "freemium"),
  m("gpt-4o-mini", "GPT-4o mini", "freemium"),
  m("o3-mini", "o3-mini", "premium"),
];

export const GEMINI_MODEL_OPTIONS: ConstructModelOption[] = [
  m("gemini-3.1-pro-preview", "Gemini 3.1 Pro", "premium"),
  m("gemini-3.1-pro-preview-customtools", "Gemini 3.1 Pro (tools)", "premium"),
  m("gemini-3-flash-preview", "Gemini 3 Flash", "freemium"),
  m("gemini-2.5-pro", "Gemini 2.5 Pro", "premium"),
  m("gemini-2.5-flash", "Gemini 2.5 Flash", "freemium"),
  m("gemini-2.5-flash-lite", "Gemini 2.5 Flash-Lite", "free"),
  m("gemini-2.0-flash", "Gemini 2.0 Flash", "freemium"),
  m("gemini-2.0-flash-lite", "Gemini 2.0 Flash-Lite", "free"),
];

export const XAI_MODEL_OPTIONS: ConstructModelOption[] = [
  m("grok-4.20", "Grok 4.20", "premium"),
  m("grok-3", "Grok 3", "premium"),
  m("grok-3-mini", "Grok 3 Mini", "freemium"),
];

export const MOONSHOT_MODEL_OPTIONS: ConstructModelOption[] = [
  m("kimi-k2.6", "Kimi K2.6", "free"),
  m("moonshot-v1-128k", "Moonshot v1 128k", "free"),
  m("moonshot-v1-32k", "Moonshot v1 32k", "free"),
];

export const GROQ_MODEL_OPTIONS: ConstructModelOption[] = [
  m("llama-3.3-70b-versatile", "Llama 3.3 70B", "free"),
  m("llama-3.1-8b-instant", "Llama 3.1 8B Instant", "free"),
  m("mixtral-8x7b-32768", "Mixtral 8x7B", "free"),
  m("gemma2-9b-it", "Gemma2 9B IT", "free"),
];

export const OPENROUTER_MODEL_OPTIONS: ConstructModelOption[] = sortModelOptionsByTier([
  m("anthropic/claude-opus-4.6", "Claude Opus 4.6 (OR)", "premium"),
  m("openai/gpt-5.3-codex", "GPT-5.3 Codex (OR)", "premium"),
  m("google/gemini-3.1-pro-preview", "Gemini 3.1 Pro (OR)", "premium"),
  m("x-ai/grok-4.20", "Grok 4.20 (OR)", "premium"),
  m("anthropic/claude-sonnet-4.6", "Claude Sonnet 4.6 (OR)", "freemium"),
  m("openai/gpt-4o", "GPT-4o (OR)", "freemium"),
  m("moonshotai/kimi-k2.6", "Kimi K2.6 (OR)", "free"),
  m("deepseek/deepseek-r1", "DeepSeek R1 (OR)", "free"),
  m("meta-llama/llama-4", "Llama 4 (OR)", "free"),
  m("qwen/qwen-3", "Qwen 3 (OR)", "free"),
  m("mistralai/mistral-large-2", "Mistral Large 2 (OR)", "free"),
  m("openrouter/free", "OpenRouter Free (auto)", "free"),
  m("meta-llama/llama-3.3-70b-instruct:free", "Llama 3.3 70B (free)", "free"),
]);

export const MISTRAL_MODEL_OPTIONS: ConstructModelOption[] = [
  m("mistral-large-2512", "Mistral Large 2", "free"),
  m("mistral-large-latest", "Mistral Large (latest)", "free"),
  m("mistral-small-latest", "Mistral Small", "free"),
  m("codestral-latest", "Codestral", "premium"),
];

export const DEEPSEEK_MODEL_OPTIONS: ConstructModelOption[] = [
  m("deepseek-reasoner", "DeepSeek R1", "free"),
  m("deepseek-chat", "DeepSeek Chat", "free"),
];

export const TOGETHER_MODEL_OPTIONS: ConstructModelOption[] = [
  m("meta-llama/Llama-4-Maverick", "Llama 4 Maverick", "free"),
  m("Qwen/Qwen3-235B-A22B", "Qwen 3 235B", "free"),
  m("meta-llama/Llama-3.3-70B-Instruct-Turbo", "Llama 3.3 70B Turbo", "free"),
  m("deepseek-ai/DeepSeek-R1", "DeepSeek R1", "free"),
];

export const CEREBRAS_MODEL_OPTIONS: ConstructModelOption[] = [
  m("qwen-3-32b", "Qwen 3 32B", "free"),
  m("llama-3.3-70b", "Llama 3.3 70B", "free"),
  m("llama3.1-8b", "Llama 3.1 8B", "free"),
];

/** Рекомендовані теги для `ollama pull` (локально безкоштовно). */
export const OLLAMA_FREE_MODEL_TAGS: readonly { tag: string; shortName: string }[] = [
  { tag: "llama4", shortName: "Llama 4" },
  { tag: "qwen3", shortName: "Qwen 3" },
  { tag: "deepseek-r1", shortName: "DeepSeek R1" },
  { tag: "llama3.2:3b", shortName: "Llama 3.2" },
  { tag: "gemma4", shortName: "Gemma 4" },
  { tag: "mistral-large", shortName: "Mistral Large 2" },
];

/** Людська назва тега Ollama (gemma4:e4b → Gemma 4 E4B). */
export function ollamaModelDisplayLabel(tag: string): string {
  const trimmed = tag.trim();
  if (!trimmed) return trimmed;
  const lower = trimmed.toLowerCase();
  for (const source of [
    ...OLLAMA_FREE_MODEL_TAGS,
    { tag: "gemma4:e4b", shortName: "Gemma 4 E4B" },
    { tag: "llama3.1:8b", shortName: "Llama 3.1" },
    { tag: "qwen2.5:7b", shortName: "Qwen 2.5" },
    { tag: "phi3:mini", shortName: "Phi-3 mini" },
  ]) {
    const candidate = source.tag.toLowerCase();
    if (lower === candidate || lower.startsWith(`${candidate}:`)) {
      return source.shortName;
    }
  }
  return trimmed;
}

export function geminiModelSelectOptions(storedId: string): ConstructModelOption[] {
  const id = storedId.trim();
  if (!id || GEMINI_MODEL_OPTIONS.some((o) => o.id === id)) {
    return GEMINI_MODEL_OPTIONS;
  }
  return [{ id, label: `${id} (збережено)` }, ...GEMINI_MODEL_OPTIONS];
}

export function buildOllamaModelSelectOptions(
  installed: readonly string[],
  storedModel: string,
  emptyLabel: string,
): ConstructModelOption[] {
  const sorted = [...installed].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
  if (sorted.length === 0) {
    return [{ id: "", label: emptyLabel }];
  }
  const cur = storedModel.trim();
  const seen = new Set<string>();
  const out: ConstructModelOption[] = [];
  for (const n of sorted) {
    if (seen.has(n)) continue;
    seen.add(n);
    const tier = OLLAMA_FREE_MODEL_TAGS.some((t) => n.toLowerCase().includes(t.tag.replace(":", "")))
      ? "free"
      : undefined;
    out.push({ id: n, label: ollamaModelDisplayLabel(n), tier });
  }
  if (cur && seen.has(cur)) {
    const idx = out.findIndex((o) => o.id === cur);
    if (idx > 0) {
      const [picked] = out.splice(idx, 1);
      out.unshift(picked);
    }
  }
  return sortModelOptionsByTier(out);
}
