import { ChevronRight } from "lucide-react";
import { useState } from "react";
import { ConstructChatRichContent } from "@/features/lavashconstruct/chat/ui/constructChatRichContent";
import { thinkingPreviewLine } from "@/features/lavashconstruct/chat/model/constructChatStreamThink";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n/context";

type ConstructChatThinkingBlockProps = {
  thinking: string;
  /** Ще стрімиться reasoning (до основної відповіді). */
  active?: boolean;
  className?: string;
};

/** Згорнутий reasoning-блок (як у Cursor) — розгорнути за бажанням. */
export default function ConstructChatThinkingBlock({
  thinking,
  active = false,
  className,
}: ConstructChatThinkingBlockProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const trimmed = thinking.trim();
  if (!trimmed) return null;

  const label = active ? t("construct.chat.thinking") : t("construct.chat.thought");

  return (
    <div
      className={cn(
        "lc-chat-thinking-block",
        active && "lc-chat-thinking-block--active",
        open && "lc-chat-thinking-block--open",
        className,
      )}
    >
      <button
        type="button"
        className="lc-chat-thinking-block__toggle"
        aria-expanded={open}
        aria-label={open ? t("construct.chat.thinkingCollapse") : t("construct.chat.thinkingExpand")}
        onClick={() => setOpen((value) => !value)}
      >
        <ChevronRight
          size={14}
          strokeWidth={2.25}
          className="lc-chat-thinking-block__chevron"
          aria-hidden
        />
        <span className="lc-chat-thinking-block__label">{label}</span>
        {!open ? (
          <span className="lc-chat-thinking-block__preview">{thinkingPreviewLine(trimmed)}</span>
        ) : null}
      </button>
      {open ? (
        <div className="lc-chat-thinking-block__body">
          <ConstructChatRichContent text={trimmed} className="lc-chat-md lc-chat-md--thinking" />
        </div>
      ) : null}
    </div>
  );
}
