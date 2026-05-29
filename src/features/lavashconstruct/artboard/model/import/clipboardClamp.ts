import {
  autowireImportedTextForEditPalette,
  CONSTRUCT_EDIT_AUTOWIRE_WARNING,
} from "@/features/lavashconstruct/editor/model/editSnippetAutowire";
import {
  HTML_STRUCTURE_REPAIRED_NOTE,
  IMPORT_CLIPBOARD_TEXT_MAX,
  IMPORT_CSS_PREVIEW_MARKUP_MAX,
  IMPORT_HTML_PREVIEW_EXTRA_CSS_MAX,
  IMPORT_JSX_CLIPBOARD_TEXT_MAX,
  IMPORT_SANDBOX_HTML_MAX,
  IMPORT_WARNING_LINE_MAX,
  IMPORT_WARNINGS_MAX,
  type ImportedVisualKind,
} from "./clipboardTypes";
import { repairAssistantHtmlDocument } from "./importedHtmlDocument";

export function clampImportedTextContent(
  raw: string | undefined,
  visualKind?: ImportedVisualKind,
): string | undefined {
  if (typeof raw !== "string" || !raw.trim()) return undefined;
  const max =
    visualKind === "jsx" ? IMPORT_JSX_CLIPBOARD_TEXT_MAX : IMPORT_CLIPBOARD_TEXT_MAX;
  return raw.trim().slice(0, max);
}

/** кламп + autowire jsx/html/css + варнінги (CONSTRUCT_EDIT_AUTOWIRE_WARNING якщо переписали) */
export function normalizeImportedTextForEditPalette(
  raw: string | undefined,
  visualKind: ImportedVisualKind | undefined,
  existingWarnings?: unknown,
): { text: string | undefined; importWarnings: string[] | undefined } {
  const clamped = clampImportedTextContent(raw, visualKind);
  const baseWarnings: string[] = Array.isArray(existingWarnings)
    ? existingWarnings
        .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
        .map((x) => x.trim())
    : [];
  if (clamped === undefined) {
    return { text: undefined, importWarnings: clampImportWarnings(baseWarnings) };
  }
  const autowireKind =
    visualKind === "jsx" || visualKind === "html" || visualKind === "css"
      ? visualKind
      : "plain-text";
  let { text: wiredText, changed } = autowireImportedTextForEditPalette(clamped, autowireKind);
  const merged = [...baseWarnings];
  if (changed && !merged.includes(CONSTRUCT_EDIT_AUTOWIRE_WARNING)) {
    merged.push(CONSTRUCT_EDIT_AUTOWIRE_WARNING);
  }
  if (visualKind === "html" && wiredText) {
    const { html, repaired } = repairAssistantHtmlDocument(wiredText);
    if (repaired) {
      wiredText = html;
      if (!merged.includes(HTML_STRUCTURE_REPAIRED_NOTE)) {
        merged.push(HTML_STRUCTURE_REPAIRED_NOTE);
      }
    }
  }
  return { text: wiredText, importWarnings: clampImportWarnings(merged) };
}

export function clampImportedSandboxHtmlDoc(raw: string | undefined): string | undefined {
  if (typeof raw !== "string" || !raw.trim()) return undefined;
  return raw.trim().slice(0, IMPORT_SANDBOX_HTML_MAX);
}

export function clampImportWarnings(raw: unknown): string[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const next = raw
    .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
    .map((x) => x.trim().slice(0, IMPORT_WARNING_LINE_MAX))
    .slice(0, IMPORT_WARNINGS_MAX);
  return next.length > 0 ? next : undefined;
}

export function clampImportedCssPreviewMarkup(raw: string | undefined): string | undefined {
  if (typeof raw !== "string" || !raw.trim()) return undefined;
  return raw.trim().slice(0, IMPORT_CSS_PREVIEW_MARKUP_MAX);
}

export function clampImportedHtmlPreviewExtraCss(raw: string | undefined): string | undefined {
  if (typeof raw !== "string" || !raw.trim()) return undefined;
  return raw.trim().slice(0, IMPORT_HTML_PREVIEW_EXTRA_CSS_MAX);
}

/** вшити extra CSS у HTML-док для iframe (розумний paste HTML) */
export function injectExtraCssIntoHtmlDocument(html: string, css: string): string {
  const trimmed = css.trim();
  if (!trimmed) return html;

  const doctypeMatch = html.match(/^<!doctype[^>]*>/i);

  if (typeof DOMParser !== "undefined") {
    try {
      const doc = new DOMParser().parseFromString(html, "text/html");
      const styleEl = doc.createElement("style");
      styleEl.setAttribute("data-lc-user-extra", "1");
      styleEl.textContent = trimmed;
      let head = doc.querySelector("head");
      if (!head) {
        head = doc.createElement("head");
        const root = doc.documentElement;
        if (root?.firstChild) root.insertBefore(head, root.firstChild);
        else root?.appendChild(head);
      }
      head.appendChild(styleEl);
      const serialized = doc.documentElement?.outerHTML ?? html;
      const dt = doctypeMatch?.[0] ? `${doctypeMatch[0]}\n` : "";
      return `${dt}${serialized}`;
    } catch {
      // падаємо в string-merge
    }
  }

  const body = trimmed.replace(/<\/style/gi, "<\\/style");
  const styleTag = `<style data-lc-user-extra="1">${body}</style>`;
  if (/<\/head>/i.test(html)) return html.replace(/<\/head>/i, `${styleTag}</head>`);
  if (/<head[\s>]/i.test(html)) return html.replace(/(<head[^>]*>)/i, `$1${styleTag}`);
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/>${styleTag}</head><body>${html}</body></html>`;
}

/** ріжемо нативне contextmenu в iframe (нема бріджа в батька) */
export function injectContextMenuBlocker(html: string): string {
  const blocker = `<script>(function(){document.addEventListener("contextmenu",function(e){e.preventDefault();},true);})();</script>`;
  if (/<\/head>/i.test(html)) return html.replace(/<\/head>/i, `${blocker}</head>`);
  if (/<head[\s>]/i.test(html)) return html.replace(/(<head[^>]*>)/i, `$1${blocker}`);
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/>${blocker}</head><body>${html}</body></html>`;
}
