import { isTauri } from "@tauri-apps/api/core";
import { openUrl } from "@tauri-apps/plugin-opener";

/** Відкрити http(s) у системному браузері. */
export async function openExternalUrl(href: string): Promise<void> {
  if (!href.startsWith("http://") && !href.startsWith("https://")) return;

  if (isTauri()) {
    try {
      await openUrl(href);
      return;
    } catch {
      /* fallback below */
    }
  }

  const popup = window.open(href, "_blank", "noopener,noreferrer");
  if (!popup) {
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";
    anchor.style.display = "none";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  }
}
