import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { invoke, isTauri } from "@tauri-apps/api/core";
import { useTauriEvent } from "@/lib/useTauriEvent";
import {
  Bookmark,
  Bug,
  ChevronDown,
  ClipboardList,
  Clock,
  Copy,
  FileText,
  Bot,
  MessageCircleQuestion,
  Paperclip,
  Plus,
  Square,
  ArrowUp,
  ExternalLink,
  Undo2,
  Pencil,
  X,
} from "lucide-react";
import ConstructChatImprovePromptIcon from "@/features/lavashconstruct/chat/ui/ConstructChatImprovePromptIcon";
import {
  CONSTRUCT_CHAT_AGENT_MODES,
  CONSTRUCT_CHAT_AGENT_MODE_I18N,
  type ConstructChatAgentMode,
} from "@/features/lavashconstruct/chat/model/constructChatAgentMode";
import { applyConstructChatModelSelection } from "@/features/lavashconstruct/chat/model/constructChatModelSelection";
import {
  clearConstructChatStorage,
  createFreshConstructChatTabsState,
  persistConstructChatTabs,
} from "@/features/lavashconstruct/chat/model/constructChatPersistence";
import {
  getTabModelExplicit,
  writeConstructChatModel,
  writeConstructChatProvider,
} from "@/features/lavashconstruct/chat/model/constructChatSettings";
import { isConstructChatProvider } from "@/features/lavashconstruct/chat/model/constructChatProviders";
import { stripWelcomeMessages } from "@/features/lavashconstruct/chat/model/constructChatWelcomeMessage";
import {
  canExportConstructChatTab,
  exportConstructChatTabToFile,
} from "@/features/lavashconstruct/chat/model/constructChatExport";
import {
  CONSTRUCT_CHAT_PATCH_ACTIVE_TAB_EVENT,
  dispatchConstructChatActiveTabState,
  type ConstructChatPatchActiveTabDetail,
} from "@/features/lavashconstruct/chat/model/constructChatModelBus";
import {
  CONSTRUCT_MARK_PIN_PANEL_EVENT,
  dispatchConstructChatMarkState,
  type ConstructMarkPinDetail,
} from "@/features/lavashconstruct/workspace/model/constructMarkBus";
import { useConstructChatSend } from "@/features/lavashconstruct/chat/hooks/useConstructChatSend";
import { useConstructChatAttachments } from "@/features/lavashconstruct/chat/hooks/useConstructChatAttachments";
import type { ConstructChatPickerModelRef } from "@/features/lavashconstruct/chat/model/constructChatPickerModels";
import { CONSTRUCT_CHAT_PANEL_MIN_WIDTH_PX } from "@/features/lavashconstruct/workspace/model/constructUnifiedLayoutStorage";
import { useConstructStore } from "@/features/lavashconstruct/artboard/model/store";
import ConstructChatModelPickerButton from "@/features/lavashconstruct/chat/ui/ConstructChatModelPickerButton";
import { ConstructChatRichContent } from "@/features/lavashconstruct/chat/ui/constructChatRichContent";
import LavashThinkingStatus from "@/features/lavashconstruct/chat/ui/LavashThinkingStatus";
import ConstructChatThinkingBlock from "@/features/lavashconstruct/chat/ui/ConstructChatThinkingBlock";
import {
  getConstructChatTabsInitial,
  MAX_PENDING_ATTACHMENTS,
  type ChatAttachment,
  type ConstructChatTab,
} from "@/features/lavashconstruct/chat/ui/constructChatPanelTypes";
import { ComposerFloatingMenu, useComposerMenuDismiss } from "@/features/lavashconstruct/artboard/ui/composerFloatingMenu";
import type { OllamaLocalModelRow } from "@/features/settings/model/ollamaLoadHint";
import { FILE_MENU_NEW_CHAT_EVENT } from "@/features/file-menu/model/fileMenuBus";
import { useI18n } from "@/i18n/context";
import { cn } from "@/lib/utils";
import "./ConstructChatPanel.css";

const COMPOSER_MIN_ROWS = 1;

