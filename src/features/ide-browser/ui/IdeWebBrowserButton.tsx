import { Globe } from "lucide-react";
import { useCallback, useEffect } from "react";
import { useI18n } from "@/i18n/context";
import { useIdeBrowserStore } from "@/features/ide-browser/model/ideBrowserStore";
import { cn } from "@/lib/utils";
import "./IdeWebBrowserButton.css";

type IdeWebBrowserButtonProps = {
  className?: string;
  variant?: "titlebar" | "rail";
};

export default function IdeWebBrowserButton({ className, variant = "titlebar" }: IdeWebBrowserButtonProps) {
  const { t } = useI18n();
  const openHome = useIdeBrowserStore((s) => s.openHome);
  const browserOpen = useIdeBrowserStore((s) => s.open);

  const onClick = useCallback(() => {
    openHome();
  }, [openHome]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const mod = event.ctrlKey || event.metaKey;
      if (mod && event.shiftKey && event.key.toLowerCase() === "l") {
        event.preventDefault();
        openHome();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [openHome]);

  const isRail = variant === "rail";
  const label = t("ideBrowser.openButton");
  const tooltip = isRail ? label : `${label} (${t("ideBrowser.openShortcut")})`;

  return (
    <button
      type="button"
      className={cn(
        isRail ? "lc-section-rail__btn" : "ide-web-browser-btn",
        browserOpen && (isRail ? "lc-section-rail__btn--active" : "ide-web-browser-btn--active"),
        className,
      )}
      aria-label={label}
      aria-pressed={browserOpen}
      data-tauri-drag-region={isRail ? undefined : "false"}
      title={isRail ? undefined : tooltip}
      data-tooltip={tooltip}
      onClick={onClick}
    >
      <Globe size={isRail ? 18 : 16} strokeWidth={1.75} aria-hidden />
    </button>
  );
}
