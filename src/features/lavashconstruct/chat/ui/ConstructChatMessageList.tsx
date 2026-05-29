import { useCallback, useEffect, useRef } from "react";
import { Copy, FileText, Paperclip, Pencil, Undo2 } from "lucide-react";
import LavashThinkingStatus from "@/features/lavashconstruct/chat/ui/LavashThinkingStatus";
import { ConstructChatRichContent } from "@/features/lavashconstruct/chat/ui/constructChatRichContent";
import { VirtualScrollList } from "@/shared/components/VirtualScrollList";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n/context";
import type {
  ChatAttachment,
  ChatMessage,
} from "@/features/lavashconstruct/chat/ui/constructChatPanelTypes";

const CHAT_ROW_ESTIMATE_PX = 112;
const VIRTUAL_SCROLL_THRESHOLD = 48;

export type EditingUserMessageState = {
  draft: string;
  attachments?: ChatAttachment[];
};

export type ConstructChatMessageListProps = {
  messages: ChatMessage[];
  isSending: boolean;
  activeTabId: string;
  thinkingSessionKey: number;
  editingUserMessage: EditingUserMessageState | null;
  setEditingUserMessage: React.Dispatch<React.SetStateAction<EditingUserMessageState | null>>;
  editMessageTextareaRef: React.RefObject<HTMLTextAreaElement | null>;
  onEditMessageKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  cancelEditUserMessage: () => void;
  submitEditedUserMessage: () => void;
  startEditUserMessage: (messageId: string) => void;
  revertChatToMessage: (messageId: string) => void;
  copyMessage: (text: string) => void;
};

export function ConstructChatMessageList({
  messages,
  isSending,
  activeTabId,
  thinkingSessionKey,
  editingUserMessage,
  setEditingUserMessage,
  editMessageTextareaRef,
  onEditMessageKeyDown,
  cancelEditUserMessage,
  submitEditedUserMessage,
  startEditUserMessage,
  revertChatToMessage,
  copyMessage,
}: ConstructChatMessageListProps) {
  const { t } = useI18n();
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, isSending, activeTabId, editingUserMessage]);

  const renderMessage = useCallback(
    (m: ChatMessage) => {
      const imageAtts = m.attachments?.filter((a): a is Extract<ChatAttachment, { kind: "image" }> => a.kind === "image");
      const otherAtts = m.attachments?.filter((a) => a.kind !== "image") ?? [];
      const canEditUser =
        m.role === "user" && !isSending && !editingUserMessage && m.text.trim().length > 0;
      return (
        <div className={`lc-chat-panel__row lc-chat-panel__row--enter lc-chat-panel__row--${m.role}`}>
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
            {m.streaming && !m.text.trim() ? (
              <LavashThinkingStatus
                sessionKey={thinkingSessionKey}
                className="lavash-thinking-status--in-bubble"
              />
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
            {m.role === "assistant" &&
            !m.streaming &&
            m.variant !== "error" &&
            m.revertSnapshot ? (
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
    },
    [
      copyMessage,
      editingUserMessage,
      isSending,
      revertChatToMessage,
      startEditUserMessage,
      t,
      thinkingSessionKey,
    ],
  );

  const footer = (
    <>
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
                setEditingUserMessage((prev) =>
                  prev ? { ...prev, draft: e.target.value } : prev,
                )
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
                disabled={!editingUserMessage.draft.trim() && !(editingUserMessage.attachments?.length)}
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
    </>
  );

  if (messages.length < VIRTUAL_SCROLL_THRESHOLD) {
    return (
      <div ref={scrollRef} className="lc-chat-panel__messages" role="log" aria-live="polite">
        {messages.map((m) => (
          <div key={m.id}>{renderMessage(m)}</div>
        ))}
        {footer}
      </div>
    );
  }

  return (
    <VirtualScrollList
      items={messages}
      estimateItemHeight={CHAT_ROW_ESTIMATE_PX}
      overscan={8}
      className="lc-chat-panel__messages"
      role="log"
      aria-live="polite"
      getItemKey={(m) => m.id}
      renderItem={(m) => renderMessage(m)}
      footer={footer}
      onScrollContainerRef={(el) => {
        scrollRef.current = el;
      }}
    />
  );
}
