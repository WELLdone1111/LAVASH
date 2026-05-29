import { getCurrentWindow } from "@tauri-apps/api/window";
import { useCallback, type PointerEvent as ReactPointerEvent } from "react";
import { isTauriRuntime } from "@/lib/isTauriRuntime";

/** Надійніше за data-tauri-drag-region у WebView2 на Windows. */
export function useWindowDragPointerDown() {
  const isTauri = isTauriRuntime();

  return useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (!isTauri || event.button !== 0) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest('[data-tauri-drag-region="false"]')) return;
      event.preventDefault();
      void getCurrentWindow().startDragging().catch(() => {});
    },
    [isTauri],
  );
}
