import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { invoke, isTauri } from "@tauri-apps/api/core";
import { useTauriEvent } from "@/lib/useTauriEvent";
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
  CONSTRUCT_CHAT_PATCH_ACTIVE_TAB_EVENT,
  dispatchConstructChatActiveTabState,
  type ConstructChatPatchActiveTabDetail,
} from "@/features/lavashconstruct/chat/model/constructChatModelBus";
import {
  CONSTRUCT_MARK_PIN_PANEL_EVENT,
  dispatchConstructChatMarkState,
  type ConstructMarkPinDetail,
} from "@/features/lavashconstruct/workspace/model/constructMarkBus";
import {
  canExportConstructChatTab,
  exportConstructChatTabToFile,
} from "@/features/lavashconstruct/chat/model/constructChatExport";
import type { ConstructChatPickerModelRef } from "@/features/lavashconstruct/chat/model/constructChatPickerModels";
import type { ConstructChatAgentMode } from "@/features/lavashconstruct/chat/model/constructChatAgentMode";
import { useConstructStore } from "@/features/lavashconstruct/artboard/model/store";
import type { OllamaLocalModelRow } from "@/features/settings/model/ollamaLoadHint";
import { FILE_MENU_NEW_CHAT_EVENT } from "@/features/file-menu/model/fileMenuBus";
import { useI18n } from "@/i18n/context";
import {
  getConstructChatTabsInitial,
  type ConstructChatTab,
} from "@/features/lavashconstruct/chat/ui/constructChatPanelTypes";

export function useConstructChatTabs() {
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

  const [newChatPulse, setNewChatPulse] = useState(false);

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

  const clearChatHistory = useCallback(() => {
    if (!window.confirm(t("construct.chat.clearHistoryConfirm"))) return;
    clearConstructChatStorage();
    const fresh = createFreshConstructChatTabsState();
    setTabs(fresh.tabs);
    setActiveTabId(fresh.activeTabId);
  }, [t]);

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

  return {
    tabs,
    setTabs,
    activeTabId,
    setActiveTabId,
    tabsRef,
    activeTabIdRef,
    activeTab,
    messages,
    draft,
    pendingAttachments,
    markedPanelId,
    markedPanelTitle,
    markedPanelLiveTitle,
    provider,
    patchTab,
    patchActiveTab,
    selectChatPickerModel,
    agentMode,
    setAgentMode,
    newChatPulse,
    ollamaInstalledNames,
    ollamaInstalledRef,
    addTab,
    closeTab,
    removeMarkedPanel,
    clearChatHistory,
    activeTabIndex,
    canExportActiveChat,
    onExportActiveChat,
  };
}
