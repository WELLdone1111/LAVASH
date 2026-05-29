import { History } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { getIdeBrowserHistoryEntries } from "@/features/ide-browser/model/ideBrowserTab";
import {
  selectActiveIdeBrowserTab,
  useIdeBrowserStore,
} from "@/features/ide-browser/model/ideBrowserStore";
import { useI18n } from "@/i18n/context";
import "./IdeBrowserHistoryMenu.css";

export default function IdeBrowserHistoryMenu() {
  const { t } = useI18n();
  const activeTab = useIdeBrowserStore(selectActiveIdeBrowserTab);
  const goToHistory = useIdeBrowserStore((s) => s.goToHistory);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const defaultLabel = t("ideBrowser.tabDefault");
  const entries = activeTab ? getIdeBrowserHistoryEntries(activeTab, defaultLabel) : [];
  const hasHistory = entries.length > 0;

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="lc-ide-browser__history">
      <button
        type="button"
        className={`lc-ide-browser__icon-btn${open ? " lc-ide-browser__icon-btn--active" : ""}`}
        aria-label={t("ideBrowser.history")}
        aria-expanded={open}
        aria-haspopup="menu"
        disabled={!hasHistory}
        onClick={() => setOpen((value) => !value)}
      >
        <History size={14} strokeWidth={1.75} aria-hidden />
      </button>
      {open && hasHistory ? (
        <div className="lc-ide-browser__history-menu" role="menu" aria-label={t("ideBrowser.history")}>
          {[...entries].reverse().map((entry) => (
            <button
              key={`${entry.index}-${entry.url}`}
              type="button"
              role="menuitem"
              className={`lc-ide-browser__history-item${entry.isCurrent ? " lc-ide-browser__history-item--current" : ""}`}
              title={entry.url}
              onClick={() => {
                goToHistory(entry.index);
                setOpen(false);
              }}
            >
              <span className="lc-ide-browser__history-item-label">{entry.label}</span>
              {entry.isCurrent ? (
                <span className="lc-ide-browser__history-item-badge">{t("ideBrowser.historyCurrent")}</span>
              ) : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
