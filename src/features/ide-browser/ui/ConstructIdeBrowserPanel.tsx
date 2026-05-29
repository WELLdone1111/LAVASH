import { ArrowLeft, ArrowRight, ExternalLink, Home, Plus, RefreshCw, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useIdeBrowserChildWebview } from "@/features/ide-browser/hooks/useIdeBrowserChildWebview";
import { buildWebSearchUrl } from "@/features/ide-browser/model/buildWebSearchUrl";
import {
  getIdeBrowserHomeUrl,
  isIdeBrowserHomeUrl,
  needsIdeBrowserNativeWebview,
} from "@/features/ide-browser/model/ideBrowserHomeUrl";
import {
  canIdeBrowserGoBack,
  canIdeBrowserGoForward,
  getIdeBrowserTabLabel,
} from "@/features/ide-browser/model/ideBrowserTab";
import {
  selectActiveIdeBrowserTab,
  selectIdeBrowserQuery,
  selectIdeBrowserUrl,
  useIdeBrowserStore,
} from "@/features/ide-browser/model/ideBrowserStore";
import { useI18n } from "@/i18n/context";
import { isTauriRuntime } from "@/lib/isTauriRuntime";
import { openExternalUrl } from "@/lib/openExternalUrl";
import IdeBrowserHistoryMenu from "@/features/ide-browser/ui/IdeBrowserHistoryMenu";
import "./ConstructIdeBrowserPanel.css";

const IDE_BROWSER_SEARCH_MESSAGE = "lavash-ide-browser-search";

type ConstructIdeBrowserPanelProps = {
  splitRatio?: number;
  onSplitRatioChange?: (ratio: number) => void;
  overlaySuppressed?: boolean;
};

