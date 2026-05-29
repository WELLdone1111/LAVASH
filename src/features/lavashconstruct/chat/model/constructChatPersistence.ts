import { CONSTRUCT_CHAT_TABS_STORAGE_KEY } from "@/features/lavashconstruct/chat/model/constructChatSettings";
import { trimRevertSnapshotsForPersist } from "@/features/lavashconstruct/chat/model/constructChatRevertSnapshot";
import {
  ensureThreadFromTab,
  type ConstructChatThreadTurn,
  slimThread,
} from "@/features/lavashconstruct/chat/model/constructChatThread";
import {
  buildTabFromSettings,
  type ConstructChatTab,
} from "@/features/lavashconstruct/chat/ui/constructChatPanelTypes";

export const CONSTRUCT_CHAT_PERSISTENCE_VERSION = 2;

type UiMessage = {
  id: string;
  role: string;
  text: string;
  variant?: string;
  revertSnapshot?: unknown;
};

export type PersistedConstructChatTab = {
  id: string;
  title: string;
  messages: UiMessage[];
  ollamaThread: ConstructChatThreadTurn[];
  provider: string;
  models?: Record<string, string>;
  draft: string;
  pendingAttachments: unknown[];
  markedPanelId?: string | null;
  markedPanelTitle?: string | null;
  agentMode?: string;
};

function stripHeavyAttachmentsFromMessages(messages: UiMessage[]): UiMessage[] {
  return messages.map((m) => {
    const o = m as UiMessage & { attachments?: Array<Record<string, unknown>> };
    if (!Array.isArray(o.attachments)) return m;
    const attachments = o.attachments.map((att) => {
      if (att.kind === "image" && typeof att.dataUrl === "string" && att.dataUrl.length > 200_000) {
        return { ...att, dataUrl: "", base64: "", _strippedOnSave: true };
      }
      return att;
    });
    return { ...m, attachments } as UiMessage;
  });
}

function serializeTab(tab: PersistedConstructChatTab): PersistedConstructChatTab {
  const thread = slimThread(
    ensureThreadFromTab({
      messages: tab.messages,
      ollamaThread: tab.ollamaThread,
    }),
  );
  return {
    ...tab,
    ollamaThread: thread,
    pendingAttachments: [],
    messages: stripHeavyAttachmentsFromMessages(trimRevertSnapshotsForPersist(tab.messages)),
  };
}

/** Видаляє збережені вкладки чату (localStorage). */
export function clearConstructChatStorage(): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.removeItem(CONSTRUCT_CHAT_TABS_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/** Одна порожня вкладка після скидання історії. */
export function createFreshConstructChatTabsState(): { tabs: ConstructChatTab[]; activeTabId: string } {
  const id = `tab-${crypto.randomUUID().slice(0, 10)}`;
  return { tabs: [buildTabFromSettings(id, "")], activeTabId: id };
}

export function persistConstructChatTabs(activeTabId: string, tabs: readonly PersistedConstructChatTab[]): boolean {
  if (typeof localStorage === "undefined") return false;
  const payload = {
    v: CONSTRUCT_CHAT_PERSISTENCE_VERSION,
    activeTabId,
    tabs: tabs.map((t) => serializeTab(t)),
  };
  try {
    localStorage.setItem(CONSTRUCT_CHAT_TABS_STORAGE_KEY, JSON.stringify(payload));
    return true;
  } catch {
    try {
      const lite = {
        ...payload,
        tabs: payload.tabs.map((t) => ({
          ...t,
          messages: t.messages.map((m) => {
            const { attachments: _a, ...rest } = m as UiMessage & { attachments?: unknown };
            return rest;
          }),
        })),
      };
      localStorage.setItem(CONSTRUCT_CHAT_TABS_STORAGE_KEY, JSON.stringify(lite));
      return true;
    } catch {
      return false;
    }
  }
}
