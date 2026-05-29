import { invoke, isTauri } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";

/** Синхронізує фон вікна та колір нативного title bar з `--palette-surface`. */
export function syncWindowChromeBackground(surfaceColor: string): void {
  if (!isTauri()) return;
  const color = surfaceColor.trim();
  if (!color) return;
  void getCurrentWindow()
    .setBackgroundColor({ red: 0, green: 0, blue: 0, alpha: 0 })
    .catch(() => {
      /* ignore */
    });
  void invoke("set_window_caption_color", { color }).catch(() => {
    /* ignore on non-Windows or older OS */
  });
}
