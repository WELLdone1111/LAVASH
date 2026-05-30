import { useCallback, useEffect, useState } from "react";
import { GitBranch, RefreshCw, TerminalSquare, X } from "lucide-react";
import { isTauri } from "@tauri-apps/api/core";
import { useI18n } from "@/i18n/context";
import { cn } from "@/lib/utils";
import { probeDevTools } from "@/features/lavashconstruct/project/model/projectToolsApi";
import type { DevToolsProbe } from "@/features/lavashconstruct/project/model/projectToolsModel";
import ConstructGitPanel from "@/features/lavashconstruct/project/ui/ConstructGitPanel";
import ConstructTerminalPanel from "@/features/lavashconstruct/project/ui/ConstructTerminalPanel";
import "./ConstructDevToolsPanel.css";

type DevToolsTab = "terminal" | "git";

type ConstructDevToolsPanelProps = {
  onClose: () => void;
};

export default function ConstructDevToolsPanel({ onClose }: ConstructDevToolsPanelProps) {
  const { t } = useI18n();
  const [tab, setTab] = useState<DevToolsTab>("terminal");
  const [probe, setProbe] = useState<DevToolsProbe | null>(null);
  const [gitRefreshToken, setGitRefreshToken] = useState(0);

  useEffect(() => {
    if (!isTauri()) return;
    void probeDevTools().then(setProbe).catch(() => {
      setProbe({
        terminal: { available: false, shell: "PowerShell" },
        git: { available: false, version: null },
      });
    });
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const refreshGit = useCallback(() => {
    setGitRefreshToken((value) => value + 1);
  }, []);

  if (!isTauri()) {
    return (
      <section className="lc-devtools-panel" aria-label={t("devTools.title")}>
        <p className="lc-devtools-panel__notice">{t("devTools.desktopOnly")}</p>
      </section>
    );
  }

  return (
    <section className="lc-devtools-panel" aria-label={t("devTools.title")}>
      <header className="lc-devtools-panel__header">
        <div className="lc-devtools-panel__tabs" role="tablist" aria-label={t("devTools.tabsAria")}>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "terminal"}
            className={cn("lc-devtools-panel__tab", tab === "terminal" && "lc-devtools-panel__tab--active")}
            onClick={() => setTab("terminal")}
          >
            <TerminalSquare size={12} aria-hidden />
            {t("devTools.tab.terminal")}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "git"}
            className={cn("lc-devtools-panel__tab", tab === "git" && "lc-devtools-panel__tab--active")}
            onClick={() => setTab("git")}
          >
            <GitBranch size={12} aria-hidden />
            {t("devTools.tab.git")}
          </button>
        </div>
        <div className="lc-devtools-panel__actions">
          {tab === "git" ? (
            <button
              type="button"
              className="lc-devtools-panel__icon-btn"
              aria-label={t("devTools.git.refresh")}
              title={t("devTools.git.refresh")}
              onClick={refreshGit}
            >
              <RefreshCw size={12} aria-hidden />
            </button>
          ) : null}
          <button
            type="button"
            className="lc-devtools-panel__icon-btn"
            aria-label={t("devTools.close")}
            title={t("devTools.close")}
            onClick={onClose}
          >
            <X size={12} aria-hidden />
          </button>
        </div>
      </header>
      <div className="lc-devtools-panel__body" role="tabpanel">
        {tab === "terminal" ? (
          probe && !probe.terminal.available ? (
            <p className="lc-devtools-panel__notice lc-devtools-panel__notice--error">
              {t("devTools.terminal.unavailable", { shell: probe.terminal.shell })}
            </p>
          ) : (
            <ConstructTerminalPanel />
          )
        ) : (
          <ConstructGitPanel refreshToken={gitRefreshToken} />
        )}
      </div>
    </section>
  );
}
