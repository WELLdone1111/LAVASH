import { useCallback, useEffect, useState } from "react";
import type { ArtboardPanel } from "@/features/lavashconstruct/artboard/ui/types";
import {
  CONSTRUCT_CHAT_MARK_STATE_EVENT,
  CONSTRUCT_REGENERATE_PANEL_EVENT,
  dispatchConstructCapturePanelToChat,
  dispatchConstructChatFocusInput,
  dispatchConstructMarkPin,
  type ConstructChatMarkState,
} from "@/features/lavashconstruct/workspace/model/constructMarkBus";

export type UseWorkspaceChatMarkParams = {
  setSelectedPanelId: (id: string | null) => void;
  setSelectedPanelIds: (ids: string[] | ((current: string[]) => string[])) => void;
  expandChatPanel: () => void;
  setMarkMode: (value: boolean | ((open: boolean) => boolean)) => void;
};

export function useWorkspaceChatMark({
  setSelectedPanelId,
  setSelectedPanelIds,
  expandChatPanel,
  setMarkMode,
}: UseWorkspaceChatMarkParams) {
  const [chatMarkedPanelId, setChatMarkedPanelId] = useState<string | null>(null);

  const handleMarkPanel = useCallback(
    (panel: ArtboardPanel) => {
      dispatchConstructMarkPin({ panelId: panel.id, panelTitle: panel.title.trim() || panel.id });
      setSelectedPanelId(panel.id);
      setSelectedPanelIds([panel.id]);
      setMarkMode(false);
    },
    [setMarkMode, setSelectedPanelId, setSelectedPanelIds],
  );

  const handleAskLavashFromContextMenu = useCallback(
    (panel: ArtboardPanel) => {
      handleMarkPanel(panel);
      expandChatPanel();
      dispatchConstructCapturePanelToChat({ panelId: panel.id });
      dispatchConstructChatFocusInput();
    },
    [expandChatPanel, handleMarkPanel],
  );

  const handleRegenerate = useCallback(() => {
    window.dispatchEvent(new CustomEvent(CONSTRUCT_REGENERATE_PANEL_EVENT));
  }, []);

  useEffect(() => {
    const onMarkState = (event: Event) => {
      const detail = (event as CustomEvent<ConstructChatMarkState>).detail;
      setChatMarkedPanelId(detail?.panelId ?? null);
    };
    window.addEventListener(CONSTRUCT_CHAT_MARK_STATE_EVENT, onMarkState);
    return () => window.removeEventListener(CONSTRUCT_CHAT_MARK_STATE_EVENT, onMarkState);
  }, []);

  return {
    chatMarkedPanelId,
    handleMarkPanel,
    handleAskLavashFromContextMenu,
    handleRegenerate,
  };
}
