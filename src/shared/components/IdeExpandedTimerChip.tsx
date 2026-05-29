import { Timer } from "lucide-react";
import { useI18n } from "@/i18n/context";
import { formatElapsedClock } from "@/shared/lib/formatElapsedClock";
import { useIdeExpandedTimer } from "@/shared/lib/useIdeExpandedTimer";

type IdeExpandedTimerChipProps = {
  expanded?: boolean;
  className?: string;
};

export default function IdeExpandedTimerChip({ expanded = true, className }: IdeExpandedTimerChipProps) {
  const { t } = useI18n();
  const { elapsedMs, running } = useIdeExpandedTimer(expanded);
  const timeLabel = formatElapsedClock(elapsedMs);

  return (
    <div
      className={`lc-ide-timer${running ? "" : " lc-ide-timer--paused"}${className ? ` ${className}` : ""}`}
      title={t("status.ideExpandedHint", { time: timeLabel })}
      aria-label={t("status.ideExpandedAria", { time: timeLabel })}
      role="status"
    >
      <Timer size={12} strokeWidth={2} aria-hidden />
      <span className="lc-ide-timer__label">{t("status.ideExpandedShort")}</span>
      <time className="lc-ide-timer__value" dateTime={`PT${Math.floor(elapsedMs / 1000)}S`}>
        {timeLabel}
      </time>
    </div>
  );
}
