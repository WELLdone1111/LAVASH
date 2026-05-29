import { readStoredLocale } from "@/i18n/locale";
import {
  injectContextMenuBlocker,
  injectExtraCssIntoHtmlDocument,
} from "./clipboardClamp";
import {
  HTML_STRUCTURE_REPAIRED_NOTE,
  IMPORT_SANDBOX_HTML_MAX,
  type ImportedPanelPreviewInput,
} from "./clipboardTypes";
import { detectImportedVisualKind } from "./clipboardVisualKind";
import { buildCssSandboxHtmlDoc } from "./importedCssPreview";
import {
  ensureCompleteHtmlDocument,
  prepareHtmlForArtboardPreview,
} from "./importedHtmlDocument";
import { buildJsxSandboxHtmlDoc } from "./importedJsxPreview";

const HTML_FRAGMENT_WRAP_NOTE =
  "HTML fragment was wrapped in a minimal document shell for iframe preview.";

function mergeHtmlPreviewExtraCss(doc: string, extraCss: string | undefined, warnings: string[]): string {
  const trimmed = extraCss?.trim();
  if (!trimmed) return doc;
  let next = injectExtraCssIntoHtmlDocument(doc, trimmed);
  if (next.length > IMPORT_SANDBOX_HTML_MAX) {
    next = next.slice(0, IMPORT_SANDBOX_HTML_MAX);
    warnings.push("Preview HTML was clamped after merging CSS.");
  }
  return next;
}

/** схоже на jsx/tsx-модуль для iframe-превʼю якщо kind не заданий */
function textLooksLikeJsxModule(text: string): boolean {
  const t = text.trim();
  if (detectImportedVisualKind("tsx", t) === "jsx") return true;
  return (
    /\bimport\s+React\b/.test(t) ||
    /\bimport\s*\{[^}]*\}\s*from\s*['"]react['"]/.test(t) ||
    /\bimport\s+\*\s+as\s+React\b/.test(t) ||
    /\bfrom\s+['"]react['"]/.test(t) ||
    /\bfrom\s+['"]react-dom/.test(t) ||
    /\bstyled-components\b/.test(t) ||
    /\bexport\s+default\b/.test(t) ||
    /\b(const|function)\s+[A-Z][A-Za-z0-9_]*\s*=\s*\(/.test(t) ||
    /\bexport\s+function\s+[A-Z]/.test(t)
  );
}

/** srcDoc + тимчасові варнінги зверху збережених importWarnings */
export function buildImportedSandboxDocumentWithMeta(panel: ImportedPanelPreviewInput): {
  doc: string | null;
  warnings: string[];
} {
  const warnings: string[] = [...(panel.importWarnings ?? [])];

  const sandbox = panel.importedSandboxHtmlDoc?.trim();
  if (sandbox && panel.importedSourceKind === "text") {
    if (panel.importedVisualKind === "html") {
      const doc = mergeHtmlPreviewExtraCss(sandbox, panel.importedHtmlPreviewExtraCss, warnings);
      return { doc: injectContextMenuBlocker(doc), warnings };
    }
    return { doc: injectContextMenuBlocker(sandbox), warnings };
  }

  const text = panel.importedTextContent?.trim();
  if (!text || panel.importedSourceKind !== "text") {
    return { doc: null, warnings };
  }

  const inferredKind =
    panel.importedVisualKind && panel.importedVisualKind !== "plain-text"
      ? panel.importedVisualKind
      : textLooksLikeJsxModule(text)
        ? "jsx"
        : detectImportedVisualKind("txt", text);

  switch (inferredKind) {
    case "jsx": {
      let doc = buildJsxSandboxHtmlDoc(text, readStoredLocale());
      doc = mergeHtmlPreviewExtraCss(doc, panel.importedHtmlPreviewExtraCss, warnings);
      return { doc: injectContextMenuBlocker(doc), warnings };
    }
    case "html": {
      let doc: string;
      if (/^<!doctype\s+html/i.test(text) || /<\s*html[\s>]/i.test(text)) {
        const prep = prepareHtmlForArtboardPreview(text);
        doc = prep.html;
        if (prep.repaired && !warnings.includes(HTML_STRUCTURE_REPAIRED_NOTE)) {
          warnings.push(HTML_STRUCTURE_REPAIRED_NOTE);
        }
      } else {
        if (!warnings.includes(HTML_FRAGMENT_WRAP_NOTE)) {
          warnings.push(HTML_FRAGMENT_WRAP_NOTE);
        }
        doc = ensureCompleteHtmlDocument(text);
      }
      doc = mergeHtmlPreviewExtraCss(doc, panel.importedHtmlPreviewExtraCss, warnings);
      return { doc: injectContextMenuBlocker(doc), warnings };
    }
    case "css":
      return {
        doc: injectContextMenuBlocker(buildCssSandboxHtmlDoc(text, panel.importedCssPreviewMarkup)),
        warnings,
      };
    default:
      return { doc: null, warnings };
  }
}

/** повний srcDoc для текст-панелі або null якщо тільки plain / без превʼю */
export function buildImportedSandboxDocument(panel: ImportedPanelPreviewInput): string | null {
  return buildImportedSandboxDocumentWithMeta(panel).doc;
}
