import type { ConstructModelTier } from "@/features/lavashconstruct/chat/model/constructChatModelCatalog";
import {
  DEFAULT_OLLAMA_MODEL_UI,
  OLLAMA_FREE_MODEL_TAGS,
  buildOllamaModelSelectOptions,
  geminiModelSelectOptions,
} from "@/features/lavashconstruct/chat/model/constructChatModelCatalog";
import {
  CONSTRUCT_CHAT_PROVIDERS,
  isConstructChatProvider,
  modelOptionsForProvider,
  type ConstructChatProvider,
} from "@/features/lavashconstruct/chat/model/constructChatProviders";
import { readCustomChatModels } from "@/features/lavashconstruct/chat/model/constructCustomChatModels";

export type ConstructChatPickerModelRef = {
  provider: ConstructChatProvider;
  modelId: string;
};

const KEY_SEP = "\u001f";

export function chatPickerModelKey(ref: ConstructChatPickerModelRef): string {
  return `${ref.provider}${KEY_SEP}${ref.modelId}`;
}

export function parseChatPickerModelKey(key: string): ConstructChatPickerModelRef | null {
  const idx = key.indexOf(KEY_SEP);
  if (idx <= 0) return null;
  const provider = key.slice(0, idx);
  const modelId = key.slice(idx + 1);
  if (!isConstructChatProvider(provider) || !modelId.trim()) return null;
  return { provider, modelId: modelId.trim() };
}

export const CONSTRUCT_CHAT_PICKER_MODELS_KEY = "lavash.construct.chatPickerModels.v1";
export const CONSTRUCT_CHAT_PICKER_CHANGED_EVENT = "lavash:construct-chat-picker-changed";

export type ChatPickerCatalogEntry = {
  key: string;
  ref: ConstructChatPickerModelRef;
  providerLabel: string;
  label: string;
  tier?: ConstructModelTier;
  /** Користувацький запис (не з вбудованого каталогу). */
  custom?: boolean;
  customId?: string;
};

function safeReadJsonArray(key: string): string[] | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return parsed.filter((x): x is string => typeof x === "string");
  } catch {
    return null;
  }
}

function safeWriteJsonArray(key: string, values: string[]) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(values));
  } catch {
    /* ignore */
  }
}

function defaultEnabledKeys(): string[] {
  return CONSTRUCT_CHAT_PROVIDERS.map((p) =>
    chatPickerModelKey({ provider: p.id, modelId: p.defaultModel }),
  );
}

export function dispatchChatPickerChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(CONSTRUCT_CHAT_PICKER_CHANGED_EVENT));
}

export function readChatPickerEnabledKeys(): Set<string> {
  const stored = safeReadJsonArray(CONSTRUCT_CHAT_PICKER_MODELS_KEY);
  const keys = stored ?? defaultEnabledKeys();
  return new Set(keys.filter((k) => parseChatPickerModelKey(k) !== null));
}

export function writeChatPickerEnabledKeys(keys: Iterable<string>): void {
  const valid = [...keys].filter((k) => parseChatPickerModelKey(k) !== null);
  safeWriteJsonArray(CONSTRUCT_CHAT_PICKER_MODELS_KEY, valid);
  dispatchChatPickerChanged();
}

export function setChatPickerModelEnabled(ref: ConstructChatPickerModelRef, enabled: boolean): void {
  const keys = readChatPickerEnabledKeys();
  const key = chatPickerModelKey(ref);
  if (enabled) keys.add(key);
  else keys.delete(key);
  writeChatPickerEnabledKeys(keys);
}

export function isChatPickerModelEnabled(ref: ConstructChatPickerModelRef): boolean {
  return readChatPickerEnabledKeys().has(chatPickerModelKey(ref));
}

export function buildChatPickerCatalog(
  ollamaInstalled: readonly string[],
  storedModels: Partial<Record<ConstructChatProvider, string>>,
): ChatPickerCatalogEntry[] {
  const entries: ChatPickerCatalogEntry[] = [];
  const seen = new Set<string>();

  for (const p of CONSTRUCT_CHAT_PROVIDERS) {
    const stored = storedModels[p.id]?.trim() || p.defaultModel;

    if (p.id === "ollama" && ollamaInstalled.length === 0) {
      const fallbackIds = [
        DEFAULT_OLLAMA_MODEL_UI,
        ...OLLAMA_FREE_MODEL_TAGS.map((t) => t.tag),
      ];
      for (const modelId of fallbackIds) {
        const key = chatPickerModelKey({ provider: "ollama", modelId });
        if (seen.has(key)) continue;
        seen.add(key);
        entries.push({
          key,
          ref: { provider: "ollama", modelId },
          providerLabel: p.label,
          label: modelId,
          tier: "free",
        });
      }
      continue;
    }

    const ollamaOpts = buildOllamaModelSelectOptions(ollamaInstalled, stored, "");
    const options = modelOptionsForProvider(
      p.id,
      stored,
      geminiModelSelectOptions(stored),
      ollamaOpts,
    ).filter((o) => o.id.trim());

    for (const o of options) {
      const key = chatPickerModelKey({ provider: p.id, modelId: o.id });
      if (seen.has(key)) continue;
      seen.add(key);
      entries.push({
        key,
        ref: { provider: p.id, modelId: o.id },
        providerLabel: p.label,
        label: o.label,
        tier: o.tier,
      });
    }
  }

  for (const custom of readCustomChatModels()) {
    const def = CONSTRUCT_CHAT_PROVIDERS.find((p) => p.id === custom.provider);
    if (!def) continue;
    const key = chatPickerModelKey({ provider: custom.provider, modelId: custom.modelId });
    if (seen.has(key)) continue;
    seen.add(key);
    entries.push({
      key,
      ref: { provider: custom.provider, modelId: custom.modelId },
      providerLabel: def.label,
      label: custom.label,
      custom: true,
      customId: custom.id,
    });
  }

  return entries;
}

export function getEnabledChatPickerCatalog(
  ollamaInstalled: readonly string[],
  storedModels: Partial<Record<ConstructChatProvider, string>>,
): ChatPickerCatalogEntry[] {
  const enabled = readChatPickerEnabledKeys();
  return buildChatPickerCatalog(ollamaInstalled, storedModels).filter((e) => enabled.has(e.key));
}

export function findChatPickerCatalogEntry(
  catalog: readonly ChatPickerCatalogEntry[],
  ref: ConstructChatPickerModelRef,
): ChatPickerCatalogEntry | undefined {
  const key = chatPickerModelKey(ref);
  return catalog.find((e) => e.key === key);
}
