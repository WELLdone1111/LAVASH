import { getCurrentWindow } from "@tauri-apps/api/window";
import { useCallback, useEffect, useState } from "react";
import { useI18n } from "@/i18n/context";
import lavashBrandIcon from "@/assets/brand/lavash-icon.png";
import { cn } from "@/lib/utils";
import { isTauriRuntime } from "@/lib/isTauriRuntime";
import { useWindowDragPointerDown } from "@/shared/lib/useWindowDrag";
import AppSearchBar from "@/features/app-search/ui/AppSearchBar";
import IdeWebBrowserButton from "@/features/ide-browser/ui/IdeWebBrowserButton";
import WindowFileMenu from "@/shared/components/WindowFileMenu";
import WindowEditMenu from "@/shared/components/WindowEditMenu";
import WindowDragSpacer from "@/shared/components/WindowDragSpacer";

/** Кастомний title bar: меню зліва, пошук по центру, кнопки вікна справа (Tauri). */
export default function WindowFrameControls() {
  const { t } = useI18n();
  const isTauri = isTauriRuntime();
  const [isMaximized, setIsMaximized] = useState(false);
  const onTitlebarPointerDown = useWindowDragPointerDown();

  useEffect(() => {
    if (!isTauri) return;
    document.documentElement.dataset.lavashCustomTitlebar = "1";

    let win: ReturnType<typeof getCurrentWindow>;
    try {
      win = getCurrentWindow();
    } catch (error) {
      console.warn("[window] getCurrentWindow failed", error);
      return;
    }
    let disposed = false;

    const syncMaximized = async () => {
      if (disposed) return;
      if (document.documentElement.hasAttribute("data-window-resizing")) return;
      try {
        const maximized = await win.isMaximized();
        setIsMaximized(maximized);
        if (maximized) {
          document.documentElement.dataset.windowMaximized = "1";
        } else {
          delete document.documentElement.dataset.windowMaximized;
        }
      } catch {
        /* window gone */
      }
    };

    void syncMaximized();

    const unlistenPromise = win.onResized(() => {
      void syncMaximized();
    });

    return () => {
      disposed = true;
      delete document.documentElement.dataset.lavashCustomTitlebar;
      void unlistenPromise.then((unlisten) => unlisten());
    };
  }, [isTauri]);

  const minimize = useCallback(() => {
    void getCurrentWindow().minimize();
  }, []);

  const toggleMaximize = useCallback(() => {
    void getCurrentWindow().toggleMaximize();
  }, []);

  const close = useCallback(() => {
    void getCurrentWindow().close();
  }, []);

  return (
    <header
      className="app-window-titlebar"
      role="banner"
      data-tauri-drag-region={isTauri ? "" : undefined}
      onPointerDown={isTauri ? onTitlebarPointerDown : undefined}
    >
      <div className="app-window-titlebar__leading">
        <div
          className="app-window-titlebar__brand"
          data-tauri-drag-region={isTauri ? "" : undefined}
          onPointerDown={isTauri ? onTitlebarPointerDown : undefined}
        >
          <img className="app-window-titlebar__icon" src={lavashBrandIcon} alt="" width={16} height={16} />
        </div>
        <WindowFileMenu />
        <WindowEditMenu />
      </div>

      {isTauri ? <WindowDragSpacer className="app-window-titlebar__drag" /> : null}

      <div className="app-window-titlebar__search-row" data-tauri-drag-region="false">
        <IdeWebBrowserButton />
        <AppSearchBar className="app-window-titlebar__search" />
      </div>

      {isTauri ? <WindowDragSpacer className="app-window-titlebar__drag" /> : null}

      {isTauri ? (
        <div className="app-window-titlebar__controls" role="toolbar" aria-label={t("window.toolbarAria")}>
          <button
            type="button"
            className="app-window-titlebar__btn app-window-titlebar__btn--minimize"
            aria-label={t("window.minimize")}
            data-tauri-drag-region="false"
            onClick={minimize}
          >
            <span className="app-window-titlebar__glyph app-window-titlebar__glyph--min" aria-hidden />
          </button>
          <button
            type="button"
            className="app-window-titlebar__btn app-window-titlebar__btn--maximize"
            aria-label={isMaximized ? t("window.restore") : t("window.maximize")}
            data-tauri-drag-region="false"
            onClick={toggleMaximize}
          >
            <span
              className={cn(
                "app-window-titlebar__glyph",
                isMaximized ? "app-window-titlebar__glyph--restore" : "app-window-titlebar__glyph--max",
              )}
              aria-hidden
            />
          </button>
          <button
            type="button"
            className="app-window-titlebar__btn app-window-titlebar__btn--close"
            aria-label={t("window.close")}
            data-tauri-drag-region="false"
            onClick={close}
          >
            <span className="app-window-titlebar__glyph app-window-titlebar__glyph--close" aria-hidden />
          </button>
        </div>
      ) : (
        <div className="app-window-titlebar__controls app-window-titlebar__controls--web" aria-hidden />
      )}
    </header>
  );
}
