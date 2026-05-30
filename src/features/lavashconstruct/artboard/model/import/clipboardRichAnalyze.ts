import type { ConstructLibraryItem } from "@/features/lavashconstruct/shared/model/libraryItem";
import {
  clampImportedSandboxHtmlDoc,
  normalizeImportedTextForEditPalette,
} from "./clipboardClamp";
import type { AnalyzedClipboardImport } from "./clipboardTypes";
import {
  IMPORT_CLIPBOARD_TEXT_MAX,
  IMPORT_JSX_CLIPBOARD_TEXT_MAX,
  IMPORT_SANDBOX_HTML_MAX,
  SANDBOX_BASE_RESET,
  type ImportedVisualKind,
} from "./clipboardTypes";
import { detectImportedVisualKind } from "./clipboardVisualKind";

function chooseClipboardTextPayload(
  htmlRaw: string | undefined,
  plainRaw: string | undefined,
): { text: string; filenameExt: string } | null {
  const plain = plainRaw?.replace(/\uFEFF/g, "").trim() ?? "";
  const html = htmlRaw?.trim() ?? "";
  if (!plain && !html) return null;

  const extForText = (t: string) => {
    const k = detectImportedVisualKind("txt", t);
    if (k === "css") return "css";
    if (k === "jsx") return "tsx";
    if (k === "html") return "html";
    return "txt";
  };

  if (plain) {
    const kindPlain = detectImportedVisualKind("txt", plain);
    if (kindPlain === "css" || kindPlain === "jsx") {
      return { text: plain, filenameExt: kindPlain === "css" ? "css" : "tsx" };
    }
    if (html && plain.length < html.length * 0.9 && /[{};=:]/.test(plain)) {
      return { text: plain, filenameExt: extForText(plain) };
    }
    if (!html || plain.length >= html.length * 0.5) {
      return { text: plain, filenameExt: extForText(plain) };
    }
  }

  return { text: html || plain, filenameExt: html ? "html" : extForText(plain) };
}

function formatCodeImportTitle(kind: ImportedVisualKind, text: string): string {
  const label = kind === "css" ? "CSS" : kind === "jsx" ? "JSX" : kind === "html" ? "HTML" : "Text";
  const line = text.trim().split(/\r?\n/).find((l) => l.trim()) ?? "";
  const snippet = line.replace(/\s+/g, " ").slice(0, 56).trim() || "snippet";
  return `${label}: ${snippet}`;
}

