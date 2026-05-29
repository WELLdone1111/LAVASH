import { Globe } from "lucide-react";
import { useCallback, useEffect } from "react";
import { useI18n } from "@/i18n/context";
import { useIdeBrowserStore } from "@/features/ide-browser/model/ideBrowserStore";
import { cn } from "@/lib/utils";
import "./IdeWebBrowserButton.css";

type IdeWebBrowserButtonProps = {
  className?: string;
};

export default function IdeWebBrowserButton({ className }: IdeWebBrowserButtonProps) {
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

  return (
    <button
      type="button"
      className={cn("ide-web-browser-btn", browserOpen && "ide-web-browser-btn--active", className)}
      aria-label={t("ideBrowser.openButton")}
      aria-pressed={browserOpen}
      data-tauri-drag-region="false"
      title={`${t("ideBrowser.openButton")} (${t("ideBrowser.openShortcut")})`}
      data-tooltip={`${t("ideBrowser.openButton")} · ${t("ideBrowser.openShortcut")}`}
      onClick={onClick}
    >
      <Globe size={16} strokeWidth={1.75} aria-hidden />
    </button>
  );
}
