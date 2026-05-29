import {
  ANTHROPIC_MODEL_OPTIONS,
  CEREBRAS_MODEL_OPTIONS,
  DEEPSEEK_MODEL_OPTIONS,
  DEFAULT_GEMINI_MODEL,
  DEFAULT_GROQ_MODEL,
  DEFAULT_OLLAMA_MODEL_UI,
  GEMINI_MODEL_OPTIONS,
  GROQ_MODEL_OPTIONS,
  MISTRAL_MODEL_OPTIONS,
  MOONSHOT_MODEL_OPTIONS,
  OPENAI_MODEL_OPTIONS,
  OPENROUTER_MODEL_OPTIONS,
  TOGETHER_MODEL_OPTIONS,
  XAI_MODEL_OPTIONS,
  sortModelOptionsByTier,
  type ConstructModelOption,
} from "@/features/lavashconstruct/chat/model/constructChatModelCatalog";

export type ConstructChatProvider =
  | "ollama"
  | "groq"
  | "gemini"
  | "anthropic"
  | "openai"
  | "xai"
  | "moonshot"
  | "openrouter"
  | "mistral"
  | "deepseek"
  | "together"
  | "cerebras";

export type ConstructProviderKind = "local" | "gemini" | "openai";

export type ConstructProviderDef = {
  id: ConstructChatProvider;
  label: string;
  kind: ConstructProviderKind;
  needsApiKey: boolean;
  freeTier?: boolean;
  noApiKey?: boolean;
  keyPlaceholder?: string;
  signupUrl?: string;
  settingsAriaKey: string;
  apiKeyStorageKey: string;
  modelStorageKey: string;
  defaultModel: string;
  modelOptions?: readonly ConstructModelOption[];
  baseUrl?: string;
};

