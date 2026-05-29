import {
  IMPORT_SANDBOX_HTML_MAX,
  SANDBOX_BASE_RESET,
} from "./clipboardTypes";
import { inferCssPreviewPanelSize } from "./importedCssPreview";

const HTML_BLOCK_BODY_TAG =
  /<(div|section|main|button|article|nav|header|footer|svg|form|input|label|p|span|ul|ol|li|audio|video)\b/i;

/** Типові помилки LLM: `<style>` без `</style>`, `<div>` одразу після CSS у `<head>`. */
export function repairAssistantHtmlDocument(raw: string): { html: string; repaired: boolean } {
  let html = raw.replace(/\r\n/g, "\n").trim();
  if (!html) return { html, repaired: false };

  html = html.replace(/^```[\w-]*\n?/i, "").replace(/\n?```\s*$/i, "").trim();
  if (!/<\s*html[\s>]/i.test(html) && !/<!doctype/i.test(html)) {
    return { html: raw.trim(), repaired: false };
  }

  const before = html;
  let repaired = false;

  const styleStart = html.search(/<style\b/i);
  if (styleStart >= 0) {
    const sliceFromStyle = html.slice(styleStart);
    const styleCloseRel = sliceFromStyle.search(/<\/style>/i);
    const blockTagRel = sliceFromStyle.search(HTML_BLOCK_BODY_TAG);
    if (blockTagRel >= 0 && (styleCloseRel < 0 || styleCloseRel > blockTagRel)) {
      const insertAt = styleStart + blockTagRel;
      html = `${html.slice(0, insertAt)}</style></head><body>${html.slice(insertAt)}`;
      repaired = true;
    }
  }

  if (/<head\b/i.test(html) && !/<\/head>/i.test(html)) {
    const headStart = html.search(/<head\b[^>]*>/i);
    const afterHead = html.slice(headStart);
    const blockInHead = afterHead.search(HTML_BLOCK_BODY_TAG);
    if (blockInHead > 0) {
      const insertAt = headStart + blockInHead;
      html = `${html.slice(0, insertAt)}</head><body>${html.slice(insertAt)}`;
      repaired = true;
    }
  }

  if (/<\/head>/i.test(html) && !/<body\b/i.test(html)) {
    html = html.replace(/<\/head>/i, "</head><body>");
    repaired = true;
  }

  if (/<body\b/i.test(html) && !/<\/body>/i.test(html)) {
    if (/<\/html>/i.test(html)) {
      html = html.replace(/<\/html>/i, "</body></html>");
    } else {
      html = `${html}\n</body>`;
    }
    repaired = true;
  }
  if (/<html\b/i.test(html) && !/<\/html>/i.test(html)) {
    html = `${html}\n</html>`;
    repaired = true;
  }

  if (html !== before) repaired = true;
  return { html, repaired };
}

/** Базовий reset у `<head>` — прозорий фон, щоб не було «порожньої темної коробки». */
export function injectArtboardHtmlPreviewBaseCss(html: string): string {
  const marker = 'data-lc-artboard-base="1"';
  if (html.includes(marker)) return html;
  const baseCss = `<style ${marker}>${SANDBOX_BASE_RESET}html,body{min-height:0!important;height:auto!important;background:transparent!important}</style>`;
  if (/<head\b[^>]*>/i.test(html)) {
    return html.replace(/<head\b[^>]*>/i, (m) => `${m}${baseCss}`);
  }
  if (/<html\b[^>]*>/i.test(html)) {
    return html.replace(/<html\b[^>]*>/i, (m) => `${m}<head>${baseCss}</head>`);
  }
  return html;
}

export function prepareHtmlForArtboardPreview(raw: string): { html: string; repaired: boolean } {
  const { html, repaired } = repairAssistantHtmlDocument(raw);
  return { html: injectArtboardHtmlPreviewBaseCss(html), repaired };
}

/** Розмір панелі з width/height у `<style>` всередині HTML-документа. */
export function inferHtmlPreviewPanelSize(html: string): { width: number; height: number } | null {
  const styles: string[] = [];
  html.replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gi, (_, css: string) => {
    styles.push(css);
    return "";
  });
  if (styles.length === 0) return null;
  return inferCssPreviewPanelSize(styles.join("\n"));
}

/** обгорнути сирий HTML фрагмент у валідний док для srcDoc */
export function ensureCompleteHtmlDocument(fragment: string): string {
  const t = fragment.trim();
  if (/^<!doctype\s+html/i.test(t) || /<\s*html[\s>]/i.test(t)) return t;
  const body = t.slice(0, IMPORT_SANDBOX_HTML_MAX - 1200);
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>${SANDBOX_BASE_RESET}</style>
</head><body><div class="lc-fragment-host">${body}</div><style>
.lc-fragment-host{min-height:100vh;display:grid;place-items:center;padding:12px;box-sizing:border-box;overflow:auto}
</style></body></html>`;
}
