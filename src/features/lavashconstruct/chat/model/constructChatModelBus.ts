import type { ConstructChatProvider } from "@/features/lavashconstruct/chat/model/constructChatProviders";

export const CONSTRUCT_CHAT_PATCH_ACTIVE_TAB_EVENT = "lavash:construct-chat:patch-active-tab";
export const CONSTRUCT_CHAT_ACTIVE_TAB_STATE_EVENT = "lavash:construct-chat:active-tab-state";

export type ConstructChatActiveTabState = {
  tabId: string;
  provider: ConstructChatProvider;
  model: string;
  models: Partial<Record<ConstructChatProvider, string>>;
};

export type ConstructChatPatchActiveTabDetail = {
  provider?: ConstructChatProvider;
  models?: Partial<Record<ConstructChatProvider, string>>;
};

export function dispatchConstructChatPatchActiveTab(detail: ConstructChatPatchActiveTabDetail): void {
  window.dispatchEvent(
    new CustomEvent<ConstructChatPatchActiveTabDetail>(CONSTRUCT_CHAT_PATCH_ACTIVE_TAB_EVENT, {
      detail,
    }),
  );
}

export function dispatchConstructChatActiveTabState(state: ConstructChatActiveTabState): void {
  window.dispatchEvent(
    new CustomEvent<ConstructChatActiveTabState>(CONSTRUCT_CHAT_ACTIVE_TAB_STATE_EVENT, {
      detail: state,
    }),
  );
}
