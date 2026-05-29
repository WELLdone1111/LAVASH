/** Мінімальний логічний розмір розгорнутого вікна (Tauri frameless resize). */
export const WINDOW_EXPANDED_MIN_W = 380;
export const WINDOW_EXPANDED_MIN_H = 320;

const RESIZING_ATTR = "data-window-resizing";
const PREVIEW_ATTR = "data-window-resize-preview";

/** Після завершення drag ресайзу кута вікна (один раз на pointerup). */
export const WINDOW_RESIZE_END_EVENT = "lavash:window-resize-end";

export function isWindowResizing(): boolean {
  return typeof document !== "undefined" && document.documentElement.getAttribute(RESIZING_ATTR) === "1";
}

/** ЛавашКонструкт → Design: важкий DOM — рідший setSize під час drag. */
export function isConstructDesignWindowResize(): boolean {
  if (typeof document === "undefined") return false;
  return (
    document.documentElement.getAttribute("data-active-workspace") === "lavashconstruct" &&
    document.documentElement.getAttribute("data-lc-design-tab") === "design"
  );
}

export type WindowResizePreviewAnchor = {
  w0: number;
  h0: number;
  direction: string;
};

/** Миттєвий layout у WebView (setSize від Tauri відстає від курсора). */
export function updateWindowResizePreview(
  w: number,
  h: number,
  anchor: WindowResizePreviewAnchor,
): void {
  if (typeof document === "undefined") return;
  const { w0, h0, direction } = anchor;
  let x = 0;
  let y = 0;
  if (direction.includes("West")) x = w0 - w;
  if (direction.includes("North")) y = h0 - h;

  const root = document.documentElement;
  root.setAttribute(PREVIEW_ATTR, "1");
  root.style.setProperty("--lavash-resize-preview-w", `${w}px`);
  root.style.setProperty("--lavash-resize-preview-h", `${h}px`);
  root.style.setProperty("--lavash-resize-preview-x", `${x}px`);
  root.style.setProperty("--lavash-resize-preview-y", `${y}px`);
}

export function clearWindowResizePreview(): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.removeAttribute(PREVIEW_ATTR);
  root.style.removeProperty("--lavash-resize-preview-w");
  root.style.removeProperty("--lavash-resize-preview-h");
  root.style.removeProperty("--lavash-resize-preview-x");
  root.style.removeProperty("--lavash-resize-preview-y");
}

export function beginWindowResize(): void {
  clearWindowResizePreview();
  document.documentElement.setAttribute(RESIZING_ATTR, "1");
}

export function endWindowResize(): void {
  clearWindowResizePreview();
  document.documentElement.removeAttribute(RESIZING_ATTR);
  window.dispatchEvent(new CustomEvent(WINDOW_RESIZE_END_EVENT));
}
