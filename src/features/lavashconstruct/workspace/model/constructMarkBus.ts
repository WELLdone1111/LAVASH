export const CONSTRUCT_MARK_PIN_PANEL_EVENT = "lavash:construct-mark-pin-panel";
export const CONSTRUCT_CHAT_MARK_STATE_EVENT = "lavash:construct-chat:mark-state";
export const CONSTRUCT_CAPTURE_PANEL_TO_CHAT_EVENT = "lavash:construct-capture-panel-to-chat";
export const CONSTRUCT_REGENERATE_PANEL_EVENT = "lavash:construct-regenerate";

export type ConstructMarkPinDetail = {
  panelId: string;
  panelTitle: string;
};

export type ConstructCapturePanelDetail = {
  panelId?: string;
};

export type ConstructChatMarkState = {
  panelId: string | null;
};

export function dispatchConstructMarkPin(detail: ConstructMarkPinDetail): void {
  window.dispatchEvent(
    new CustomEvent<ConstructMarkPinDetail>(CONSTRUCT_MARK_PIN_PANEL_EVENT, { detail }),
  );
}

export function dispatchConstructChatMarkState(state: ConstructChatMarkState): void {
  window.dispatchEvent(
    new CustomEvent<ConstructChatMarkState>(CONSTRUCT_CHAT_MARK_STATE_EVENT, { detail: state }),
  );
}

export const CONSTRUCT_CHAT_FOCUS_INPUT_EVENT = "lavash:construct-chat:focus-input";

export function dispatchConstructChatFocusInput(): void {
  window.dispatchEvent(new CustomEvent(CONSTRUCT_CHAT_FOCUS_INPUT_EVENT));
}

export function dispatchConstructCapturePanelToChat(detail?: ConstructCapturePanelDetail): void {
  window.dispatchEvent(
    new CustomEvent<ConstructCapturePanelDetail>(CONSTRUCT_CAPTURE_PANEL_TO_CHAT_EVENT, {
      detail: detail ?? {},
    }),
  );
}
