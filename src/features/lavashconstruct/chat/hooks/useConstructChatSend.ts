import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type KeyboardEvent as ReactKeyboardEvent,
  type RefObject,
  type SetStateAction,
} from "react";
import { invoke, isTauri } from "@tauri-apps/api/core";
import {
  parseConstructImageGenPrompt,
  shouldApplyAssistantOutput,
} from "@/features/lavashconstruct/chat/model/constructChatAgentMode";
import { generateConstructGeminiImage } from "@/features/lavashconstruct/chat/model/constructGeminiImage";
import {
  captureArtboardPanelImage,
  panelCaptureLabel,
  resolveCapturePanelId,
} from "@/features/lavashconstruct/artboard/model/captureArtboardPanel";
import { spawnArtboardImagePanel } from "@/features/lavashconstruct/artboard/model/spawnArtboardImagePanel";
import { formatConstructApplySyncNote } from "@/features/lavashconstruct/chat/model/constructAssistantApply";
import {
  buildLavashChatBubbleText,
  stripCodeFencesForChatDisplay,
} from "@/features/lavashconstruct/chat/model/constructAssistantDisplay";
import { createConstructStreamApplyController } from "@/features/lavashconstruct/chat/model/constructAssistantStreamApply";
import { translateOllamaEnReplyProseToUk } from "@/features/lavashconstruct/chat/model/constructChatOllamaBridge";
import { formatConstructChatErrorDetail } from "@/features/lavashconstruct/chat/model/formatConstructChatErrorDetail";
import { runConstructChatStream } from "@/features/lavashconstruct/chat/model/constructChatStreamClient";
import { ollamaModelDisplayLabel } from "@/features/lavashconstruct/chat/model/constructChatModelCatalog";
import { improvePrompt } from "@/features/lavashconstruct/chat/model/improvePrompt";
import type { ImprovePromptIconMode } from "@/features/lavashconstruct/chat/ui/ConstructChatImprovePromptIcon";
import type { ConstructChatThreadTurn } from "@/features/lavashconstruct/chat/model/constructChatThread";
import type { CueValidationResult } from "@/features/lavashconstruct/cue/model/cueTypes";
import {
  appendCueApplyLog,
  buildCuePlanApplyInstruction,
  buildCueTurn,
  extendApiThreadForCueRetry,
  formatCueValidationNote,
  resolveCueSendMode,
  shouldCueRetry,
} from "@/features/lavashconstruct/cue/model/cueEngine";
import { resolveModelForAttempt } from "@/features/lavashconstruct/engine/model/lavashEngine";
import { expandSlashCommandInDraft } from "@/features/lavashconstruct/settings/model/constructAgentContext";
import { useProjectWorkspaceStore } from "@/features/lavashconstruct/project/model/projectWorkspaceStore";
import {
  captureConstructChatRevertSnapshot,
  findRevertSnapshotAfterMessageIndex,
  restoreConstructChatRevertSnapshot,
} from "@/features/lavashconstruct/chat/model/constructChatRevertSnapshot";
import {
  appendSlimExchange,
  buildApiThreadForSend,
  ensureThreadFromTab,
  rebuildThreadFromUiMessages,
  slimThreadForProvider,
} from "@/features/lavashconstruct/chat/model/constructChatThread";
import { useConstructCodeScratchStore } from "@/features/lavashconstruct/editor/model/codeScratchStore";
import { useConstructStore } from "@/features/lavashconstruct/artboard/model/store";
import {
  getTabModelExplicit,
  readConstructChatApiKey,
  readConstructChatModel,
} from "@/features/lavashconstruct/chat/model/constructChatSettings";
import {
  getConstructProviderDef,
  providerShortLabel,
} from "@/features/lavashconstruct/chat/model/constructChatProviders";
import { useAppStatusStore } from "@/features/status/model/appStatusStore";
import { useI18n } from "@/i18n/context";
import {
  CONSTRUCT_CHAT_FOCUS_INPUT_EVENT,
  CONSTRUCT_CAPTURE_PANEL_TO_CHAT_EVENT,
  CONSTRUCT_REGENERATE_PANEL_EVENT,
  dispatchConstructChatFocusInput,
  type ConstructCapturePanelDetail,
} from "@/features/lavashconstruct/workspace/model/constructMarkBus";
import {
  formatInvokeErr,
  looksLikeRussian,
  looksLikeUkrainian,
  tauriIpcReady,
  useAutosizeTextarea,
  type ChatAttachment,
  type ChatMessage,
  type ConstructChatTab,
} from "@/features/lavashconstruct/chat/ui/constructChatPanelTypes";

