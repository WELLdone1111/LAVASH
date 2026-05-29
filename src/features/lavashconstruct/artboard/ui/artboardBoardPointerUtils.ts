/**
 * Єдиний sandbox для текстових превʼю в iframe: скрипти (JSX, HTML з логікою),
 * форми, діалоги/alert, попапи. Без top-навігації й same-origin — ізоляція від батьківки.
 */
export const IMPORTED_PREVIEW_IFRAME_SANDBOX =
  "allow-scripts allow-forms allow-popups allow-modals" as const;

export function importedIframeKey(panelId: string, doc: string): string {
  let h = 5381;
  for (let i = 0; i < doc.length; i++) {
    h = Math.imul(h, 33) ^ doc.charCodeAt(i);
  }
  return `${panelId}-${doc.length}-${(h >>> 0).toString(36)}`;
}

/**
 * Так, коли ціль івента має лишитись з нативною взаємодією (драг панелі — через capture тільки на хром-плашці панелі).
 */
export function isInteractivePointerDownTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return Boolean(
    target.closest(
      [
        "button",
        "input",
        "textarea",
        "select",
        "option",
        "a[href]",
        "label",
        "[role='slider']",
        "[role='tab']",
        "[role='tablist']",
        "[role='tabpanel']",
        "[role='dialog']",
        "[role='menuitem']",
        "[role='listbox']",
        "[role='option']",
        "[role='combobox']",
        "[role='switch']",
        "[role='spinbutton']",
        "[contenteditable='true']",
        "iframe",
        ".lc-imported-sandbox-frame",
        "canvas",
        "video",
        "audio",
        "summary",
        "meter",
        "progress",
      ].join(", "),
    ),
  );
}

/** Ресайз-хендл має свій pointer-handler — не стартуємо move панелі, коли хапаємо його (навіть з Alt). */
export function isPanelResizeChromeTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return Boolean(target.closest(".lc-panel-resize-handle"));
}
