import { useEffect, useMemo, useState } from "react";
import { useI18n } from "@/i18n/context";
import { cn } from "@/lib/utils";
import {
  LAVASH_THINKING_PIPE_FRAMES,
  pickRandomThinkingPhrase,
} from "@/features/lavashconstruct/chat/model/constructChatThinkingStatus";

type Props = {
  className?: string;
  /** Зміни значення — нова випадкова фраза (новий запит). */
  sessionKey?: string | number;
};

export default function LavashThinkingStatus({ className, sessionKey }: Props) {
  const { locale } = useI18n();
  const phrase = useMemo(
    () => pickRandomThinkingPhrase(locale),
    [locale, sessionKey],
  );

  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setFrame((f) => (f + 1) % LAVASH_THINKING_PIPE_FRAMES.length);
    }, 110);
    return () => window.clearInterval(id);
  }, []);

  const pipes = LAVASH_THINKING_PIPE_FRAMES[frame];

  return (
    <span
      className={cn("lavash-thinking-status", className)}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="lavash-thinking-status__phrase">{phrase}</span>
      <span className="lavash-thinking-status__pipes" aria-hidden>
        {pipes}
      </span>
    </span>
  );
}
