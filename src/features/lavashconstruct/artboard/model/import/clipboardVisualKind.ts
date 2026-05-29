import * as csstree from "css-tree";
import type { ImportedVisualKind } from "./clipboardTypes";
import {
  ARTBOARD_PREVIEW_FILE_EXTENSIONS,
  isImportableTextFileExtension,
  normalizeFileExtension,
} from "@/features/lavashconstruct/editor/model/importableCodeFiles";

export function parseCssStylesheet(text: string): csstree.CssNode | null {
  try {
    return csstree.parse(text, { context: "stylesheet" });
  } catch {
    return null;
  }
}

function cssAstHasDeclaration(ast: csstree.CssNode): boolean {
  let hasDecl = false;
  csstree.walk(ast, {
    visit: "Declaration",
    enter() {
      hasDecl = true;
    },
  });
  return hasDecl;
}

function looksLikeCssViaAst(text: string): boolean {
  const ast = parseCssStylesheet(text);
  if (!ast) return false;
  return cssAstHasDeclaration(ast);
}

export function detectImportedVisualKind(ext: string, text: string | undefined): ImportedVisualKind {
  if (!text) return "plain-text";
  const trimmed = text.trim();
  const jsxContentSignals =
    /className\s*=/.test(trimmed) ||
    /htmlFor\s*=/.test(trimmed) ||
    /return\s*\(\s*</.test(trimmed) ||
    /<[A-Z][A-Za-z0-9]*(?:\s|\/>|>)/.test(trimmed) ||
    /\bexport\s+default\s+function\b/.test(trimmed);
  const looksLikeJsx =
    ext === "jsx" ||
    (ext === "js" && jsxContentSignals) ||
    (ext === "tsx" && jsxContentSignals) ||
    jsxContentSignals;
  if (looksLikeJsx) return "jsx";
  const tieBreakJsx =
    !/^<!doctype\s+html/i.test(trimmed) &&
    !/<html[\s>]/i.test(trimmed) &&
    /<\w/.test(trimmed) &&
    (/\b(useState|useEffect|useMemo|useCallback|useRef)\s*\(/.test(trimmed) ||
      /\bon[A-Z][a-zA-Z]*=\{/.test(trimmed) ||
      /\{\s*[a-zA-Z_$][\w$]*\.[\w$]+\s*\}/.test(trimmed));
  if (tieBreakJsx) return "jsx";
  if (
    ext === "html" ||
    /^<!doctype html/i.test(trimmed) ||
    /<html[\s>]/i.test(trimmed) ||
    /<body[\s>]/i.test(trimmed) ||
    /<main[\s>]/i.test(trimmed) ||
    /<div[\s>]/i.test(trimmed)
  ) {
    return "html";
  }
  const looksLikeCss =
    ext === "css" ||
    looksLikeCssViaAst(trimmed);
  return looksLikeCss ? "css" : "plain-text";
}

/** Тип превью на артборді: web-стек за вмістом; інші мови — plain-text (код у `<pre>`, без Babel). */
export function resolveImportedVisualKindForFile(ext: string, rawText: string): ImportedVisualKind {
  const normalized = normalizeFileExtension(ext);
  if (normalized && ARTBOARD_PREVIEW_FILE_EXTENSIONS.has(normalized)) {
    return detectImportedVisualKind(normalized, rawText);
  }
  if (normalized && isImportableTextFileExtension(normalized)) {
    return "plain-text";
  }
  return detectImportedVisualKind("txt", rawText);
}