/** Порядок: без ключа → безкоштовний tier → преміум/API. */
export const CONSTRUCT_CHAT_PROVIDERS: readonly ConstructProviderDef[] = [
  {
    id: "ollama",
    label: "Ollama",
    kind: "local",
    needsApiKey: false,
    noApiKey: true,
    settingsAriaKey: "construct.chat.provider.ollamaSettings",
    apiKeyStorageKey: "lavash.construct.apiKey.ollama.v1",
    modelStorageKey: "lavash.construct.chatModel.ollama.v1",
    defaultModel: DEFAULT_OLLAMA_MODEL_UI,
  },
  {
    id: "groq",
    label: "Groq",
    kind: "openai",
    needsApiKey: true,
    freeTier: true,
    keyPlaceholder: "gsk_…",
    signupUrl: "https://console.groq.com/keys",
    settingsAriaKey: "construct.chat.provider.groqSettings",
    apiKeyStorageKey: "lavash.construct.groqApiKey.v1",
    modelStorageKey: "lavash.construct.chatModel.groq.v1",
    defaultModel: DEFAULT_GROQ_MODEL,
    modelOptions: GROQ_MODEL_OPTIONS,
    baseUrl: "https://api.groq.com/openai/v1",
  },
  {
    id: "gemini",
    label: "Gemini",
    kind: "gemini",
    needsApiKey: true,
    freeTier: true,
    keyPlaceholder: "AIza…",
    signupUrl: "https://aistudio.google.com/apikey",
    settingsAriaKey: "construct.chat.provider.geminiSettings",
    apiKeyStorageKey: "lavash.construct.geminiApiKey.v1",
    modelStorageKey: "lavash.construct.chatModel.gemini.v1",
    defaultModel: DEFAULT_GEMINI_MODEL,
    modelOptions: GEMINI_MODEL_OPTIONS,
  },
  {
    id: "anthropic",
    label: "Anthropic",
    kind: "openai",
    needsApiKey: true,
    keyPlaceholder: "sk-ant-…",
    signupUrl: "https://console.anthropic.com/settings/keys",
    settingsAriaKey: "construct.chat.provider.anthropicSettings",
    apiKeyStorageKey: "lavash.construct.apiKey.anthropic.v1",
    modelStorageKey: "lavash.construct.chatModel.anthropic.v1",
    defaultModel: "claude-sonnet-4-6",
    modelOptions: ANTHROPIC_MODEL_OPTIONS,
    baseUrl: "https://api.anthropic.com/v1",
  },
  {
    id: "openai",
    label: "OpenAI",
    kind: "openai",
    needsApiKey: true,
    keyPlaceholder: "sk-…",
    signupUrl: "https://platform.openai.com/api-keys",
    settingsAriaKey: "construct.chat.provider.openaiSettings",
    apiKeyStorageKey: "lavash.construct.apiKey.openai.v1",
    modelStorageKey: "lavash.construct.chatModel.openai.v1",
    defaultModel: "gpt-4o",
    modelOptions: OPENAI_MODEL_OPTIONS,
    baseUrl: "https://api.openai.com/v1",
  },
  {
    id: "xai",
    label: "xAI",
    kind: "openai",
    needsApiKey: true,
    keyPlaceholder: "xai-…",
    signupUrl: "https://console.x.ai/",
    settingsAriaKey: "construct.chat.provider.xaiSettings",
    apiKeyStorageKey: "lavash.construct.apiKey.xai.v1",
    modelStorageKey: "lavash.construct.chatModel.xai.v1",
    defaultModel: "grok-3-mini",
    modelOptions: XAI_MODEL_OPTIONS,
    baseUrl: "https://api.x.ai/v1",
  },
  {
    id: "moonshot",
    label: "Moonshot",
    kind: "openai",
    needsApiKey: true,
    freeTier: true,
    keyPlaceholder: "sk-…",
    signupUrl: "https://platform.moonshot.ai/console/api-keys",
    settingsAriaKey: "construct.chat.provider.moonshotSettings",
    apiKeyStorageKey: "lavash.construct.apiKey.moonshot.v1",
    modelStorageKey: "lavash.construct.chatModel.moonshot.v1",
    defaultModel: "kimi-k2.6",
    modelOptions: MOONSHOT_MODEL_OPTIONS,
    baseUrl: "https://api.moonshot.ai/v1",
  },
  {
    id: "cerebras",
    label: "Cerebras",
    kind: "openai",
    needsApiKey: true,
    freeTier: true,
    keyPlaceholder: "csk-…",
    signupUrl: "https://cloud.cerebras.ai/",
    settingsAriaKey: "construct.chat.provider.cerebrasSettings",
    apiKeyStorageKey: "lavash.construct.apiKey.cerebras.v1",
    modelStorageKey: "lavash.construct.chatModel.cerebras.v1",
    defaultModel: "qwen-3-32b",
    modelOptions: CEREBRAS_MODEL_OPTIONS,
    baseUrl: "https://api.cerebras.ai/v1",
  },
  {
    id: "openrouter",
    label: "OpenRouter",
    kind: "openai",
    needsApiKey: true,
    freeTier: true,
    keyPlaceholder: "sk-or-…",
    signupUrl: "https://openrouter.ai/keys",
    settingsAriaKey: "construct.chat.provider.openrouterSettings",
    apiKeyStorageKey: "lavash.construct.apiKey.openrouter.v1",
    modelStorageKey: "lavash.construct.chatModel.openrouter.v1",
    defaultModel: "openrouter/free",
    modelOptions: OPENROUTER_MODEL_OPTIONS,
    baseUrl: "https://openrouter.ai/api/v1",
  },
  {
    id: "mistral",
    label: "Mistral",
    kind: "openai",
    needsApiKey: true,
    freeTier: true,
    keyPlaceholder: "…",
    signupUrl: "https://console.mistral.ai/api-keys/",
    settingsAriaKey: "construct.chat.provider.mistralSettings",
    apiKeyStorageKey: "lavash.construct.apiKey.mistral.v1",
    modelStorageKey: "lavash.construct.chatModel.mistral.v1",
    defaultModel: "mistral-large-2512",
    modelOptions: MISTRAL_MODEL_OPTIONS,
    baseUrl: "https://api.mistral.ai/v1",
  },
  {
    id: "deepseek",
    label: "DeepSeek",
    kind: "openai",
    needsApiKey: true,
    freeTier: true,
    keyPlaceholder: "sk-…",
    signupUrl: "https://platform.deepseek.com/api_keys",
    settingsAriaKey: "construct.chat.provider.deepseekSettings",
    apiKeyStorageKey: "lavash.construct.apiKey.deepseek.v1",
    modelStorageKey: "lavash.construct.chatModel.deepseek.v1",
    defaultModel: "deepseek-reasoner",
    modelOptions: DEEPSEEK_MODEL_OPTIONS,
    baseUrl: "https://api.deepseek.com/v1",
  },
  {
    id: "together",
    label: "Together",
    kind: "openai",
    needsApiKey: true,
    keyPlaceholder: "…",
    signupUrl: "https://api.together.ai/settings/api-keys",
    settingsAriaKey: "construct.chat.provider.togetherSettings",
    apiKeyStorageKey: "lavash.construct.apiKey.together.v1",
    modelStorageKey: "lavash.construct.chatModel.together.v1",
    defaultModel: "meta-llama/Llama-4-Maverick",
    modelOptions: TOGETHER_MODEL_OPTIONS,
    baseUrl: "https://api.together.xyz/v1",
  },
] as const;

const PROVIDER_BY_ID = new Map(CONSTRUCT_CHAT_PROVIDERS.map((p) => [p.id, p]));

export function getConstructProviderDef(id: ConstructChatProvider): ConstructProviderDef {
  return PROVIDER_BY_ID.get(id) ?? PROVIDER_BY_ID.get("ollama")!;
}

/** Провайдери з безкоштовним tier і посиланням на реєстрацію ключа. */
export function listFreeTierProvidersWithSignup(): ConstructProviderDef[] {
  return CONSTRUCT_CHAT_PROVIDERS.filter((p) => p.freeTier && p.signupUrl);
}

export function isConstructChatProvider(raw: unknown): raw is ConstructChatProvider {
  return typeof raw === "string" && PROVIDER_BY_ID.has(raw as ConstructChatProvider);
}

export function providerShortLabel(id: ConstructChatProvider): string {
  return getConstructProviderDef(id).label;
}

export function modelOptionsForProvider(
  provider: ConstructChatProvider,
  storedModel: string,
  geminiOptions: ConstructModelOption[],
  ollamaOptions: ConstructModelOption[],
): ConstructModelOption[] {
  const def = getConstructProviderDef(provider);
  if (provider === "ollama") return ollamaOptions;
  if (provider === "gemini") return geminiOptions;
  const base = def.modelOptions ?? [{ id: storedModel || def.defaultModel, label: storedModel || def.defaultModel }];
  const id = storedModel.trim();
  let merged = base;
  if (id && !base.some((o) => o.id === id)) {
    merged = [{ id, label: `${id} (збережено)` }, ...base];
  }
  return sortModelOptionsByTier(merged);
}
