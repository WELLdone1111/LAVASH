import { isConstructChatProvider, type ConstructChatProvider } from "@/features/lavashconstruct/chat/model/constructChatProviders";

export type CustomChatModel = {
  id: string;
  provider: ConstructChatProvider;
  modelId: string;
  label: string;
};

export const CUSTOM_CHAT_MODELS_STORAGE_KEY = "lavash.construct.customChatModels.v1";
export const CUSTOM_CHAT_MODELS_CHANGED_EVENT = "lavash:construct-custom-models-changed";

function safeRead(): CustomChatModel[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(CUSTOM_CHAT_MODELS_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const out: CustomChatModel[] = [];
    for (const row of parsed) {
      if (!row || typeof row !== "object") continue;
      const o = row as Partial<CustomChatModel>;
      if (typeof o.id !== "string" || !o.id.trim()) continue;
      if (!isConstructChatProvider(o.provider)) continue;
      const modelId = typeof o.modelId === "string" ? o.modelId.trim() : "";
      if (!modelId) continue;
      const label = typeof o.label === "string" && o.label.trim() ? o.label.trim() : modelId;
      out.push({ id: o.id.trim(), provider: o.provider, modelId, label });
    }
    return out;
  } catch {
    return [];
  }
}

function safeWrite(models: CustomChatModel[]) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(CUSTOM_CHAT_MODELS_STORAGE_KEY, JSON.stringify(models));
  } catch {
    /* ignore */
  }
}

export function dispatchCustomChatModelsChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(CUSTOM_CHAT_MODELS_CHANGED_EVENT));
}

export function readCustomChatModels(): CustomChatModel[] {
  return safeRead();
}

export function addCustomChatModel(input: {
  provider: ConstructChatProvider;
  modelId: string;
  label?: string;
}): CustomChatModel {
  const modelId = input.modelId.trim();
  const label = input.label?.trim() || modelId;
  const entry: CustomChatModel = {
    id: `custom-${crypto.randomUUID().slice(0, 10)}`,
    provider: input.provider,
    modelId,
    label,
  };
  const next = [...safeRead(), entry];
  safeWrite(next);
  dispatchCustomChatModelsChanged();
  return entry;
}

export function removeCustomChatModel(id: string): void {
  const next = safeRead().filter((m) => m.id !== id);
  safeWrite(next);
  dispatchCustomChatModelsChanged();
}