export default function ConstructChatPanel() {
  const { t } = useI18n();
  const [chatBoot] = useState(getConstructChatTabsInitial);
  const [tabs, setTabs] = useState<ConstructChatTab[]>(chatBoot.tabs);
  const [activeTabId, setActiveTabId] = useState(chatBoot.activeTabId);
  const tabsRef = useRef(tabs);
  const activeTabIdRef = useRef(activeTabId);

  useEffect(() => {
    tabsRef.current = tabs;
  }, [tabs]);

  useEffect(() => {
    activeTabIdRef.current = activeTabId;
  }, [activeTabId]);

  const activeTab = useMemo(() => {
    const hit = tabs.find((x) => x.id === activeTabId);
    if (hit) return hit;
    return tabs[0] ?? null;
  }, [tabs, activeTabId]);

  useEffect(() => {
    if (tabs.length === 0) return;
    if (tabs.some((x) => x.id === activeTabId)) return;
    setActiveTabId(tabs[0]!.id);
  }, [tabs, activeTabId]);

  const messages = useMemo(
    () => stripWelcomeMessages(activeTab?.messages ?? []),
    [activeTab?.messages],
  );

  useEffect(() => {
    setTabs((prev) => {
      let changed = false;
      const next = prev.map((tab) => {
        const cleaned = stripWelcomeMessages(tab.messages);
        if (cleaned.length === tab.messages.length) return tab;
        changed = true;
        return { ...tab, messages: cleaned };
      });
      return changed ? next : prev;
    });
  }, []);

  const draft = activeTab?.draft ?? "";
  const pendingAttachments = activeTab?.pendingAttachments ?? [];
  const markedPanelId = activeTab?.markedPanelId ?? null;
  const markedPanelTitle = activeTab?.markedPanelTitle ?? null;
  const provider = activeTab?.provider ?? "ollama";
  const artboardPanels = useConstructStore((s) => s.artboardPanels);

  const markedPanelLiveTitle = useMemo(() => {
    if (!markedPanelId) return null;
    const live = artboardPanels.find((p) => p.id === markedPanelId);
    return (live?.title.trim() || markedPanelTitle?.trim() || markedPanelId) ?? null;
  }, [markedPanelId, markedPanelTitle, artboardPanels]);

  useEffect(() => {
    dispatchConstructChatMarkState({ panelId: markedPanelId });
  }, [markedPanelId]);

  useEffect(() => {
    const onMarkPin = (event: Event) => {
      const detail = (event as CustomEvent<ConstructMarkPinDetail>).detail;
      if (!detail?.panelId || !activeTabIdRef.current) return;
      setTabs((prev) =>
        prev.map((x) =>
          x.id === activeTabIdRef.current
            ? {
                ...x,
                markedPanelId: detail.panelId,
                markedPanelTitle: detail.panelTitle.trim() || detail.panelId,
              }
            : x,
        ),
      );
    };
    window.addEventListener(CONSTRUCT_MARK_PIN_PANEL_EVENT, onMarkPin);
    return () => window.removeEventListener(CONSTRUCT_MARK_PIN_PANEL_EVENT, onMarkPin);
  }, []);

  useEffect(() => {
    if (!activeTab) return;
    dispatchConstructChatActiveTabState({
      tabId: activeTab.id,
      provider: activeTab.provider,
      model: getTabModelExplicit(activeTab, activeTab.provider) ?? "",
      models: { ...activeTab.models },
    });
  }, [activeTab]);

  useEffect(() => {
    const onPatch = (event: Event) => {
      const detail = (event as CustomEvent<ConstructChatPatchActiveTabDetail>).detail;
      if (!detail || !activeTabIdRef.current) return;
      setTabs((prev) =>
        prev.map((x) => {
          if (x.id !== activeTabIdRef.current) return x;
          const patch: Partial<ConstructChatTab> = {};
          if (detail.provider) {
            patch.provider = detail.provider;
            writeConstructChatProvider(detail.provider);
          }
          if (detail.models) {
            patch.models = { ...x.models, ...detail.models };
            for (const [providerKey, modelId] of Object.entries(detail.models)) {
              if (isConstructChatProvider(providerKey) && typeof modelId === "string" && modelId.trim()) {
                writeConstructChatModel(providerKey, modelId.trim());
              }
            }
          }
          if (Object.keys(patch).length === 0) return x;
          return { ...x, ...patch };
        }),
      );
    };
    window.addEventListener(CONSTRUCT_CHAT_PATCH_ACTIVE_TAB_EVENT, onPatch);
    return () => window.removeEventListener(CONSTRUCT_CHAT_PATCH_ACTIVE_TAB_EVENT, onPatch);
  }, []);

  const patchTab = useCallback((id: string, patch: Partial<ConstructChatTab>) => {
    setTabs((prev) => prev.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  }, []);

  const patchActiveTab = useCallback(
    (patch: Partial<ConstructChatTab>) => {
      setTabs((prev) => prev.map((x) => (x.id === activeTabId ? { ...x, ...patch } : x)));
    },
    [activeTabId],
  );

  const selectChatPickerModel = useCallback(
    (ref: ConstructChatPickerModelRef) => {
      if (!activeTab) return;
      applyConstructChatModelSelection(ref);
    },
    [activeTab],
  );

  const agentMode = activeTab?.agentMode ?? "agent";
  const setAgentMode = useCallback(
    (mode: ConstructChatAgentMode) => patchActiveTab({ agentMode: mode }),
    [patchActiveTab],
  );

  const [agentMenuOpen, setAgentMenuOpen] = useState(false);
  const [newChatPulse, setNewChatPulse] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const agentMenuRef = useRef<HTMLDivElement | null>(null);
  const agentMenuPortalRef = useRef<HTMLUListElement | null>(null);

  const [ollamaInstalledNames, setOllamaInstalledNames] = useState<string[]>([]);
  const ollamaInstalledRef = useRef<string[]>([]);

  useEffect(() => {
    ollamaInstalledRef.current = ollamaInstalledNames;
  }, [ollamaInstalledNames]);

  const refreshOllamaInstalled = useCallback(async () => {
    if (!isTauri()) return;
    try {
      const list = await invoke<OllamaLocalModelRow[]>("ollama_list_local_models");
      setOllamaInstalledNames(Array.isArray(list) ? list.map((r) => r.name) : []);
    } catch {
      setOllamaInstalledNames([]);
    }
  }, []);

  useEffect(() => {
    void refreshOllamaInstalled();
  }, [refreshOllamaInstalled]);

  useTauriEvent("ollama-model-pull-finished", (event) => {
    void refreshOllamaInstalled();
    const payload = event.payload as { model?: string; ok?: boolean } | undefined;
    const pulled = payload?.model?.trim();
    if (!payload?.ok || !pulled) return;
    applyConstructChatModelSelection({ provider: "ollama", modelId: pulled });
  });

  useTauriEvent("ollama-model-rm-finished", () => {
    void refreshOllamaInstalled();
  });

  useEffect(() => {
    persistConstructChatTabs(activeTabId, tabs);
  }, [tabs, activeTabId]);

  useEffect(() => {
    const flush = () => {
      persistConstructChatTabs(activeTabIdRef.current, tabsRef.current);
    };
    window.addEventListener("pagehide", flush);
    window.addEventListener("beforeunload", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
      window.removeEventListener("beforeunload", flush);
    };
  }, []);

  const {
    fileInputRef,
    removePendingAttachment,
    attachPanelCaptureToChat,
    onComposerPaste,
    onFileInputChange,
  } = useConstructChatAttachments({ activeTabIdRef, setTabs });

  const {
    isSending,
    isImprovingPrompt,
    improvePromptBeforeDraft,
    improvePromptIconMode,
    handleImprovePromptClick,
    editingUserMessage,
    setEditingUserMessage,
    thinkingSessionKey,
    textareaRef,
    editMessageTextareaRef,
    stopGeneration,
    send,
    copyMessage,
    revertChatToMessage,
    startEditUserMessage,
    cancelEditUserMessage,
    submitEditedUserMessage,
    onEditMessageKeyDown,
    onComposerKeyDown,
  } = useConstructChatSend({
    setTabs,
    tabsRef,
    activeTabIdRef,
    activeTabId,
    draft,
    ollamaInstalledRef,
    patchTab,
    patchActiveTab,
    attachPanelCaptureToChat,
  });

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, isSending, activeTabId, editingUserMessage]);

  useComposerMenuDismiss(agentMenuRef, agentMenuOpen, () => setAgentMenuOpen(false), agentMenuPortalRef);

  const addTab = useCallback(() => {
    setNewChatPulse(true);
    window.setTimeout(() => setNewChatPulse(false), 420);
    const id = `tab-${crypto.randomUUID().slice(0, 10)}`;
    setTabs((prev) => {
      const src = prev.find((x) => x.id === activeTabIdRef.current) ?? prev[0];
      const next: ConstructChatTab = {
        id,
        title: "",
        messages: [],
        ollamaThread: [],
        provider: src.provider,
        models: { ...src.models },
        draft: "",
        pendingAttachments: [],
        markedPanelId: null,
        markedPanelTitle: null,
        agentMode: src.agentMode,
      };
      return [...prev, next];
    });
    setActiveTabId(id);
  }, []);

  useEffect(() => {
    const onNewChatTab = () => addTab();
    window.addEventListener(FILE_MENU_NEW_CHAT_EVENT, onNewChatTab);
    return () => window.removeEventListener(FILE_MENU_NEW_CHAT_EVENT, onNewChatTab);
  }, [addTab]);

  const closeTab = useCallback(
    (tabId: string) => {
      if (tabs.length <= 1) return;
      const i = tabs.findIndex((x) => x.id === tabId);
      if (i < 0) return;
      const nextList = tabs.filter((x) => x.id !== tabId);
      let nextActive = activeTabId;
      if (activeTabId === tabId) {
        const neighbor = tabs[i - 1] ?? tabs[i + 1];
        nextActive = neighbor!.id;
      }
      setTabs(nextList);
      setActiveTabId(nextActive);
    },
    [tabs, activeTabId],
  );

  const removeMarkedPanel = useCallback(() => {
    patchActiveTab({ markedPanelId: null, markedPanelTitle: null });
  }, [patchActiveTab]);

  const agentModeIcon = (mode: ConstructChatAgentMode) => {
    switch (mode) {
      case "plan":
        return <ClipboardList size={14} strokeWidth={2} aria-hidden />;
      case "ask":
        return <MessageCircleQuestion size={14} strokeWidth={2} aria-hidden />;
      case "debug":
        return <Bug size={14} strokeWidth={2} aria-hidden />;
      default:
        return <Bot size={14} strokeWidth={2} aria-hidden />;
    }
  };

  const clearChatHistory = useCallback(() => {
    if (isSending) return;
    if (!window.confirm(t("construct.chat.clearHistoryConfirm"))) return;
    clearConstructChatStorage();
    const fresh = createFreshConstructChatTabsState();
    setTabs(fresh.tabs);
    setActiveTabId(fresh.activeTabId);
  }, [isSending, t]);

  const activeTabIndex = useMemo(
    () => Math.max(0, tabs.findIndex((tab) => tab.id === activeTabId)),
    [tabs, activeTabId],
  );

  const canExportActiveChat = useMemo(
    () => canExportConstructChatTab(activeTab?.messages ?? []),
    [activeTab?.messages],
  );

  const onExportActiveChat = useCallback(() => {
    if (!activeTab || !canExportConstructChatTab(activeTab.messages)) return;
    void exportConstructChatTabToFile(
      {
        title: activeTab.title,
        tabIndex: activeTabIndex,
        provider: activeTab.provider,
        models: activeTab.models,
        messages: activeTab.messages,
      },
      {
        heading: t("construct.chat.export.heading"),
        tab: t("construct.chat.export.tab"),
        provider: t("construct.chat.export.provider"),
        model: t("construct.chat.export.model"),
        exported: t("construct.chat.export.exportedAt"),
        attachments: t("construct.chat.export.attachments"),
        user: t("construct.chat.export.roleUser"),
        assistant: t("construct.chat.export.roleAssistant"),
      },
      t("construct.chat.exportDialogTitle"),
    );
  }, [activeTab, activeTabIndex, t]);

  return (
    <div
      className="lc-chat-panel lc-chat-panel--shell"
      style={
        {
          "--lc-chat-panel-min-width": `${CONSTRUCT_CHAT_PANEL_MIN_WIDTH_PX}px`,
        } as React.CSSProperties
      }
    >
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
            onClick={clearChatHistory}
            disabled={isSending}
            aria-label={t("construct.chat.clearHistory")}
            title={t("construct.chat.clearHistoryHint")}
          >
            <Clock size={15} strokeWidth={2} aria-hidden />
          </button>
        </div>
      </div>

      <div ref={scrollRef} className="lc-chat-panel__messages" role="log" aria-live="polite">
        {messages.map((m) => {
          const imageAtts = m.attachments?.filter(
            (a): a is Extract<ChatAttachment, { kind: "image" }> => a.kind === "image",
          );
          const otherAtts = m.attachments?.filter((a) => a.kind !== "image") ?? [];
          const canEditUser =
            m.role === "user" && !isSending && !editingUserMessage && m.text.trim().length > 0;
          return (
            <div key={m.id} className={`lc-chat-panel__row lc-chat-panel__row--enter lc-chat-panel__row--${m.role}`}>
              <div
                className={cn(
                  "lc-chat-panel__bubble",
                  m.variant === "error" && "lc-chat-panel__bubble--error",
                  m.streaming && "lc-chat-panel__bubble--streaming",
                )}
              >
                {imageAtts?.length ? (
                  <div className="lc-chat-panel__bubble-imgs">
                    {imageAtts.map((a) => (
                      <img key={a.id} src={a.dataUrl} alt="" className="lc-chat-panel__bubble-img" />
                    ))}
                  </div>
                ) : null}
                {otherAtts.length > 0 ? (
                  <div className="lc-chat-panel__bubble-chips">
                    {otherAtts.map((a) =>
                      a.kind === "text" ? (
                        <span key={a.id} className="lc-chat-panel__bubble-chip" title={a.name}>
                          <FileText size={12} strokeWidth={2} aria-hidden />
                          <span className="lc-chat-panel__bubble-chip__name">{a.name}</span>
                        </span>
                      ) : (
                        <span key={a.id} className="lc-chat-panel__bubble-chip" title={a.name}>
                          <Paperclip size={12} strokeWidth={2} aria-hidden />
                          <span className="lc-chat-panel__bubble-chip__name">{a.name}</span>
                        </span>
                      ),
                    )}
                  </div>
                ) : null}
                {m.thinking?.trim() ? (
                  <ConstructChatThinkingBlock
                    thinking={m.thinking}
                    active={Boolean(m.streaming && !m.text.trim())}
                  />
                ) : null}
                {m.streaming && !m.text.trim() && !m.thinking?.trim() ? (
                  <LavashThinkingStatus sessionKey={thinkingSessionKey} className="lavash-thinking-status--in-bubble" />
                ) : m.text.trim() ? (
                  <ConstructChatRichContent text={m.text} className="lc-chat-md lc-chat-md--in-bubble" />
                ) : null}
              </div>
              <div className="lc-chat-panel__msg-actions">
                {canEditUser ? (
                  <button
                    type="button"
                    className="lc-chat-panel__msg-action lc-chat-panel__msg-action--edit"
                    aria-label={t("construct.chat.editMsg")}
                    title={t("construct.chat.editMsgHint")}
                    disabled={isSending}
                    onClick={() => startEditUserMessage(m.id)}
                  >
                    <Pencil size={14} strokeWidth={2} />
                  </button>
                ) : null}
                {m.role === "assistant" && !m.streaming && m.variant !== "error" && m.revertSnapshot ? (
                  <button
                    type="button"
                    className="lc-chat-panel__msg-action lc-chat-panel__msg-action--revert"
                    aria-label={t("construct.chat.revertMsg")}
                    title={t("construct.chat.revertMsgHint")}
                    disabled={isSending}
                    onClick={() => revertChatToMessage(m.id)}
                  >
                    <Undo2 size={14} strokeWidth={2} />
                  </button>
                ) : null}
                <button
                  type="button"
                  className="lc-chat-panel__msg-action lc-chat-panel__msg-action--copy"
                  aria-label={t("construct.chat.copyMsg")}
                  onClick={() => copyMessage(m.text)}
                >
                  <Copy size={14} strokeWidth={2} />
                </button>
              </div>
            </div>
          );
        })}
        {editingUserMessage ? (
          <div className="lc-chat-panel__row lc-chat-panel__row--user lc-chat-panel__row--editing">
            <div className="lc-chat-panel__bubble lc-chat-panel__bubble--editing">
              {editingUserMessage.attachments?.length ? (
                <div className="lc-chat-panel__bubble-chips lc-chat-panel__bubble-chips--readonly">
                  {editingUserMessage.attachments
                    .filter((a) => a.kind !== "image")
                    .map((a) => (
                      <span key={a.id} className="lc-chat-panel__bubble-chip" title={a.name}>
                        {a.kind === "text" ? (
                          <FileText size={12} strokeWidth={2} aria-hidden />
                        ) : (
                          <Paperclip size={12} strokeWidth={2} aria-hidden />
                        )}
                        <span className="lc-chat-panel__bubble-chip__name">{a.name}</span>
                      </span>
                    ))}
                </div>
              ) : null}
              <textarea
                ref={editMessageTextareaRef}
                className="lc-chat-panel__edit-input"
                value={editingUserMessage.draft}
                spellCheck={false}
                rows={2}
                aria-label={t("construct.chat.editMsg")}
                onChange={(e) =>
                  setEditingUserMessage((prev) => (prev ? { ...prev, draft: e.target.value } : prev))
                }
                onKeyDown={onEditMessageKeyDown}
              />
              <div className="lc-chat-panel__edit-actions">
                <button
                  type="button"
                  className="lc-chat-panel__edit-btn lc-chat-panel__edit-btn--ghost"
                  onClick={cancelEditUserMessage}
                >
                  {t("construct.chat.editCancel")}
                </button>
                <button
                  type="button"
                  className="lc-chat-panel__edit-btn lc-chat-panel__edit-btn--primary"
                  disabled={!editingUserMessage.draft.trim() && !editingUserMessage.attachments?.length}
                  onClick={submitEditedUserMessage}
                >
                  {t("construct.chat.editResend")}
                </button>
              </div>
            </div>
          </div>
        ) : null}
        {isSending && !(messages.length > 0 && messages[messages.length - 1]?.streaming) ? (
          <div className="lc-chat-panel__row lc-chat-panel__row--assistant lc-chat-panel__row--thinking">
            <div className="lc-chat-panel__bubble lc-chat-panel__bubble--thinking">
              <LavashThinkingStatus sessionKey={thinkingSessionKey} />
            </div>
          </div>
        ) : null}
      </div>

      <div className="lc-chat-panel__composer lc-chat-panel__composer--boxed">
        <input
          ref={fileInputRef}
          type="file"
          accept="*/*"
          multiple
          className="lc-chat-panel__file-input"
          aria-hidden
          tabIndex={-1}
          onChange={onFileInputChange}
        />
        {markedPanelId && markedPanelLiveTitle ? (
          <div className="lc-chat-panel__mark-row" aria-label={t("construct.chat.markPinAria")}>
            <div className="lc-chat-panel__mark-pin">
              <Bookmark size={14} strokeWidth={2.25} aria-hidden />
              <span className="lc-chat-panel__mark-pin__label">
                {t("construct.chat.markPinLabel", { title: markedPanelLiveTitle })}
              </span>
              <button
                type="button"
                className="lc-chat-panel__mark-pin__remove"
                aria-label={t("construct.chat.removeMark")}
                disabled={isSending}
                onClick={removeMarkedPanel}
              >
                <X size={12} strokeWidth={2.5} />
              </button>
            </div>
          </div>
        ) : null}
        {pendingAttachments.length > 0 ? (
          <div className="lc-chat-panel__pending-row">
            {pendingAttachments.map((a) => (
              <div key={a.id} className="lc-chat-panel__pending-pill">
                {a.kind === "image" ? (
                  <img src={a.dataUrl} alt="" className="lc-chat-panel__pending-thumb" />
                ) : (
                  <div className="lc-chat-panel__pending-file">
                    {a.kind === "text" ? (
                      <FileText size={18} strokeWidth={2} aria-hidden />
                    ) : (
                      <Paperclip size={18} strokeWidth={2} aria-hidden />
                    )}
                    <span className="lc-chat-panel__pending-file__name">{a.name}</span>
                  </div>
                )}
                <button
                  type="button"
                  className="lc-chat-panel__pending-remove"
                  aria-label={t("construct.chat.removeAttachment")}
                  disabled={isSending}
                  onClick={() => removePendingAttachment(a.id)}
                >
                  <X size={12} strokeWidth={2.5} />
                </button>
              </div>
            ))}
          </div>
        ) : null}
        <textarea
          ref={textareaRef}
          className="lc-chat-panel__input lc-chat-panel__input--boxed"
          rows={COMPOSER_MIN_ROWS}
          value={draft}
          spellCheck={false}
          disabled={isSending || !!editingUserMessage}
          aria-busy={isSending}
          placeholder={
            editingUserMessage ? t("construct.chat.placeholderEditing") : t("construct.chat.placeholderFollowUp")
          }
          onChange={(e) => patchActiveTab({ draft: e.target.value })}
          onKeyDown={onComposerKeyDown}
          onPaste={onComposerPaste}
        />
        <div className="lc-chat-panel__composer-toolbar">
          <div className="lc-chat-panel__composer-toolbar-left">
            <div ref={agentMenuRef} className="lc-chat-panel__mode-wrap">
              <button
                type="button"
                className="lc-chat-panel__mode-trigger"
                aria-expanded={agentMenuOpen}
                aria-haspopup="listbox"
                disabled={isSending}
                onClick={() => setAgentMenuOpen((open) => !open)}
              >
                {agentModeIcon(agentMode)}
                <span>{t(CONSTRUCT_CHAT_AGENT_MODE_I18N[agentMode])}</span>
                <ChevronDown size={13} strokeWidth={2} aria-hidden />
              </button>
              <ComposerFloatingMenu
                ref={agentMenuPortalRef}
                open={agentMenuOpen}
                anchorRef={agentMenuRef}
                className="lc-chat-panel__mode-menu lc-chat-panel__mode-menu--floating"
                role="listbox"
                ariaLabel={t("construct.chat.agentModeAria")}
              >
                {CONSTRUCT_CHAT_AGENT_MODES.map((mode) => (
                  <li key={mode} role="presentation">
                    <button
                      type="button"
                      role="option"
                      aria-selected={agentMode === mode}
                      className={cn(
                        "lc-chat-panel__mode-option",
                        agentMode === mode && "lc-chat-panel__mode-option--active",
                      )}
                      onClick={() => {
                        setAgentMode(mode);
                        setAgentMenuOpen(false);
                      }}
                    >
                      {agentModeIcon(mode)}
                      <span>{t(CONSTRUCT_CHAT_AGENT_MODE_I18N[mode])}</span>
                    </button>
                  </li>
                ))}
              </ComposerFloatingMenu>
            </div>
            <ConstructChatModelPickerButton
              provider={provider}
              models={activeTab?.models ?? {}}
              ollamaInstalled={ollamaInstalledNames}
              disabled={isSending}
              onSelect={selectChatPickerModel}
            />
          </div>
          <div className="lc-chat-panel__composer-toolbar-right">
          <div className="lc-chat-panel__composer-attach-group">
            <button
              type="button"
              className={cn(
                "lc-chat-panel__attach lc-chat-panel__attach--toolbar lc-chat-panel__attach--improve-prompt",
                isImprovingPrompt && "lc-chat-panel__attach--improving",
                improvePromptBeforeDraft !== null && "lc-chat-panel__attach--improve-undo",
              )}
              disabled={
                isSending ||
                isImprovingPrompt ||
                (improvePromptBeforeDraft === null && !draft.trim())
              }
              aria-busy={isImprovingPrompt}
              aria-label={
                improvePromptBeforeDraft !== null
                  ? t("construct.chat.undoImprovePrompt")
                  : t("construct.chat.improvePrompt")
              }
              title={
                improvePromptBeforeDraft !== null
                  ? t("construct.chat.undoImprovePromptHint")
                  : t("construct.chat.improvePromptHint")
              }
              onClick={handleImprovePromptClick}
            >
              <ConstructChatImprovePromptIcon mode={improvePromptIconMode} />
            </button>
            <button
              type="button"
              className="lc-chat-panel__attach lc-chat-panel__attach--toolbar lc-chat-panel__attach--clip"
              disabled={isSending || pendingAttachments.length >= MAX_PENDING_ATTACHMENTS}
              aria-label={t("construct.chat.addFile")}
              onClick={() => fileInputRef.current?.click()}
            >
              <Paperclip size={18} strokeWidth={2} />
            </button>
          </div>
            <button
              type="button"
              className={cn("lc-chat-panel__send", isSending && "lc-chat-panel__send--stop")}
              onClick={() => {
                if (isSending) stopGeneration();
                else void send();
              }}
              disabled={
                (!isSending && !!editingUserMessage) ||
                (!isSending && !draft.trim() && pendingAttachments.length === 0)
              }
              aria-label={isSending ? t("construct.chat.stopGeneration") : t("construct.chat.send")}
            >
              {isSending ? (
                <Square size={14} strokeWidth={2.5} fill="currentColor" aria-hidden />
              ) : (
                <ArrowUp size={18} strokeWidth={2.25} aria-hidden />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
