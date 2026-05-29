import { useCallback, useEffect, useState } from "react";

import { invoke } from "@tauri-apps/api/core";

import { useI18n } from "@/i18n/context";

import { isTauriRuntime } from "@/lib/isTauriRuntime";

import { useTauriEvent } from "@/lib/useTauriEvent";

import {

  CONSTRUCT_CHAT_ACTIVE_TAB_STATE_EVENT,

  type ConstructChatActiveTabState,

} from "@/features/lavashconstruct/chat/model/constructChatModelBus";

import { readActiveChatTabSnapshot } from "@/features/lavashconstruct/chat/model/constructChatActiveTab";

import type { ConstructChatProvider } from "@/features/lavashconstruct/chat/model/constructChatProviders";
import { applyConstructChatModelSelection } from "@/features/lavashconstruct/chat/model/constructChatModelSelection";

import type { OllamaLocalModelRow } from "@/features/settings/model/ollamaLoadHint";

import ConstructModelsManager from "@/features/lavashconstruct/settings/ui/ConstructModelsManager";
import ConstructFreeApiKeysGuide from "@/features/lavashconstruct/settings/ui/ConstructFreeApiKeysGuide";

import {

  ConstructAgentCommandsSection,

  ConstructAgentImportSettingsSection,

  ConstructAgentMemoriesSection,

  ConstructAgentRulesSection,

  ConstructAgentSkillsSection,

} from "@/features/lavashconstruct/settings/ui/ConstructAgentConfigPanels";

import "./ConstructBasicsSettings.css";

import "@/features/lavashconstruct/chat/ui/ConstructChatPanel.css";

import "./ConstructModelPanel.css";



export default function ConstructModelPanel() {

  const { t } = useI18n();

  const [models, setModels] = useState<Partial<Record<ConstructChatProvider, string>>>({});

  const [ollamaInstalled, setOllamaInstalled] = useState<string[]>([]);



  const refreshOllamaInstalled = useCallback(async () => {

    if (!isTauriRuntime()) {

      setOllamaInstalled([]);

      return;

    }

    try {

      const list = await invoke<OllamaLocalModelRow[]>("ollama_list_local_models");

      setOllamaInstalled(Array.isArray(list) ? list.map((row) => row.name) : []);

    } catch {

      setOllamaInstalled([]);

    }

  }, []);



  const applySnapshot = useCallback((snap: ConstructChatActiveTabState | ReturnType<typeof readActiveChatTabSnapshot>) => {

    if (!snap) return;

    setModels({ ...snap.models });

  }, []);



  useEffect(() => {

    const snap = readActiveChatTabSnapshot();

    if (snap) applySnapshot(snap);

  }, [applySnapshot]);



  useEffect(() => {

    void refreshOllamaInstalled();

  }, [refreshOllamaInstalled]);



  useEffect(() => {

    const onState = (event: Event) => {

      const detail = (event as CustomEvent<ConstructChatActiveTabState>).detail;

      if (!detail) return;

      applySnapshot(detail);

    };

    window.addEventListener(CONSTRUCT_CHAT_ACTIVE_TAB_STATE_EVENT, onState);

    return () => window.removeEventListener(CONSTRUCT_CHAT_ACTIVE_TAB_STATE_EVENT, onState);

  }, [applySnapshot]);



  useTauriEvent("ollama-model-pull-finished", () => {

    void refreshOllamaInstalled();

  });

  useTauriEvent("ollama-model-rm-finished", () => {

    void refreshOllamaInstalled();

  });



  const handleUseModel = useCallback(
    (ref: { provider: ConstructChatProvider; modelId: string }) => {
      applyConstructChatModelSelection(ref);
      setModels((current) => ({ ...current, [ref.provider]: ref.modelId }));
    },
    [],
  );



  return (

    <div className="lc-model-panel" aria-label={t("construct.model.panelAria")}>

      <ConstructModelsManager

        models={models}

        ollamaInstalled={ollamaInstalled}

        onUseModel={handleUseModel}

      />



      <ConstructFreeApiKeysGuide />



      <div className="lc-model-panel__divider" role="separator" aria-hidden />



      <ConstructAgentImportSettingsSection />



      <ConstructAgentSkillsSection />



      <ConstructAgentCommandsSection />



      <ConstructAgentRulesSection />



      <ConstructAgentMemoriesSection />

    </div>

  );

}


