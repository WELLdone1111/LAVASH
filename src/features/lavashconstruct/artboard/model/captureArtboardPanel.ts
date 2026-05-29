import type { ArtboardPanel } from "@/features/lavashconstruct/artboard/ui/types";
import { useConstructStore } from "@/features/lavashconstruct/artboard/model/store";

const MAX_CAPTURE_BYTES = 4 * 1024 * 1024;
const MAX_CAPTURE_EDGE = 1600;

export type CapturedPanelImage = {
  kind: "image";
  mimeType: string;
  dataUrl: string;
  base64: string;
};

function stripDataUrlPrefix(dataUrl: string): { mimeType: string; base64: string } | null {
  const m = /^data:([^;,]+);base64,(.+)$/s.exec(dataUrl.replace(/\s/g, ""));
  if (!m) return null;
  return { mimeType: m[1].trim().toLowerCase(), base64: m[2] };
}

async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image load failed"));
    img.src = src;
  });
}

async function resizeDataUrl(dataUrl: string, maxEdge: number): Promise<CapturedPanelImage | null> {
  const parsed = stripDataUrlPrefix(dataUrl);
  if (!parsed) return null;
  try {
    const img = await loadImage(dataUrl);
    const scale = Math.min(1, maxEdge / Math.max(img.naturalWidth, img.naturalHeight, 1));
    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const h = Math.max(1, Math.round(img.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, w, h);
    const outUrl = canvas.toDataURL("image/png");
    const outParsed = stripDataUrlPrefix(outUrl);
    if (!outParsed) return null;
    const approxBytes = (outParsed.base64.length * 3) / 4;
    if (approxBytes > MAX_CAPTURE_BYTES) return null;
    return {
      kind: "image",
      mimeType: "image/png",
      dataUrl: outUrl,
      base64: outParsed.base64,
    };
  } catch {
    const approxBytes = (parsed.base64.length * 3) / 4;
    if (approxBytes > MAX_CAPTURE_BYTES) return null;
    return {
      kind: "image",
      mimeType: parsed.mimeType,
      dataUrl,
      base64: parsed.base64,
    };
  }
}

async function captureElementViaSvg(el: HTMLElement, width: number, height: number): Promise<string | null> {
  const clone = el.cloneNode(true) as HTMLElement;
  clone.querySelectorAll(".lc-panel-resize-handle, .lc-panel-drag-surface, .lc-imported-drag-strip").forEach((n) => n.remove());
  const serialized = new XMLSerializer().serializeToString(clone);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
<foreignObject width="100%" height="100%">
<div xmlns="http://www.w3.org/1999/xhtml" style="width:${width}px;height:${height}px;overflow:hidden;background:#111;">
${serialized}
</div>
</foreignObject>
</svg>`;
  const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  try {
    const img = await loadImage(url);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = "#111111";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);
    return canvas.toDataURL("image/png");
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function captureIframePanel(iframe: HTMLIFrameElement, width: number, height: number): Promise<string | null> {
  const doc = iframe.contentDocument;
  if (!doc?.documentElement) return null;
  const root = doc.documentElement;
  const body = doc.body ?? root;
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>html,body{margin:0;padding:0;background:#111;color:#eee;font-family:system-ui,sans-serif;}</style></head><body>${body.innerHTML}</body></html>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
<foreignObject width="100%" height="100%">
<div xmlns="http://www.w3.org/1999/xhtml" style="width:${width}px;height:${height}px;overflow:hidden;background:#111;">
${html}
</div>
</foreignObject>
</svg>`;
  const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  try {
    const img = await loadImage(url);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = "#111111";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);
    return canvas.toDataURL("image/png");
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function findPanelElement(panelId: string): HTMLElement | null {
  return document.querySelector(`[data-lc-panel-id="${panelId}"]`) as HTMLElement | null;
}

export async function captureArtboardPanelImage(panelId: string): Promise<CapturedPanelImage | null> {
  const panel = useConstructStore.getState().artboardPanels.find((p) => p.id === panelId);
  if (!panel) return null;

  if (panel.importedSourceKind === "image" && panel.importedDataUrl) {
    return resizeDataUrl(panel.importedDataUrl, MAX_CAPTURE_EDGE);
  }

  const el = findPanelElement(panelId);
  if (!el) return null;

  const w = Math.max(1, Math.min(Math.round(panel.width), MAX_CAPTURE_EDGE));
  const h = Math.max(1, Math.min(Math.round(panel.height), MAX_CAPTURE_EDGE));

  const iframe = el.querySelector("iframe.lc-imported-sandbox-frame") as HTMLIFrameElement | null;
  if (iframe) {
    const fromIframe = await captureIframePanel(iframe, w, h);
    if (fromIframe) return resizeDataUrl(fromIframe, MAX_CAPTURE_EDGE);
  }

  const imgEl = el.querySelector("img.lc-imported-image") as HTMLImageElement | null;
  if (imgEl?.src) {
    return resizeDataUrl(imgEl.src, MAX_CAPTURE_EDGE);
  }

  const fromDom = await captureElementViaSvg(el, w, h);
  if (fromDom) return resizeDataUrl(fromDom, MAX_CAPTURE_EDGE);

  return null;
}

export function resolveCapturePanelId(
  explicitId: string | null | undefined,
  markedPanelId: string | null,
  selectedPanelId: string | null,
): string | null {
  const id = explicitId?.trim() || markedPanelId?.trim() || selectedPanelId?.trim() || null;
  if (!id) return null;
  const exists = useConstructStore.getState().artboardPanels.some((p) => p.id === id);
  return exists ? id : null;
}

export function panelCaptureLabel(panel: ArtboardPanel): string {
  return panel.title.trim() || panel.id;
}