export default function ConstructIdeBrowserPanel({
  splitRatio = 0.5,
  onSplitRatioChange,
  overlaySuppressed = false,
}: ConstructIdeBrowserPanelProps) {
  const { t } = useI18n();
  const tabs = useIdeBrowserStore((s) => s.tabs);
  const activeTabId = useIdeBrowserStore((s) => s.activeTabId);
  const activeTab = useIdeBrowserStore(selectActiveIdeBrowserTab);
  const url = useIdeBrowserStore(selectIdeBrowserUrl);
  const query = useIdeBrowserStore(selectIdeBrowserQuery);
  const navigate = useIdeBrowserStore((s) => s.navigate);
  const close = useIdeBrowserStore((s) => s.close);
  const openSearch = useIdeBrowserStore((s) => s.openSearch);
  const addTab = useIdeBrowserStore((s) => s.addTab);
  const closeTab = useIdeBrowserStore((s) => s.closeTab);
  const selectTab = useIdeBrowserStore((s) => s.selectTab);
  const goBack = useIdeBrowserStore((s) => s.goBack);
  const goForward = useIdeBrowserStore((s) => s.goForward);
  const goHome = useIdeBrowserStore((s) => s.goHome);

  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [addressDraft, setAddressDraft] = useState(url);
  const [frameKey, setFrameKey] = useState(0);
  const [iframeBlocked, setIframeBlocked] = useState(false);
  const [nativeFailed, setNativeFailed] = useState(false);
  const splitDragRef = useRef<{ startX: number; startRatio: number } | null>(null);

  const isHome = isIdeBrowserHomeUrl(url);
  const useIframeFallback = nativeFailed;
  const canUseNative =
    isTauriRuntime() && !useIframeFallback && needsIdeBrowserNativeWebview(url);
  const showIframe = !canUseNative;
  const canBack = activeTab ? canIdeBrowserGoBack(activeTab) : false;
  const canForward = activeTab ? canIdeBrowserGoForward(activeTab) : false;

  const { reloadNative } = useIdeBrowserChildWebview({
    anchorRef: viewportRef,
    url,
    enabled: canUseNative,
    suppressed: overlaySuppressed,
    onNativeError: () => setNativeFailed(true),
  });

  useEffect(() => {
    setAddressDraft(url);
    setIframeBlocked(false);
  }, [url, activeTabId]);

  useEffect(() => {
    setNativeFailed(false);
  }, [activeTabId]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const data = event.data as { type?: string; query?: string } | null;
      if (!data || data.type !== IDE_BROWSER_SEARCH_MESSAGE) return;
      const nextQuery = String(data.query ?? "").trim();
      if (!nextQuery) return;
      openSearch(nextQuery);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [openSearch]);

  const retryNative = useCallback(() => {
    setNativeFailed(false);
    setIframeBlocked(false);
  }, []);

  const reloadFrame = useCallback(() => {
    setIframeBlocked(false);
    if (canUseNative) {
      reloadNative(url);
      return;
    }
    setFrameKey((k) => k + 1);
  }, [canUseNative, reloadNative, url]);

  const submitAddress = useCallback(() => {
    const next = buildWebSearchUrl(addressDraft);
    if (query && addressDraft.trim() === query.trim()) {
      openSearch(addressDraft);
      return;
    }
    navigate(next);
  }, [addressDraft, navigate, openSearch, query]);

  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      const drag = splitDragRef.current;
      if (!drag || !onSplitRatioChange) return;
      const host = (event.target as Element | null)?.closest(".lc-artboard-workspace-split");
      if (!(host instanceof HTMLElement)) return;
      const rect = host.getBoundingClientRect();
      const ratio = Math.min(0.72, Math.max(0.28, drag.startRatio + (event.clientX - drag.startX) / rect.width));
      onSplitRatioChange(ratio);
    };
    const onUp = () => {
      splitDragRef.current = null;
      document.documentElement.removeAttribute("data-lc-browser-split-dragging");
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [onSplitRatioChange]);

  const defaultTabLabel = t("ideBrowser.tabDefault");
  const tabLabel = activeTab ? getIdeBrowserTabLabel(activeTab, defaultTabLabel) : defaultTabLabel;
  const iframeSrc = isHome ? getIdeBrowserHomeUrl() : url;
  const showBlocked = showIframe && iframeBlocked && !isHome;

  return (
    <aside className="lc-ide-browser" aria-label={t("ideBrowser.panelAria")}>
      <div className="lc-ide-browser__chrome">
        <div className="lc-ide-browser__tabs" role="tablist">
          {tabs.map((tab) => {
            const label = getIdeBrowserTabLabel(tab, defaultTabLabel);
            const isActive = tab.id === activeTabId;
            return (
              <div
                key={tab.id}
                className={`lc-ide-browser__tab${isActive ? " lc-ide-browser__tab--active" : ""}`}
                role="tab"
                aria-selected={isActive}
              >
                <button
                  type="button"
                  className="lc-ide-browser__tab-main"
                  onClick={() => selectTab(tab.id)}
                  title={label}
                >
                  <span className="lc-ide-browser__tab-dot" aria-hidden />
                  <span className="lc-ide-browser__tab-label">{label}</span>
                </button>
                <button
                  type="button"
                  className="lc-ide-browser__tab-close"
                  aria-label={t("ideBrowser.closeTab")}
                  onClick={(event) => {
                    event.stopPropagation();
                    closeTab(tab.id);
                  }}
                >
                  <X size={12} strokeWidth={2} aria-hidden />
                </button>
              </div>
            );
          })}
          <button
            type="button"
            className="lc-ide-browser__tab-add"
            aria-label={t("ideBrowser.newTab")}
            onClick={addTab}
          >
            <Plus size={14} strokeWidth={2} aria-hidden />
          </button>
        </div>
        <div className="lc-ide-browser__toolbar">
          <button
            type="button"
            className="lc-ide-browser__icon-btn"
            aria-label={t("ideBrowser.back")}
            disabled={!canBack}
            onClick={goBack}
          >
            <ArrowLeft size={14} strokeWidth={1.75} aria-hidden />
          </button>
          <button
            type="button"
            className="lc-ide-browser__icon-btn"
            aria-label={t("ideBrowser.forward")}
            disabled={!canForward}
            onClick={goForward}
          >
            <ArrowRight size={14} strokeWidth={1.75} aria-hidden />
          </button>
          <IdeBrowserHistoryMenu />
          <button
            type="button"
            className={`lc-ide-browser__icon-btn${isHome ? " lc-ide-browser__icon-btn--active" : ""}`}
            aria-label={t("ideBrowser.home")}
            onClick={goHome}
          >
            <Home size={14} strokeWidth={1.75} aria-hidden />
          </button>
          <form
            className="lc-ide-browser__address"
            onSubmit={(event) => {
              event.preventDefault();
              submitAddress();
            }}
          >
            <input
              type="text"
              className="lc-ide-browser__address-input"
              value={addressDraft}
              spellCheck={false}
              aria-label={t("ideBrowser.addressAria")}
              onChange={(event) => setAddressDraft(event.target.value)}
            />
          </form>
          <button
            type="button"
            className="lc-ide-browser__icon-btn"
            aria-label={t("ideBrowser.reload")}
            onClick={reloadFrame}
          >
            <RefreshCw size={14} strokeWidth={1.75} aria-hidden />
          </button>
          <button
            type="button"
            className="lc-ide-browser__icon-btn"
            aria-label={t("ideBrowser.openExternal")}
            onClick={() => void openExternalUrl(url)}
          >
            <ExternalLink size={14} strokeWidth={1.75} aria-hidden />
          </button>
          <button type="button" className="lc-ide-browser__icon-btn" aria-label={t("ideBrowser.close")} onClick={close}>
            <X size={14} strokeWidth={1.75} aria-hidden />
          </button>
        </div>
      </div>
      <div
        ref={viewportRef}
        className={`lc-ide-browser__viewport${canUseNative ? " lc-ide-browser__viewport--native" : ""}`}
      >
        {showBlocked ? (
          <div className="lc-ide-browser__blocked">
            <p>{t("ideBrowser.blockedHint")}</p>
            <button type="button" className="lc-ide-browser__blocked-btn" onClick={() => void openExternalUrl(url)}>
              {t("ideBrowser.openExternal")}
            </button>
            {isTauriRuntime() ? (
              <button type="button" className="lc-ide-browser__blocked-btn" onClick={retryNative}>
                {t("ideBrowser.retryNative")}
              </button>
            ) : null}
          </div>
        ) : showIframe ? (
          <iframe
            key={`${activeTabId}::${iframeSrc}::${frameKey}`}
            className="lc-ide-browser__frame"
            title={tabLabel}
            src={iframeSrc}
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-downloads"
            referrerPolicy="no-referrer-when-downgrade"
            onError={() => {
              if (!isHome) setIframeBlocked(true);
            }}
          />
        ) : (
          <div className="lc-ide-browser__native-placeholder" aria-hidden />
        )}
      </div>
      {onSplitRatioChange ? (
        <div
          className="lc-ide-browser__split-handle"
          role="separator"
          aria-orientation="vertical"
          aria-label={t("ideBrowser.resizeSplit")}
          onPointerDown={(event) => {
            if (event.button !== 0) return;
            splitDragRef.current = { startX: event.clientX, startRatio: splitRatio };
            document.documentElement.setAttribute("data-lc-browser-split-dragging", "1");
            event.preventDefault();
          }}
        />
      ) : null}
    </aside>
  );
}