export type UseConstructChatSendParams = {
  setTabs: Dispatch<SetStateAction<ConstructChatTab[]>>;
  tabsRef: RefObject<ConstructChatTab[]>;
  activeTabIdRef: RefObject<string>;
  activeTabId: string;
  draft: string;
  ollamaInstalledRef: RefObject<string[]>;
  patchTab: (id: string, patch: Partial<ConstructChatTab>) => void;
  patchActiveTab: (patch: Partial<ConstructChatTab>) => void;
  attachPanelCaptureToChat: (panelId: string) => Promise<boolean>;
};

export function useConstructChatSend({
  setTabs,
  tabsRef,
  activeTabIdRef,
  activeTabId,
  draft,
  ollamaInstalledRef,
  patchTab,
  patchActiveTab,
  attachPanelCaptureToChat,
}: UseConstructChatSendParams) {
  const { t } = useI18n();

  const [isSending, setIsSending] = useState(false);
  const [isImprovingPrompt, setIsImprovingPrompt] = useState(false);
  const [improvePromptBeforeDraft, setImprovePromptBeforeDraft] = useState<string | null>(null);
  const [isImprovePromptReverting, setIsImprovePromptReverting] = useState(false);
  const [editingUserMessage, setEditingUserMessage] = useState<{
    draft: string;
    attachments?: ChatAttachment[];
  } | null>(null);
  const [thinkingSessionKey, setThinkingSessionKey] = useState(0);
  const textareaRef = useAutosizeTextarea(draft);
  const editMessageTextareaRef = useAutosizeTextarea(editingUserMessage?.draft ?? "");

  const sendAbortRef = useRef<AbortController | null>(null);
  const abortIntentRef = useRef<"stop" | "pause-edit" | "timeout" | null>(null);
  const mountedRef = useRef(true);
  const streamMsgIdRef = useRef<string | null>(null);
  const pauseRestoreRef = useRef<{
    tabId: string;
    draft: string;
    attachments: ChatAttachment[];
    userMsgId: string;
  } | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      sendAbortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    const onFocusInput = () => {
      window.requestAnimationFrame(() => textareaRef.current?.focus());
    };
    window.addEventListener(CONSTRUCT_CHAT_FOCUS_INPUT_EVENT, onFocusInput);
    return () => window.removeEventListener(CONSTRUCT_CHAT_FOCUS_INPUT_EVENT, onFocusInput);
  }, [textareaRef]);

  useEffect(() => {
    setEditingUserMessage(null);
    setImprovePromptBeforeDraft(null);
    setIsImprovePromptReverting(false);
  }, [activeTabId]);

  useEffect(() => {
    if (!editingUserMessage) return;
    const id = window.requestAnimationFrame(() => editMessageTextareaRef.current?.focus());
    return () => window.cancelAnimationFrame(id);
  }, [editingUserMessage, editMessageTextareaRef]);

  const finalizeAbortedSend = useCallback(
    (tabId: string, streamMsgId: string | null) => {
      const intent = abortIntentRef.current ?? "stop";
      abortIntentRef.current = null;

      if (intent === "pause-edit") {
        const restore = pauseRestoreRef.current;
        const assistantId = streamMsgIdRef.current ?? streamMsgId;
        if (restore) {
          const { tabId: restoreTabId, draft: savedDraft, attachments, userMsgId } = restore;
          setTabs((prev) =>
            prev.map((x) => {
              if (x.id !== restoreTabId) return x;
              return {
                ...x,
                draft: savedDraft,
                pendingAttachments: attachments.map((a) => ({ ...a })),
                messages: x.messages.filter((m) => m.id !== userMsgId && m.id !== assistantId),
              };
            }),
          );
        }
        window.requestAnimationFrame(() => textareaRef.current?.focus());
        return;
      }

      const msgId = streamMsgIdRef.current ?? streamMsgId;
      if (!msgId) return;

      setTabs((prev) =>
        prev.map((x) => {
          if (x.id !== tabId) return x;
          const msg = x.messages.find((m) => m.id === msgId);
          if (!msg || msg.role !== "assistant") return x;
          const text = msg.text.trim();
          if (text.length === 0) {
            return { ...x, messages: x.messages.filter((m) => m.id !== msgId) };
          }
          return {
            ...x,
            messages: x.messages.map((m) =>
              m.id === msgId ? { ...m, streaming: undefined } : m,
            ),
          };
        }),
      );
    },
    [setTabs, textareaRef],
  );

  const stopGeneration = useCallback(() => {
    if (!isSending) return;
    abortIntentRef.current = "stop";
    sendAbortRef.current?.abort();
  }, [isSending]);

  const pauseAndEdit = useCallback(() => {
    if (!isSending) return;
    abortIntentRef.current = "pause-edit";
    sendAbortRef.current?.abort();
  }, [isSending]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || !isSending) return;
      event.preventDefault();
      stopGeneration();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isSending, stopGeneration]);

  const sendRef = useRef<(override?: { text: string; attachments?: ChatAttachment[] }) => Promise<void>>(
    async () => {},
  );

  const send = useCallback(
    async (override?: { text: string; attachments?: ChatAttachment[] }) => {
      const tabId = activeTabIdRef.current;
      const tab = tabsRef.current.find((x) => x.id === tabId);
      if (!tab || isSending) return;

      const text = (override?.text ?? tab.draft).trim();
      const snapshot = override?.attachments ? [...override.attachments] : [...tab.pendingAttachments];
      if (!text && snapshot.length === 0) return;

      setImprovePromptBeforeDraft(null);
      setIsImprovePromptReverting(false);

      const { provider } = tab;
      const modelLabel = getTabModelExplicit(tab, provider);
      if (!modelLabel) {
        setTabs((prev) =>
          prev.map((x) =>
            x.id === tabId
              ? {
                  ...x,
                  messages: [
                    ...x.messages,
                    {
                      id: `a-${crypto.randomUUID().slice(0, 12)}`,
                      role: "assistant" as const,
                      variant: "error" as const,
                      text: t("construct.chat.noModelSelected"),
                    },
                  ],
                }
              : x,
          ),
        );
        return;
      }

      const tabAgentMode = tab.agentMode ?? "agent";
      const cueSend = resolveCueSendMode(tabAgentMode, text);
      let mode = cueSend.mode;
      const applyEnabled = shouldApplyAssistantOutput(mode);
      const textForModel = cueSend.userText;

      const imageGenPrompt = parseConstructImageGenPrompt(text);
      if (imageGenPrompt) {
        setIsSending(true);
        useAppStatusStore.getState().setConstructChatSending(true, "Gemini Image");
        try {
          const generated = await generateConstructGeminiImage(imageGenPrompt);
          const { selectedPanelId } = useConstructStore.getState();
          const panel = spawnArtboardImagePanel({
            title: imageGenPrompt.slice(0, 48),
            dataUrl: generated.dataUrl,
            mimeType: generated.mimeType,
            nearPanelId: tab.markedPanelId ?? selectedPanelId,
          });
          patchTab(tabId, { draft: "", pendingAttachments: [] });
          const userMsg: ChatMessage = {
            id: `u-${crypto.randomUUID().slice(0, 12)}`,
            role: "user",
            text,
          };
          const assistantMsg: ChatMessage = {
            id: `a-${crypto.randomUUID().slice(0, 12)}`,
            role: "assistant",
            text: t("construct.chat.imageGenDone", { title: panel.title }),
          };
          setTabs((prev) =>
            prev.map((x) =>
              x.id === tabId ? { ...x, messages: [...x.messages, userMsg, assistantMsg], draft: "" } : x,
            ),
          );
        } catch (e) {
          const errMsg: ChatMessage = {
            id: `a-${crypto.randomUUID().slice(0, 12)}`,
            role: "assistant",
            variant: "error",
            text: t("construct.chat.imageGenError", { detail: formatInvokeErr(e) }),
          };
          setTabs((prev) =>
            prev.map((x) => (x.id === tabId ? { ...x, messages: [...x.messages, errMsg] } : x)),
          );
        } finally {
          setIsSending(false);
          useAppStatusStore.getState().setConstructChatSending(false);
        }
        return;
      }

      const { messages: tabMessages, title: tabTitle } = tab;
      const def = getConstructProviderDef(provider);

      if (provider === "ollama" && isTauri()) {
        const installed = ollamaInstalledRef.current;
        if (installed.length > 0 && !installed.includes(modelLabel)) {
          const errModelLabel = ollamaModelDisplayLabel(modelLabel);
          setTabs((prev) =>
            prev.map((x) =>
              x.id === tabId
                ? {
                    ...x,
                    messages: [
                      ...x.messages,
                      {
                        id: `a-${crypto.randomUUID().slice(0, 12)}`,
                        role: "assistant" as const,
                        variant: "error" as const,
                        text: t("construct.chat.errorReply", {
                          provider: providerShortLabel(provider),
                          model: errModelLabel,
                          detail: t("construct.chat.error.ollamaModelNotFound", { model: errModelLabel }),
                        }),
                      },
                    ],
                  }
                : x,
            ),
          );
          return;
        }
      }

      const attachmentsForUi = snapshot.map((a) => ({ ...a }));
      const imagesForApi = snapshot
        .filter((a): a is Extract<ChatAttachment, { kind: "image" }> => a.kind === "image")
        .map((a) => ({ mimeType: a.mimeType, data: a.base64 }));

      let augmentedForModel = textForModel.trim();
      for (const a of snapshot) {
        if (a.kind === "text") {
          augmentedForModel += `\n\n— ${a.name} —\n${a.text}`;
        } else if (a.kind === "file") {
          augmentedForModel += `\n\n[${t("construct.chat.attachedFile")}: ${a.name} (${a.size} B)]`;
        }
      }
      if (!augmentedForModel.trim() && imagesForApi.length > 0) {
        augmentedForModel = ".";
      }

      const projectRoot = useProjectWorkspaceStore.getState().projectRoot;
      augmentedForModel = expandSlashCommandInDraft(augmentedForModel, projectRoot);

      const userMsg: ChatMessage = {
        id: `u-${crypto.randomUUID().slice(0, 12)}`,
        role: "user",
        text,
        attachments: attachmentsForUi.length ? attachmentsForUi : undefined,
      };

      const draftBackup = tab.draft;
      const nextTitle =
        tabTitle.trim().length > 0 ? tabTitle : text.slice(0, 34).replace(/\s+/g, " ").trim() || tabTitle;

      const historyWithUser = [...tabMessages, userMsg];
      patchTab(tabId, {
        messages: historyWithUser,
        draft: "",
        pendingAttachments: [],
        ...(tabTitle.trim().length === 0 && nextTitle.trim().length > 0 ? { title: nextTitle } : {}),
      });

      setThinkingSessionKey((k) => k + 1);
      setIsSending(true);

      pauseRestoreRef.current = {
        tabId,
        draft: text,
        attachments: snapshot,
        userMsgId: userMsg.id,
      };
      streamMsgIdRef.current = null;
      const abortController = new AbortController();
      sendAbortRef.current = abortController;
      const streamTimeoutMs = 120_000;
      const streamTimeoutId = window.setTimeout(() => {
        abortIntentRef.current = "timeout";
        abortController.abort();
      }, streamTimeoutMs);

      const userSignedIn = true;

      useAppStatusStore
        .getState()
        .setConstructChatSending(true, `${providerShortLabel(provider)} · ${modelLabel}`);

      const pushAssistant = (msg: ChatMessage) => {
        setTabs((prev) =>
          prev.map((x) => (x.id === tabId ? { ...x, messages: [...x.messages, msg] } : x)),
        );
      };

      const replaceLastMessage = (msg: ChatMessage) => {
        setTabs((prev) =>
          prev.map((x) => {
            if (x.id !== tabId) return x;
            const m = x.messages;
            return { ...x, messages: [...m.slice(0, -1), msg] };
          }),
        );
      };

      let streamMsgId: string | null = null;

      try {
        if (!isTauri() || !tauriIpcReady()) {
          patchTab(tabId, { draft: draftBackup, pendingAttachments: snapshot });
          replaceLastMessage({
            id: `a-${crypto.randomUUID().slice(0, 12)}`,
            role: "assistant",
            text: t("construct.chat.desktopOnly"),
          });
          return;
        }

        const apiKey = readConstructChatApiKey(provider).trim();
        if (def.needsApiKey && !apiKey) {
          patchTab(tabId, { draft: draftBackup, pendingAttachments: snapshot });
          replaceLastMessage({
            id: `a-${crypto.randomUUID().slice(0, 12)}`,
            role: "assistant",
            text: t("construct.chat.apiKeyHint", {
              provider: def.label,
              url: def.signupUrl ?? "",
            }),
          });
          return;
        }

        const priorSlim = slimThreadForProvider(ensureThreadFromTab(tab), provider);
        const userWroteUkrainian = looksLikeUkrainian(text) && !looksLikeRussian(text);
        const useOllamaUkBridge = provider === "ollama" && userWroteUkrainian;

        const { selectedPanelId, artboardPanels: panels } = useConstructStore.getState();
        const scratchState = useConstructCodeScratchStore.getState();
        const tabMarkedPanelId = tabsRef.current.find((x) => x.id === tabId)?.markedPanelId ?? null;
        const focusPanelId = tabMarkedPanelId ?? selectedPanelId;
        const preferScratchTabId =
          focusPanelId != null
            ? panels.find((p) => p.id === focusPanelId)?.linkedScratchTabId?.trim() || undefined
            : undefined;
        const linkScratchTabId = preferScratchTabId ?? scratchState.activeTabId;

        const { constructSnapshot, capability } = await buildCueTurn({
          mode,
          projectRoot,
          constructContext: {
            scratchTabs: scratchState.tabs,
            activeScratchTabId: scratchState.activeTabId,
            artboardPanels: panels,
            selectedPanelId,
            markedPanelId: tabMarkedPanelId,
          },
          provider,
          modelId: modelLabel.trim(),
          planApplyInstruction: buildCuePlanApplyInstruction(cueSend.forcedApply, tabAgentMode),
        });

        let userBody = augmentedForModel.trim();
        if (!userBody && imagesForApi.length > 0) {
          userBody = ".";
        }
        if (useOllamaUkBridge && userBody) {
          userBody = (
            await invoke<string>("ollama_translate", {
              text: userBody,
              sourceLang: "uk",
              targetLang: "en",
              model: modelLabel.trim() || null,
            })
          ).trim();
          if (!userBody) userBody = ".";
        }

        if (!userBody.trim() && imagesForApi.length > 0) {
          userBody = ".";
        }

        let apiThread: ConstructChatThreadTurn[] = buildApiThreadForSend({
          priorSlim,
          constructSnapshot,
          userBody,
          images: imagesForApi.length > 0 ? imagesForApi : undefined,
          provider,
        });

        const replyInEnglish = useOllamaUkBridge;
        const preferUkrainian = !useOllamaUkBridge && userWroteUkrainian;

        const toMsgPayload = (thread: readonly ConstructChatThreadTurn[]) =>
          thread.map((m) => ({
            role: m.role,
            content: m.content,
            ...(m.images?.length ? { images: m.images } : {}),
          }));

        streamMsgId = `a-${crypto.randomUUID().slice(0, 12)}`;
        streamMsgIdRef.current = streamMsgId;
        const preApplySnapshot = captureConstructChatRevertSnapshot();
        pushAssistant({
          id: streamMsgId,
          role: "assistant",
          text: "",
          streaming: true,
          revertSnapshot: preApplySnapshot,
        });

        const streamApplyLabels = {
          code: t("construct.chat.applyNote.code"),
          artboard: t("construct.chat.applyNote.artboard"),
          panel: t("construct.chat.applyNote.panel"),
          onlyApply: t("construct.chat.applyNote.onlyApply"),
        };

        let lastApplySummary = {
          codeFencesApplied: 0,
          artboardApplied: false,
          constructPanelsSpawned: 0,
          cueActionsApplied: 0,
        };

        let trimmedEn = "";
        let applySummary = lastApplySummary;
        let finalValidation: CueValidationResult = { ok: true, issues: [] };
        let attemptIndex = 0;

        while (true) {
          const applyCtl = createConstructStreamApplyController({
            preferScratchTabId,
            linkConstructPanelToScratchTabId: linkScratchTabId,
            applyEnabled,
            mode,
            artboardPanelIds: panels.map((p) => p.id),
          });

          const updateStreamingBubble = (buffer: string) => {
            if (!streamMsgId) return;
            const prose = stripCodeFencesForChatDisplay(buffer).trim();
            const bubbleText = buildLavashChatBubbleText({
              modelMarkdown: prose || buffer,
              summary: lastApplySummary,
              labels: streamApplyLabels,
              emptyFallback: "",
            });
            replaceLastMessage({
              id: streamMsgId,
              role: "assistant",
              text: bubbleText,
              streaming: true,
              revertSnapshot: preApplySnapshot,
            });
          };

          const streamModel = resolveModelForAttempt({
            provider,
            primaryModel: modelLabel.trim(),
            attemptIndex,
          });

          const streamId = crypto.randomUUID();
          const replyEn = await runConstructChatStream({
            streamId,
            provider,
            apiKey,
            model: streamModel,
            baseUrl: def.baseUrl,
            httpReferer: provider === "openrouter" ? "https://github.com/WELLdone1111/LAVASH" : null,
            messages: toMsgPayload(apiThread),
            replyInEnglish,
            preferUkrainian,
            userSignedIn,
            modelOverride: provider === "ollama" ? streamModel || null : null,
            signal: abortController.signal,
            onDelta: (_delta, full) => {
              applyCtl.pushChunk(full);
              lastApplySummary = applyCtl.getLastSummary();
              updateStreamingBubble(full);
            },
          });

          trimmedEn = replyEn.trim();
          applySummary = applyCtl.flush();
          lastApplySummary = applySummary;
          const validation = applyCtl.getLastValidation();
          finalValidation = validation;

          const retry = shouldCueRetry({
            mode,
            applyEnabled,
            validation,
            summary: applySummary,
            attemptIndex,
            maxRetries: capability.maxApplyRetries,
          });

          if (!retry) break;

          restoreConstructChatRevertSnapshot(preApplySnapshot);
          const failedAssistant =
            trimmedEn +
            formatConstructApplySyncNote(applySummary) +
            formatCueValidationNote(validation);
          apiThread = extendApiThreadForCueRetry(apiThread, failedAssistant, validation);
          attemptIndex += 1;
        }

        if (applyEnabled) {
          appendCueApplyLog({
            provider,
            mode,
            attempts: attemptIndex + 1,
            applied:
              applySummary.artboardApplied ||
              applySummary.constructPanelsSpawned > 0 ||
              applySummary.codeFencesApplied > 0 ||
              applySummary.cueActionsApplied > 0,
            validationOk: finalValidation.ok,
            issueCodes: finalValidation.issues.map((i) => i.code),
            summary: applySummary,
            userText: textForModel,
            assistantText: trimmedEn,
          });
        }

        const syncNote =
          formatConstructApplySyncNote(applySummary) + formatCueValidationNote(finalValidation);
        const ollamaThreadNext = appendSlimExchange(priorSlim, userBody, trimmedEn + syncNote);

        let displayReply = stripCodeFencesForChatDisplay(trimmedEn).trim();
        if (useOllamaUkBridge && trimmedEn.length > 0) {
          displayReply = await translateOllamaEnReplyProseToUk(
            trimmedEn,
            modelLabel.trim() || null,
            looksLikeUkrainian,
          );
        } else if (!displayReply && trimmedEn.length > 0) {
          displayReply = trimmedEn;
        }

        const bubbleText = buildLavashChatBubbleText({
          modelMarkdown: displayReply,
          summary: applySummary,
          labels: {
            code: t("construct.chat.applyNote.code"),
            artboard: t("construct.chat.applyNote.artboard"),
            panel: t("construct.chat.applyNote.panel"),
            onlyApply: t("construct.chat.applyNote.onlyApply"),
          },
          emptyFallback: t("construct.chat.emptyReply"),
        });

        setTabs((prev) =>
          prev.map((x) =>
            x.id === tabId
              ? {
                  ...x,
                  messages: x.messages.map((m) =>
                    m.id === streamMsgId ? { ...m, text: bubbleText, streaming: undefined } : m,
                  ),
                  ollamaThread: ollamaThreadNext,
                }
              : x,
          ),
        );
      } catch (e) {
        if (e instanceof Error && e.message === "aborted") {
          finalizeAbortedSend(tabId, streamMsgId);
          return;
        }
        patchTab(tabId, { draft: draftBackup, pendingAttachments: snapshot });
        const detail = formatConstructChatErrorDetail(formatInvokeErr(e), t);
        const errModelLabel =
          provider === "ollama" ? ollamaModelDisplayLabel(modelLabel) : modelLabel;
        const errMsg: ChatMessage = {
          id: streamMsgId ?? `a-${crypto.randomUUID().slice(0, 12)}`,
          role: "assistant",
          variant: "error",
          text: t("construct.chat.errorReply", {
            provider: providerShortLabel(provider),
            model: errModelLabel,
            detail,
          }),
        };
        if (streamMsgId) replaceLastMessage(errMsg);
        else pushAssistant(errMsg);
      } finally {
        window.clearTimeout(streamTimeoutId);
        pauseRestoreRef.current = null;
        streamMsgIdRef.current = null;
        sendAbortRef.current = null;
        if (mountedRef.current) {
          setIsSending(false);
          useAppStatusStore.getState().setConstructChatSending(false);
        }
      }
    },
    [isSending, t, patchTab, setTabs, tabsRef, activeTabIdRef, ollamaInstalledRef, finalizeAbortedSend],
  );

  sendRef.current = send;

  useEffect(() => {
    const onCapture = (event: Event) => {
      const detail = (event as CustomEvent<ConstructCapturePanelDetail>).detail;
      const { selectedPanelId } = useConstructStore.getState();
      const tab = tabsRef.current.find((x) => x.id === activeTabIdRef.current);
      const panelId = resolveCapturePanelId(detail?.panelId, tab?.markedPanelId ?? null, selectedPanelId);
      if (!panelId) return;
      void attachPanelCaptureToChat(panelId).then((ok) => {
        if (ok) dispatchConstructChatFocusInput();
      });
    };
    window.addEventListener(CONSTRUCT_CAPTURE_PANEL_TO_CHAT_EVENT, onCapture);
    return () => window.removeEventListener(CONSTRUCT_CAPTURE_PANEL_TO_CHAT_EVENT, onCapture);
  }, [attachPanelCaptureToChat, tabsRef, activeTabIdRef]);

  useEffect(() => {
    const onRegenerate = () => {
      if (isSending) return;
      const { selectedPanelId, artboardPanels } = useConstructStore.getState();
      const tab = tabsRef.current.find((x) => x.id === activeTabIdRef.current);
      const panelId = resolveCapturePanelId(undefined, tab?.markedPanelId ?? null, selectedPanelId);
      if (!panelId) return;
      const panel = artboardPanels.find((p) => p.id === panelId);
      void (async () => {
        const captured = await captureArtboardPanelImage(panelId);
        const attachments: ChatAttachment[] = captured
          ? [
              {
                ...captured,
                id: `cap-${crypto.randomUUID().slice(0, 10)}`,
              },
            ]
          : [];
        await sendRef.current({
          text: t("construct.chat.regeneratePrompt", {
            title: panel ? panelCaptureLabel(panel) : panelId,
          }),
          attachments,
        });
      })();
    };
    window.addEventListener(CONSTRUCT_REGENERATE_PANEL_EVENT, onRegenerate);
    return () => window.removeEventListener(CONSTRUCT_REGENERATE_PANEL_EVENT, onRegenerate);
  }, [isSending, t, tabsRef, activeTabIdRef]);

  const copyMessage = useCallback((text: string) => {
    void navigator.clipboard.writeText(text);
  }, []);

  const revertChatToMessage = useCallback(
    (messageId: string) => {
      if (isSending) return;
      setEditingUserMessage(null);
      const tabId = activeTabIdRef.current;
      setTabs((prev) =>
        prev.map((tab) => {
          if (tab.id !== tabId) return tab;
          const idx = tab.messages.findIndex((m) => m.id === messageId);
          if (idx < 0) return tab;
          const target = tab.messages[idx];
          if (
            target.role !== "assistant" ||
            target.variant === "error" ||
            target.streaming ||
            !target.revertSnapshot
          ) {
            return tab;
          }
          restoreConstructChatRevertSnapshot(target.revertSnapshot);
          const nextMessages = tab.messages.slice(0, idx);
          return {
            ...tab,
            messages: nextMessages,
            ollamaThread: rebuildThreadFromUiMessages(nextMessages),
          };
        }),
      );
    },
    [isSending, setTabs, activeTabIdRef],
  );

  const startEditUserMessage = useCallback(
    (messageId: string) => {
      if (isSending || editingUserMessage) return;
      const tabId = activeTabIdRef.current;
      const tab = tabsRef.current.find((x) => x.id === tabId);
      if (!tab) return;
      const idx = tab.messages.findIndex((m) => m.id === messageId);
      if (idx < 0) return;
      const target = tab.messages[idx];
      if (target.role !== "user") return;

      const revertSnapshot = findRevertSnapshotAfterMessageIndex(tab.messages, idx);
      if (revertSnapshot) {
        restoreConstructChatRevertSnapshot(revertSnapshot);
      }

      const nextMessages = tab.messages.slice(0, idx);
      setEditingUserMessage({
        draft: target.text,
        attachments: target.attachments?.map((a) => ({ ...a })),
      });
      setTabs((prev) =>
        prev.map((tabRow) =>
          tabRow.id === tabId
            ? {
                ...tabRow,
                messages: nextMessages,
                ollamaThread: rebuildThreadFromUiMessages(nextMessages),
              }
            : tabRow,
        ),
      );
    },
    [editingUserMessage, isSending, setTabs, tabsRef, activeTabIdRef],
  );

  const cancelEditUserMessage = useCallback(() => {
    setEditingUserMessage(null);
  }, []);

  const submitEditedUserMessage = useCallback(() => {
    if (!editingUserMessage || isSending) return;
    const text = editingUserMessage.draft.trim();
    const attachments = editingUserMessage.attachments ?? [];
    if (!text && attachments.length === 0) return;
    const payload = { text, attachments: attachments.length > 0 ? attachments : undefined };
    setEditingUserMessage(null);
    void send(payload);
  }, [editingUserMessage, isSending, send]);

  const onEditMessageKeyDown = useCallback(
    (e: ReactKeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Escape") {
        e.preventDefault();
        cancelEditUserMessage();
        return;
      }
      if (e.key !== "Enter" || e.shiftKey || e.nativeEvent.isComposing) return;
      e.preventDefault();
      submitEditedUserMessage();
    },
    [cancelEditUserMessage, submitEditedUserMessage],
  );

  const improvePromptIconMode: ImprovePromptIconMode = isImprovingPrompt
    ? "improving"
    : isImprovePromptReverting
      ? "reverting"
      : improvePromptBeforeDraft !== null
        ? "undo"
        : "idle";

  const handleImprovePromptClick = useCallback(() => {
    if (isImprovingPrompt || isSending) return;

    if (improvePromptBeforeDraft !== null) {
      setIsImprovePromptReverting(true);
      patchActiveTab({ draft: improvePromptBeforeDraft });
      setImprovePromptBeforeDraft(null);
      window.setTimeout(() => setIsImprovePromptReverting(false), 380);
      return;
    }

    void (async () => {
      const current = tabsRef.current.find((x) => x.id === activeTabIdRef.current);
      const text = current?.draft?.trim();
      if (!text) return;

      setIsImprovingPrompt(true);
      try {
        const improved = await improvePrompt(text, {
          provider: current!.provider,
          model:
            getTabModelExplicit(current!, current!.provider) ?? readConstructChatModel(current!.provider),
        });
        setImprovePromptBeforeDraft(text);
        patchActiveTab({ draft: improved });
      } catch (error) {
        console.warn("[chat] improve prompt failed", error);
      } finally {
        setIsImprovingPrompt(false);
      }
    })();
  }, [
    activeTabIdRef,
    improvePromptBeforeDraft,
    isImprovingPrompt,
    isSending,
    patchActiveTab,
    tabsRef,
  ]);

  const onComposerKeyDown = useCallback(
    (e: ReactKeyboardEvent<HTMLTextAreaElement>) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "i") {
        e.preventDefault();
        handleImprovePromptClick();
        return;
      }
      if (e.key !== "Enter") return;
      if (e.shiftKey) return;
      if (e.nativeEvent.isComposing) return;
      if (isSending || editingUserMessage) return;
      e.preventDefault();
      void send();
    },
    [editingUserMessage, handleImprovePromptClick, isSending, send],
  );

  return {
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
    pauseAndEdit,
    send,
    copyMessage,
    revertChatToMessage,
    startEditUserMessage,
    cancelEditUserMessage,
    submitEditedUserMessage,
    onEditMessageKeyDown,
    onComposerKeyDown,
  };
}
