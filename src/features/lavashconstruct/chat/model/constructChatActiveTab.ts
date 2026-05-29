import {
  CONSTRUCT_CHAT_TABS_STORAGE_KEY,
  geminiModelSelectOptions,
  getTabModel,
  mergeTabModelsFromStorage,
} from "@/features/lavashconstruct/chat/model/constructChatSettings";
import {
  getConstructProviderDef,
  isConstructChatProvider,
  type ConstructChatProvider,
} from "@/features/lavashconstruct/chat/model/constructChatProviders";

export type ActiveChatTabSnapshot = {
  tabId: string;
  provider: ConstructChatProvider;
  model: string;
  models: Partial<Record<ConstructChatProvider, string>>;
};

/** Читає провайдер/модель активної вкладки чату з localStorage. */
export function readActiveChatTabSnapshot(): ActiveChatTabSnapshot | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(CONSTRUCT_CHAT_TABS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { activeTabId?: string; tabs?: unknown };
    if (typeof parsed.activeTabId !== "string" || !Array.isArray(parsed.tabs)) return null;
    const tab = parsed.tabs.find(
      (item): item is Record<string, unknown> =>
        Boolean(item) &&
        typeof item === "object" &&
        (item as { id?: string }).id === parsed.activeTabId,
    );
    if (!tab || typeof tab.id !== "string") return null;
    const provider = isConstructChatProvider(tab.provider) ? tab.provider : "ollama";
    const models = mergeTabModelsFromStorage(
      tab.models && typeof tab.models === "object" && !Array.isArray(tab.models)
        ? (tab.models as Partial<Record<ConstructChatProvider, string>>)
        : undefined,
      tab as { ollamaModel?: unknown; groqModel?: unknown; geminiModel?: unknown },
    );
    const model = getTabModel({ models }, provider);
    return { tabId: tab.id, provider, model, models };
  } catch {
    return null;
  }
}

export function modelLabelForProvider(provider: ConstructChatProvider, modelId: string): string {
  const def = getConstructProviderDef(provider);
  const id = modelId.trim() || def.defaultModel;
  if (provider === "gemini") {
    return geminiModelSelectOptions(id).find((o) => o.id === id)?.label ?? id;
  }
  const hit = def.modelOptions?.find((o) => o.id === id);
  if (hit) return hit.label;
  return id;
}
