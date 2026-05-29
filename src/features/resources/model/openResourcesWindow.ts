import { isTauri } from "@tauri-apps/api/core";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";

export const RESOURCES_WINDOW_LABEL = "lavash-resources";

export async function openResourcesWindow(title: string): Promise<void> {
  if (!isTauri()) {
    window.open(`${window.location.origin}/?lavash-window=resources`, "_blank", "noopener,noreferrer");
    return;
  }
  const existing = await WebviewWindow.getByLabel(RESOURCES_WINDOW_LABEL);
  if (existing) {
    await existing.setFocus();
    return;
  }
  new WebviewWindow(RESOURCES_WINDOW_LABEL, {
    url: "/",
    title,
    width: 980,
    height: 680,
    minWidth: 720,
    minHeight: 520,
    center: true,
    resizable: true,
    decorations: true,
    backgroundColor: "#1a1d24",
    focus: true,
  });
}
