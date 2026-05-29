import { isTauri } from "@tauri-apps/api/core";
import {
  getSecretCached,
  isSecretsVaultReady,
  secretsKeyConstructApi,
  setSecretCached,
} from "@/features/secrets/model/secretsVault";
import {
  getConstructProviderDef,
  isConstructChatProvider,
  CONSTRUCT_CHAT_PROVIDERS,
  type ConstructChatProvider,
} from "@/features/lavashconstruct/chat/model/constructChatProviders";

export type { ConstructChatProvider };
export type { ConstructModelOption, GeminiModelOption } from "@/features/lavashconstruct/chat/model/constructChatModelCatalog";
export {
  DEFAULT_OLLAMA_MODEL_UI,
  DEFAULT_GROQ_MODEL,
  DEFAULT_GEMINI_MODEL,
  GROQ_MODEL_OPTIONS,
  GEMINI_MODEL_OPTIONS,
  geminiModelSelectOptions,
  buildOllamaModelSelectOptions,
} from "@/features/lavashconstruct/chat/model/constructChatModelCatalog";

import {
  DEFAULT_OLLAMA_MODEL_UI,
  DEFAULT_GROQ_MODEL,
  DEFAULT_GEMINI_MODEL,
} from "@/features/lavashconstruct/chat/model/constructChatModelCatalog";

export const CONSTRUCT_CHAT_PROVIDER_KEY = "lavash.construct.chatProvider.v1";
export const CONSTRUCT_CHAT_MODEL_OLLAMA_KEY = "lavash.construct.chatModel.ollama.v1";
export const CONSTRUCT_CHAT_MODEL_GROQ_KEY = "lavash.construct.chatModel.groq.v1";
export const CONSTRUCT_CHAT_MODEL_GEMINI_KEY = "lavash.construct.chatModel.gemini.v1";
export const CONSTRUCT_CHAT_GROQ_API_KEY = "lavash.construct.groqApiKey.v1";
export const CONSTRUCT_CHAT_GEMINI_API_KEY = "lavash.construct.geminiApiKey.v1";
/** вкладки лаваш-чату: msgs + модель на таб */
export const CONSTRUCT_CHAT_TABS_STORAGE_KEY = "lavash.construct.chat.tabs.v1";

function safeRead(key: string): string {
  if (typeof localStorage === "undefined") return "";
  try {
    return localStorage.getItem(key) ?? "";
  } catch {
    return "";
  }
}

function safeWrite(key: string, value: string) {
  if (typeof localStorage === "undefined") return;
  try {
    if (value.trim()) localStorage.setItem(key, value);
    else localStorage.removeItem(key);
  } catch {
    /* пофіг */
  }
}

export function readConstructChatProvider(): ConstructChatProvider {
  const raw = safeRead(CONSTRUCT_CHAT_PROVIDER_KEY).trim().toLowerCase();
  return isConstructChatProvider(raw) ? raw : "ollama";
}

export function readConstructChatApiKey(provider: ConstructChatProvider): string {
  if (isTauri() && isSecretsVaultReady()) {
    return getSecretCached(secretsKeyConstructApi(provider));
  }
  return safeRead(getConstructProviderDef(provider).apiKeyStorageKey);
}

export function writeConstructChatApiKey(provider: ConstructChatProvider, value: string) {
  if (isTauri() && isSecretsVaultReady()) {
    setSecretCached(secretsKeyConstructApi(provider), value);
    return;
  }
  safeWrite(getConstructProviderDef(provider).apiKeyStorageKey, value);
}

export function readConstructChatModel(provider: ConstructChatProvider): string {
  const def = getConstructProviderDef(provider);
  const stored = safeRead(def.modelStorageKey).trim();
  return stored || def.defaultModel;
}

export function writeConstructChatModel(provider: ConstructChatProvider, value: string) {
  safeWrite(getConstructProviderDef(provider).modelStorageKey, value);
}

