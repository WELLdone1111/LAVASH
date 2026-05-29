import { invoke, isTauri } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";

function hexToRgb(hex: string): { red: number; green: number; blue: number } | null {
  const normalized = hex.trim().replace(/^#/, "");
  if (normalized.length !== 6) return null;
  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);
  if ([red, green, blue].some((v) => Number.isNaN(v))) return null;
  return { red, green, blue };
}

/** Синхронізує непрозорий фон WebView2 + колір caption з `--palette-surface`. */
export function syncWindowChromeBackground(surfaceColor: string): void {
  if (!isTauri()) return;
  const color = surfaceColor.trim();
  if (!color) return;

  const rgb = hexToRgb(color);
  if (rgb) {
    void getCurrentWindow()
      .setBackgroundColor({ ...rgb, alpha: 255 })
      .catch(() => {});
  }

  void invoke("set_window_caption_color", { color }).catch(() => {});
}
