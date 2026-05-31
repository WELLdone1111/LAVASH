import { useRef, useState } from "react";
import {
  ArrowUp,
  Bookmark,
  Bot,
  Bug,
  ChevronDown,
  ClipboardList,
  FileText,
  MessageCircleQuestion,
  Paperclip,
  Square,
  X,
} from "lucide-react";
import ConstructChatImprovePromptIcon from "@/features/lavashconstruct/chat/ui/ConstructChatImprovePromptIcon";
import type { ImprovePromptIconMode } from "@/features/lavashconstruct/chat/ui/ConstructChatImprovePromptIcon";
import {
  CONSTRUCT_CHAT_AGENT_MODES,
  CONSTRUCT_CHAT_AGENT_MODE_I18N,
  type ConstructChatAgentMode,
} from "@/features/lavashconstruct/chat/model/constructChatAgentMode";
import type { ConstructChatProvider } from "@/features/lavashconstruct/chat/model/constructChatProviders";
import type { ConstructChatPickerModelRef } from "@/features/lavashconstruct/chat/model/constructChatPickerModels";
import ConstructChatModelPickerButton from "@/features/lavashconstruct/chat/ui/ConstructChatModelPickerButton";
import { ComposerFloatingMenu, useComposerMenuDismiss } from "@/features/lavashconstruct/artboard/ui/composerFloatingMenu";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n/context";
import {
  COMPOSER_MIN_ROWS,
  MAX_PENDING_ATTACHMENTS,
  type ChatAttachment,
  type ConstructChatTab,
} from "@/features/lavashconstruct/chat/ui/constructChatPanelTypes";
import type { EditingUserMessageState } from "@/features/lavashconstruct/chat/ui/ConstructChatMessageList";

export type ConstructChatComposerProps = {
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  markedPanelId: string | null;
  markedPanelLiveTitle: string | null;
  removeMarkedPanel: () => void;
  pendingAttachments: ChatAttachment[];
  removePendingAttachment: (attId: string) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  draft: string;
  patchActiveTab: (patch: Partial<ConstructChatTab>) => void;
  isSending: boolean;
  editingUserMessage: EditingUserMessageState | null;
  onComposerKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onComposerPaste: (e: React.ClipboardEvent<HTMLTextAreaElement>) => void;
  onFileInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  agentMode: ConstructChatAgentMode;
  setAgentMode: (mode: ConstructChatAgentMode) => void;
  provider: ConstructChatProvider;
  activeTab: ConstructChatTab | null;
  ollamaInstalledNames: string[];
  selectChatPickerModel: (ref: ConstructChatPickerModelRef) => void;
  isImprovingPrompt: boolean;
  improvePromptBeforeDraft: string | null;
  improvePromptIconMode: ImprovePromptIconMode;
  handleImprovePromptClick: () => void;
  send: () => void | Promise<void>;
  stopGeneration: () => void;
};

function agentModeIcon(mode: ConstructChatAgentMode) {
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
}

export function ConstructChatComposer({
  fileInputRef,
  markedPanelId,
  markedPanelLiveTitle,
  removeMarkedPanel,
  pendingAttachments,
  removePendingAttachment,
  textareaRef,
  draft,
  patchActiveTab,
  isSending,
  editingUserMessage,
  onComposerKeyDown,
  onComposerPaste,
  onFileInputChange,
  agentMode,
  setAgentMode,
  provider,
  activeTab,
  ollamaInstalledNames,
  selectChatPickerModel,
  isImprovingPrompt,
  improvePromptBeforeDraft,
  improvePromptIconMode,
  handleImprovePromptClick,
  send,
  stopGeneration,
}: ConstructChatComposerProps) {
  const { t } = useI18n();
  const [agentMenuOpen, setAgentMenuOpen] = useState(false);
  const agentMenuRef = useRef<HTMLDivElement | null>(null);
  const agentMenuPortalRef = useRef<HTMLUListElement | null>(null);

  useComposerMenuDismiss(agentMenuRef, agentMenuOpen, () => setAgentMenuOpen(false), agentMenuPortalRef);

  return (
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
            className={cn(
              "lc-chat-panel__send",
              isSending && "lc-chat-panel__send--stop",
            )}
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
  );
}
