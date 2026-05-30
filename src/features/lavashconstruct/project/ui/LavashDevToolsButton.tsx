import { GitBranch, TerminalSquare } from "lucide-react";
import { useCallback } from "react";
import { isTauri } from "@tauri-apps/api/core";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n/context";

type LavashDevToolsButtonProps = {
  active?: boolean;
  onToggle: () => void;
  className?: string;
};

export default function LavashDevToolsButton({ active = false, onToggle, className }: LavashDevToolsButtonProps) {
  const { t } = useI18n();

  const onClick = useCallback(() => {
    onToggle();
  }, [onToggle]);

  return (
    <button
      type="button"
      className={cn("lc-resources-btn lc-devtools-btn", active && "lc-devtools-btn--active", className)}
      onClick={onClick}
      aria-label={t("devTools.open")}
      aria-pressed={active}
      title={t("devTools.openHint")}
      disabled={!isTauri()}
    >
      <span className="lc-devtools-btn__icons" aria-hidden>
        <TerminalSquare size={12} strokeWidth={2} />
        <GitBranch size={11} strokeWidth={2} />
      </span>
    </button>
  );
}