function isLikelyRichWebClipboardHtml(html: string): boolean {
  const t = html.trim();
  if (t.length < 14) return false;
  if (/<!--\s*StartFragment\s*-->/i.test(t)) return true;
  if (/^<!doctype\s+html/i.test(t)) return true;
  if (/<\s*html[\s>]/i.test(t)) return true;
  if (/<\s*head[\s>]/i.test(t)) return true;
  if (/<\s*meta\s+[^>]*charset/i.test(t)) return true;
  if (/xmlns\s*=\s*["']http:\/\/www\.w3\.org/i.test(t)) return true;
  if (/style\s*=\s*["'][^"']{12,}/i.test(t) && /<[a-z][\s\S]{2,}>/i.test(t)) return true;
  return false;
}

function extractFragmentBetweenMarkers(raw: string): string | null {
  const m = raw.match(/<!--\s*StartFragment\s*-->([\s\S]*?)<!--\s*EndFragment\s*-->/i);
  const inner = m?.[1]?.trim();
  return inner ? inner : null;
}

function stripScriptsFromFragment(html: string): string {
  if (typeof DOMParser === "undefined") return html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
  const doc = new DOMParser().parseFromString(`<div class="lc-strip-root">${html}</div>`, "text/html");
  const root = doc.querySelector(".lc-strip-root");
  if (!root) return html;
  root.querySelectorAll("script").forEach((el) => el.remove());
  return root.innerHTML;
}

function collectDocumentStyles(doc: Document): { bundledCss: string; linkedStylesheetCount: number } {
  const parts: string[] = [];
  doc.querySelectorAll("style").forEach((el) => {
    const text = el.textContent?.trim();
    if (text) parts.push(text);
  });
  const links = doc.querySelectorAll('link[rel="stylesheet"][href]');
  if (links.length > 0) {
    parts.push(
      `/* ${links.length} злінкованих stylesheet(ів) пропустили — заінлайнь стилі або встав з DevTools */`,
    );
  }
  return { bundledCss: parts.join("\n\n"), linkedStylesheetCount: links.length };
}

function titleHintFromFragmentHtml(fragmentHtml: string, doc: Document): string {
  const docTitle = doc.querySelector("title")?.textContent?.trim();
  if (docTitle) return docTitle.slice(0, 72);

  if (typeof DOMParser === "undefined") return "Web clip";
  const wrap = new DOMParser().parseFromString(`<div class="lc-h-root">${fragmentHtml}</div>`, "text/html");
  const root = wrap.querySelector(".lc-h-root");
  if (!root) return "Web clip";
  const h = root.querySelector("h1,h2,h3,h4,h5,h6");
  if (h?.textContent?.trim()) return h.textContent.trim().slice(0, 72);
  const t = root.textContent?.trim().replace(/\s+/g, " ");
  return (t?.slice(0, 72) || "Web clip").trim();
}

function wrapSandboxDocument(headStyles: string, bodyHtml: string): { html: string; truncated: boolean } {
  const safeHead = headStyles.slice(0, IMPORT_SANDBOX_HTML_MAX - 2000);
  const safeBody = bodyHtml.slice(0, IMPORT_SANDBOX_HTML_MAX - safeHead.length - 800);
  const truncated =
    safeHead.length < headStyles.trim().length || safeBody.length < bodyHtml.trim().length;
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>${SANDBOX_BASE_RESET}</style>
<style>${safeHead}</style>
</head><body>${safeBody}</body></html>`;
  return { html: html.slice(0, IMPORT_SANDBOX_HTML_MAX), truncated };
}

function tryBuildRichWebSandbox(rawHtml: string): {
  sandboxHtmlDoc: string;
  fragmentPreview: string;
  titleHint: string;
  linkedStylesheetCount: number;
  truncated: boolean;
} | null {
  if (typeof DOMParser === "undefined") return null;

  const doc = new DOMParser().parseFromString(rawHtml, "text/html");
  const styleMeta = collectDocumentStyles(doc);

  let bodyHtml = extractFragmentBetweenMarkers(rawHtml);
  if (!bodyHtml) {
    bodyHtml = doc.body?.innerHTML ?? "";
  }
  bodyHtml = stripScriptsFromFragment(bodyHtml).trim();
  if (!bodyHtml) return null;

  const titleHint = titleHintFromFragmentHtml(bodyHtml, doc);
  const wrapped = wrapSandboxDocument(styleMeta.bundledCss, bodyHtml);
  return {
    sandboxHtmlDoc: wrapped.html,
    fragmentPreview: bodyHtml.slice(0, IMPORT_CLIPBOARD_TEXT_MAX),
    titleHint,
    linkedStylesheetCount: styleMeta.linkedStylesheetCount,
    truncated: wrapped.truncated,
  };
}

function analyzeCodePath(htmlRaw: string | undefined, plainRaw: string | undefined): AnalyzedClipboardImport {
  const payload = chooseClipboardTextPayload(htmlRaw, plainRaw);
  if (!payload) {
    return {
      visualKind: "plain-text",
      textContent: "",
      fidelity: "code",
      displayTitle: "Empty paste",
    };
  }
  const ext =
    payload.filenameExt === "tsx"
      ? "tsx"
      : payload.filenameExt === "css"
        ? "css"
        : payload.filenameExt === "html"
          ? "html"
          : "txt";
  const visualKind = detectImportedVisualKind(ext, payload.text);
  const textCap =
    visualKind === "jsx"
      ? Math.min(IMPORT_JSX_CLIPBOARD_TEXT_MAX, IMPORT_SANDBOX_HTML_MAX - 14_000)
      : IMPORT_CLIPBOARD_TEXT_MAX;
  const textContent = payload.text.slice(0, textCap);
  return {
    visualKind,
    textContent,
    fidelity: "code",
    displayTitle: formatCodeImportTitle(visualKind, payload.text),
  };
}

/** головний вхід: HTML з clipboard + plain → дескриптор імпорту */
export function analyzeClipboardImport(input: {
  html?: string | null;
  plain?: string | null;
}): AnalyzedClipboardImport {
  const htmlRaw = input.html?.trim() ? input.html.trim() : undefined;
  const plainRaw = input.plain?.replace(/\uFEFF/g, "").trim() ? input.plain.replace(/\uFEFF/g, "").trim() : undefined;

  if (!htmlRaw && !plainRaw) {
    return {
      visualKind: "plain-text",
      textContent: "",
      fidelity: "code",
      displayTitle: "Empty paste",
    };
  }

  if (htmlRaw && isLikelyRichWebClipboardHtml(htmlRaw)) {
    const rich = tryBuildRichWebSandbox(htmlRaw);
    if (rich) {
      const plainFallback = plainRaw?.slice(0, IMPORT_CLIPBOARD_TEXT_MAX) ?? rich.fragmentPreview;
      const warnings: string[] = [];
      if (rich.linkedStylesheetCount > 0) {
        warnings.push(
          `${rich.linkedStylesheetCount} linked stylesheet(s) were not inlined — preview may differ from the site.`,
        );
      }
      if (rich.truncated) {
        warnings.push("Preview HTML was clamped to the storage limit; some markup or styles may be missing.");
      }
      return {
        visualKind: "html",
        textContent: plainFallback,
        sandboxHtmlDoc: rich.sandboxHtmlDoc,
        fidelity: "rich-html",
        displayTitle: `HTML · ${rich.titleHint}`,
        warnings: warnings.length > 0 ? warnings : undefined,
      };
    }
  }

  return analyzeCodePath(htmlRaw, plainRaw);
}

export function analyzedImportToLibraryItemBase(analysis: AnalyzedClipboardImport): Omit<ConstructLibraryItem, "id"> {
  const wide = analysis.fidelity === "rich-html";
  const { text: importedTextContent, importWarnings } = normalizeImportedTextForEditPalette(
    analysis.textContent,
    analysis.visualKind,
    analysis.warnings,
  );
  return {
    title: analysis.displayTitle.slice(0, 120),
    kind: "element",
    category: "import",
    keywords:
      analysis.fidelity === "rich-html"
        ? ["imported", "clipboard", "web-clip", "import"]
        : ["imported", "clipboard", analysis.visualKind, "import"],
    defaultWidth: wide ? 400 : 260,
    defaultHeight: wide ? 260 : 190,
    importedSourceKind: "text",
    importedVisualKind: analysis.visualKind,
    importedMimeType: analysis.fidelity === "rich-html" ? "text/html" : "text/plain",
    importedTextContent,
    importedSandboxHtmlDoc: clampImportedSandboxHtmlDoc(analysis.sandboxHtmlDoc),
    importWarnings,
  };
}
