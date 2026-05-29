import { isTauri } from "@tauri-apps/api/core";

/** Надійніше за `isTauri()` у WebView2 (withGlobalTauri). */
export function isTauriRuntime(): boolean {
  if (typeof window === "undefined") return false;
  if (isTauri()) return true;
  return "__TAURI__" in window || "__TAURI_INTERNALS__" in window;
}
