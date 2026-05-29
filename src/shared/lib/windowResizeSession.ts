import { invoke, isTauri } from "@tauri-apps/api/core";

const RESIZING_ATTR = "data-window-resizing";

/** Після завершення OS-native resize (mouseup / debounced onResized). */
export const WINDOW_RESIZE_END_EVENT = "lavash:window-resize-end";

export function isNativeWindowResizing(): boolean {
  return typeof document !== "undefined" && document.documentElement.getAttribute(RESIZING_ATTR) === "1";
}

/** Позначити активний OS resize — вимкнути важкі layout/observers до завершення drag. */
export function beginNativeWindowResize(): void {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute(RESIZING_ATTR, "1");
  if (!isTauri()) return;
  void invoke("set_window_rounded_corners", { round: false }).catch(() => {});
}

/** Зняти режим resize та відновити DWM corners. */
export function endNativeWindowResize(): void {
  if (typeof document === "undefined") return;
  document.documentElement.removeAttribute(RESIZING_ATTR);
  if (isTauri()) {
    const maximized = document.documentElement.dataset.windowMaximized === "1";
    void invoke("set_window_rounded_corners", { round: !maximized }).catch(() => {});
  }
  window.dispatchEvent(new CustomEvent(WINDOW_RESIZE_END_EVENT));
}
