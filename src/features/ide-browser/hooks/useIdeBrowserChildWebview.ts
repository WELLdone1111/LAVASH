import { useEffect, useRef, type RefObject } from "react";
import {
  destroyIdeBrowserChildWebview,
  hideIdeBrowserChildWebview,
  mountIdeBrowserChildWebview,
  reloadIdeBrowserChildWebview,
  syncIdeBrowserChildWebviewBounds,
} from "@/features/ide-browser/model/ideBrowserChildWebview";
import { isTauriRuntime } from "@/lib/isTauriRuntime";

type UseIdeBrowserChildWebviewOptions = {
  anchorRef: RefObject<HTMLElement | null>;
  url: string;
  enabled: boolean;
  suppressed: boolean;
  onNativeError?: (error: unknown) => void;
};

export function useIdeBrowserChildWebview({
  anchorRef,
  url,
  enabled,
  suppressed,
  onNativeError,
}: UseIdeBrowserChildWebviewOptions) {
  const useNative = isTauriRuntime();
  const urlRef = useRef(url);
  urlRef.current = url;

  useEffect(() => {
    if (!useNative) return undefined;
    return () => {
      void destroyIdeBrowserChildWebview();
    };
  }, [useNative]);

  useEffect(() => {
    if (!useNative || !enabled) return undefined;

    if (suppressed) {
      void hideIdeBrowserChildWebview();
      return undefined;
    }

    let cancelled = false;
    let raf = 0;
    let attempts = 0;

    const tryMount = () => {
      if (cancelled) return;
      const anchor = anchorRef.current;
      if (!anchor) {
        if (attempts++ < 120) raf = requestAnimationFrame(tryMount);
        return;
      }

      const rect = anchor.getBoundingClientRect();
      if (rect.width < 4 || rect.height < 4) {
        if (attempts++ < 120) raf = requestAnimationFrame(tryMount);
        return;
      }

      void mountIdeBrowserChildWebview(urlRef.current, anchor).catch((error) => {
        console.error("[ide-browser] mount failed", error);
        onNativeError?.(error);
      });
    };

    raf = requestAnimationFrame(tryMount);

    return () => {
      cancelled = true;
      if (raf) cancelAnimationFrame(raf);
    };
  }, [useNative, enabled, suppressed, url, anchorRef, onNativeError]);

  useEffect(() => {
    if (!useNative || !enabled || suppressed) return undefined;

    let raf = 0;
    const scheduleSync = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        raf = 0;
        const anchor = anchorRef.current;
        if (!anchor) return;
        void syncIdeBrowserChildWebviewBounds(anchor, true);
      });
    };

    const anchor = anchorRef.current;
    if (!anchor) return undefined;

    const ro = new ResizeObserver(scheduleSync);
    ro.observe(anchor);
    const splitHost = anchor.closest(".lc-artboard-workspace-split");
    if (splitHost) ro.observe(splitHost);

    window.addEventListener("resize", scheduleSync);
    const mo = new MutationObserver(scheduleSync);
    mo.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-lc-browser-split-dragging", "data-window-maximized"],
    });

    scheduleSync();

    return () => {
      if (raf) cancelAnimationFrame(raf);
      ro.disconnect();
      mo.disconnect();
      window.removeEventListener("resize", scheduleSync);
    };
  }, [useNative, enabled, suppressed, anchorRef]);

  return {
    useNative,
    reloadNative: (targetUrl: string) => {
      const anchor = anchorRef.current;
      if (!anchor || !useNative) return;
      void reloadIdeBrowserChildWebview(targetUrl, anchor).catch((error) => {
        onNativeError?.(error);
      });
    },
  };
}
