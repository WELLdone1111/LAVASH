import { create } from "zustand";

export type WebView2StatusSnapshot = {
  installed: boolean;
  version: string | null;
  platform: string;
  installUrl: string | null;
  detail: string;
  installing: boolean;
  checkedAt: number;
};

type AppStatusState = {
  labChatSending: boolean;
  /** Короткий підпис для смуги стану (провайдер · модель). */
  labChatModelHint: string;
  webview2: WebView2StatusSnapshot | null;
};

type AppStatusActions = {
  setConstructChatSending: (sending: boolean, modelHint?: string) => void;
  setWebView2Status: (snapshot: WebView2StatusSnapshot) => void;
};

export const useAppStatusStore = create<AppStatusState & AppStatusActions>((set) => ({
  labChatSending: false,
  labChatModelHint: "",
  webview2: null,

  setConstructChatSending: (sending, modelHint) =>
    set({
      labChatSending: sending,
      labChatModelHint: sending && modelHint?.trim() ? modelHint.trim() : "",
    }),

  setWebView2Status: (snapshot) => set({ webview2: snapshot }),
}));
