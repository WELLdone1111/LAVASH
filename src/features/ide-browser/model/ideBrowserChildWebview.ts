import { LogicalPosition, LogicalSize } from "@tauri-apps/api/dpi";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Webview } from "@tauri-apps/api/webview";
import { isTauriRuntime } from "@/lib/isTauriRuntime";
import { needsIdeBrowserNativeWebview } from "@/features/ide-browser/model/ideBrowserHomeUrl";

function formatWebviewError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (error && typeof error === "object") {
    const payload = (error as { payload?: unknown }).payload;
    if (typeof payload === "string") return payload;
    const event = (error as { event?: string }).event;
    if (event === "tauri://error" && typeof payload === "string") return payload;
  }
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

export const IDE_BROWSER_WEBVIEW_LABEL = "ide-browser-panel";

let childRef: Webview | null = null;
let loadedUrl = "";
let pendingCreate: Promise<Webview | null> | null = null;

function anchorBounds(anchor: HTMLElement) {
  const rect = anchor.getBoundingClientRect();
  return {
    x: Math.max(0, Math.round(rect.left)),
    y: Math.max(0, Math.round(rect.top)),
    width: Math.max(0, Math.round(rect.width)),
    height: Math.max(0, Math.round(rect.height)),
  };
}

function waitForWebviewCreated(webview: Webview): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      reject(new Error("ide-browser webview create timeout"));
    }, 15_000);

    void webview.once("tauri://created", () => {
      window.clearTimeout(timeout);
      resolve();
    });
    void webview.once("tauri://error", (event: unknown) => {
      window.clearTimeout(timeout);
      reject(new Error(formatWebviewError(event)));
    });
  });
}

async function getChildHandle(): Promise<Webview | null> {
  if (childRef) return childRef;
  return Webview.getByLabel(IDE_BROWSER_WEBVIEW_LABEL);
}

export async function destroyIdeBrowserChildWebview(): Promise<void> {
  pendingCreate = null;
  loadedUrl = "";
  const existing = childRef ?? (await Webview.getByLabel(IDE_BROWSER_WEBVIEW_LABEL));
  childRef = null;
  if (!existing) return;
  try {
    await existing.close();
  } catch {
    /* already closed */
  }
}

export async function hideIdeBrowserChildWebview(): Promise<void> {
  const w = await getChildHandle();
  if (!w) return;
  try {
    await w.hide();
  } catch {
    /* */
  }
}

async function applyBounds(webview: Webview, anchor: HTMLElement, visible: boolean): Promise<void> {
  const bounds = anchorBounds(anchor);
  if (!visible || bounds.width < 4 || bounds.height < 4) {
    await webview.hide();
    return;
  }
  await webview.setPosition(new LogicalPosition(bounds.x, bounds.y));
  await webview.setSize(new LogicalSize(bounds.width, bounds.height));
  await webview.show();
}

async function createChild(pageUrl: string, anchor: HTMLElement): Promise<Webview | null> {
  if (!isTauriRuntime()) return null;

  const bounds = anchorBounds(anchor);
  if (bounds.width < 4 || bounds.height < 4) return null;

  if (!needsIdeBrowserNativeWebview(pageUrl)) {
    return null;
  }

  const existing = await Webview.getByLabel(IDE_BROWSER_WEBVIEW_LABEL);
  if (existing) {
    try {
      await existing.close();
    } catch {
      /* */
    }
    childRef = null;
  }

  const host = getCurrentWindow();
  const webview = new Webview(host, IDE_BROWSER_WEBVIEW_LABEL, {
    url: pageUrl,
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    dragDropEnabled: false,
    focus: false,
    backgroundColor: "#202124",
    zoomHotkeysEnabled: true,
  });

  try {
    await waitForWebviewCreated(webview);
  } catch (error) {
    console.error("[ide-browser] child webview create failed", formatWebviewError(error), error);
    try {
      await webview.close();
    } catch {
      /* */
    }
    throw error;
  }

  childRef = webview;
  loadedUrl = pageUrl;
  await applyBounds(webview, anchor, true);
  return webview;
}

/** Створити або перезавантажити child WebView. */
export async function mountIdeBrowserChildWebview(url: string, anchor: HTMLElement): Promise<Webview | null> {
  if (!isTauriRuntime()) return null;
  if (!needsIdeBrowserNativeWebview(url)) {
    await destroyIdeBrowserChildWebview();
    return null;
  }

  const bounds = anchorBounds(anchor);
  if (bounds.width < 4 || bounds.height < 4) {
    return null;
  }

  if (loadedUrl === url && childRef) {
    await applyBounds(childRef, anchor, true);
    return childRef;
  }

  if (pendingCreate) {
    await pendingCreate.catch(() => null);
  }

  pendingCreate = createChild(url, anchor);
  try {
    return await pendingCreate;
  } finally {
    pendingCreate = null;
  }
}

export async function syncIdeBrowserChildWebviewBounds(
  anchor: HTMLElement,
  visible: boolean,
): Promise<void> {
  if (!isTauriRuntime()) return;
  const webview = await getChildHandle();
  if (!webview) return;
  await applyBounds(webview, anchor, visible);
}

export async function reloadIdeBrowserChildWebview(url: string, anchor: HTMLElement): Promise<void> {
  loadedUrl = "";
  childRef = null;
  await destroyIdeBrowserChildWebview();
  await mountIdeBrowserChildWebview(url, anchor);
}
