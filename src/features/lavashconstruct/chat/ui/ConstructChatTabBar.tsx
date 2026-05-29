import { Clock, ExternalLink, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n/context";
import type { ConstructChatTab } from "@/features/lavashconstruct/chat/ui/constructChatPanelTypes";

export type ConstructChatTabBarProps = {
  tabs: ConstructChatTab[];
  activeTabId: string;
  setActiveTabId: (id: string) => void;
  isSending: boolean;
  closeTab: (tabId: string) => void;
  addTab: () => void;
  newChatPulse: boolean;
  onExportActiveChat: () => void;
  canExportActiveChat: boolean;
  onClearChatHistory: () => void;
};

export function ConstructChatTabBar({
  tabs,
  activeTabId,
  setActiveTabId,
  isSending,
  closeTab,
  addTab,
  newChatPulse,
  onExportActiveChat,
  canExportActiveChat,
  onClearChatHistory,
}: ConstructChatTabBarProps) {
  const { t } = useI18n();

  return (
    <div className="lc-chat-panel__tab-bar">
      <div className="lc-chat-panel__tab-strip" role="tablist" aria-label={t("construct.chat.tabsAria")}>
        {tabs.map((tab, index) => (
          <div
            key={tab.id}
            className={cn("lc-chat-panel__tab", tab.id === activeTabId && "lc-chat-panel__tab--active")}
            style={{ zIndex: tab.id === activeTabId ? tabs.length + 2 : index + 1 }}
          >
            <button
              type="button"
              role="tab"
              aria-selected={tab.id === activeTabId}
              disabled={isSending}
              className="lc-chat-panel__tab-main"
              onClick={() => setActiveTabId(tab.id)}
            >
              {tab.title.trim() || t("construct.chat.tabUntitled", { n: index + 1 })}
            </button>
            {tabs.length > 1 ? (
              <button
                type="button"
                className="lc-chat-panel__tab-x"
                aria-label={t("construct.chat.closeTab")}
                disabled={isSending}
                onClick={(e) => {
                  e.stopPropagation();
                  closeTab(tab.id);
                }}
              >
                <X size={12} strokeWidth={2.5} />
              </button>
            ) : null}
          </div>
        ))}
      </div>
      <div className="lc-chat-panel__tab-chrome">
        <button
          type="button"
          className={cn(
            "lc-chat-panel__tab-tool",
            "lc-chat-panel__tab-tool--new",
            newChatPulse && "lc-chat-panel__tab-tool--pulse",
          )}
          onClick={addTab}
          disabled={isSending}
          aria-label={t("construct.chat.newChat")}
          title={t("construct.chat.newChatHint")}
        >
          <Plus size={16} strokeWidth={2.25} aria-hidden />
        </button>
        <button
          type="button"
          className="lc-chat-panel__tab-tool lc-chat-panel__tab-tool--export"
          onClick={onExportActiveChat}
          disabled={isSending || !canExportActiveChat}
          aria-label={t("construct.chat.export")}
          title={t("construct.chat.exportHint")}
        >
          <ExternalLink size={15} strokeWidth={2} aria-hidden />
        </button>
        <button
          type="button"
          className="lc-chat-panel__tab-tool lc-chat-panel__tab-tool--history"
          onClick={onClearChatHistory}
          disabled={isSending}
          aria-label={t("construct.chat.clearHistory")}
          title={t("construct.chat.clearHistoryHint")}
        >
          <Clock size={15} strokeWidth={2} aria-hidden />
        </button>
      </div>
    </div>
  );
}