export function readDefaultConstructChatModels(): Partial<Record<ConstructChatProvider, string>> {
  const out: Partial<Record<ConstructChatProvider, string>> = {};
  for (const p of CONSTRUCT_CHAT_PROVIDERS) {
    out[p.id] = readConstructChatModel(p.id);
  }
  return out;
}

export function readConstructChatSettings(): {
  provider: ConstructChatProvider;
  ollamaModel: string;
  groqModel: string;
  geminiModel: string;
  groqApiKey: string;
  geminiApiKey: string;
  models: Partial<Record<ConstructChatProvider, string>>;
  apiKeys: Partial<Record<ConstructChatProvider, string>>;
} {
  const models = readDefaultConstructChatModels();
  const apiKeys: Partial<Record<ConstructChatProvider, string>> = {};
  for (const p of CONSTRUCT_CHAT_PROVIDERS) {
    if (p.needsApiKey) apiKeys[p.id] = readConstructChatApiKey(p.id);
  }
  return {
    provider: readConstructChatProvider(),
    ollamaModel: models.ollama ?? DEFAULT_OLLAMA_MODEL_UI,
    groqModel: models.groq ?? DEFAULT_GROQ_MODEL,
    geminiModel: models.gemini ?? DEFAULT_GEMINI_MODEL,
    groqApiKey: apiKeys.groq ?? "",
    geminiApiKey: apiKeys.gemini ?? "",
    models,
    apiKeys,
  };
}

export function writeConstructChatProvider(p: ConstructChatProvider) {
  safeWrite(CONSTRUCT_CHAT_PROVIDER_KEY, p);
}

/** @deprecated використовуйте writeConstructChatModel */
export function writeConstructChatModels(patch: Partial<{ ollama: string; groq: string; gemini: string }>) {
  if (patch.ollama !== undefined) writeConstructChatModel("ollama", patch.ollama);
  if (patch.groq !== undefined) writeConstructChatModel("groq", patch.groq);
  if (patch.gemini !== undefined) writeConstructChatModel("gemini", patch.gemini);
}

/** @deprecated використовуйте writeConstructChatApiKey */
export function writeConstructChatApiKeys(patch: Partial<{ groq: string; gemini: string }>) {
  if (patch.groq !== undefined) writeConstructChatApiKey("groq", patch.groq);
  if (patch.gemini !== undefined) writeConstructChatApiKey("gemini", patch.gemini);
}

export function mergeTabModelsFromStorage(
  partial?: Partial<Record<ConstructChatProvider, string>>,
  legacy?: { ollamaModel?: unknown; groqModel?: unknown; geminiModel?: unknown },
): Partial<Record<ConstructChatProvider, string>> {
  const out: Partial<Record<ConstructChatProvider, string>> = { ...readDefaultConstructChatModels(), ...partial };
  if (typeof legacy?.ollamaModel === "string" && legacy.ollamaModel.trim()) {
    out.ollama = legacy.ollamaModel.trim();
  }
  if (typeof legacy?.groqModel === "string" && legacy.groqModel.trim()) {
    out.groq = legacy.groqModel.trim();
  }
  if (typeof legacy?.geminiModel === "string" && legacy.geminiModel.trim()) {
    out.gemini = legacy.geminiModel.trim();
  }
  return out;
}

export function getTabModel(
  tab: { models?: Partial<Record<ConstructChatProvider, string>> },
  provider: ConstructChatProvider,
): string {
  const v = tab.models?.[provider]?.trim();
  if (v) return v;
  return readConstructChatModel(provider);
}

/** Модель, явно обрана на вкладці (без fallback на global default). */
export function getTabModelExplicit(
  tab: { models?: Partial<Record<ConstructChatProvider, string>> },
  provider: ConstructChatProvider,
): string | null {
  const v = tab.models?.[provider]?.trim();
  return v || null;
}
