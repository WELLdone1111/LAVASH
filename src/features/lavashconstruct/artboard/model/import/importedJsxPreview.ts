import type { Locale } from "@/i18n/locale";
import { readStoredLocale } from "@/i18n/locale";
import { translateBare } from "@/i18n/translateBare";
import {
  IMPORT_JSX_CLIPBOARD_TEXT_MAX,
  IMPORT_SANDBOX_HTML_MAX,
} from "./clipboardTypes";

/** React версія як у shell (Vite / esm.sh) */
const JSX_ESM_REACT_VER = "19.0.0";

const JSX_PREVIEW_STYLES = `html,body{margin:0;padding:0;background:transparent;color:#e8e8e8}
body{font-family:Inter,ui-sans-serif,system-ui,sans-serif;min-height:100%;-webkit-font-smoothing:antialiased}
#lc-jsx-root{display:flex;align-items:center;justify-content:center;min-height:100%;padding:0;box-sizing:border-box;width:100%}
button,input,select,textarea{font:inherit;color:inherit}
button{appearance:none;-webkit-appearance:none;background:#262626;color:#f5f5f5;border:1px solid #404040;border-radius:8px;padding:8px 14px;width:auto;max-width:100%}
button:hover{background:#333}
.lc-jsx-loading{font-size:13px;opacity:.72;letter-spacing:.02em;text-align:center;padding:8px}
.lc-jsx-hint{font-size:12px;opacity:.78;padding:12px;text-align:center;line-height:1.45;max-width:42ch;margin:0 auto}
.lc-jsx-error{margin:0;padding:12px 14px;font:12px/1.5 ui-monospace,Menlo,Consolas,monospace;color:#fecaca;background:#1a0a0a;border:1px solid #7f1d1d;border-radius:10px;white-space:pre-wrap;word-break:break-word;max-width:100%;overflow:auto;box-sizing:border-box}
.lc-jsx-error strong{display:block;font-family:Inter,system-ui,sans-serif;font-size:12px;font-weight:600;color:#fca5a5;margin-bottom:8px;letter-spacing:.02em}
`;

/** import map для iframe — доповнюй, якщо «голий» import не резолвиться */
export function buildJsxImportMapJson(): string {
  const deps = `react@${JSX_ESM_REACT_VER}`;
  const imports: Record<string, string> = {
    react: `https://esm.sh/react@${JSX_ESM_REACT_VER}`,
    "react/jsx-runtime": `https://esm.sh/react@${JSX_ESM_REACT_VER}/jsx-runtime`,
    "react/jsx-dev-runtime": `https://esm.sh/react@${JSX_ESM_REACT_VER}/jsx-dev-runtime`,
    "react-dom": `https://esm.sh/react-dom@${JSX_ESM_REACT_VER}`,
    "react-dom/client": `https://esm.sh/react-dom@${JSX_ESM_REACT_VER}/client`,
    "styled-components": `https://esm.sh/styled-components@6.1.13?deps=${encodeURIComponent(deps)}`,
    "framer-motion": `https://esm.sh/framer-motion@11.11.17?deps=${encodeURIComponent(deps)}`,
    "lucide-react": `https://esm.sh/lucide-react@0.454.0?deps=${encodeURIComponent(deps)}`,
    zustand: `https://esm.sh/zustand@5.0.3?deps=${encodeURIComponent(deps)}`,
    "@radix-ui/": "https://esm.sh/@radix-ui/",
    "@babel/standalone": "https://esm.sh/@babel/standalone@7.26.0",
  };
  return JSON.stringify({ imports });
}

/** бутстрап: import map + Babel для TSX + dynamic import() через blob */
export function getJsxPreviewEsmBootstrap(locale: Locale): string {
  const L = {
    renderError: JSON.stringify(translateBare("construct.preview.renderError", locale)),
    emptyHint: JSON.stringify(translateBare("construct.preview.emptyHint", locale)),
    loading: JSON.stringify(translateBare("construct.preview.loading", locale)),
    babelWord: JSON.stringify(translateBare("construct.preview.babelWord", locale)),
    babelNoCode: JSON.stringify(translateBare("construct.preview.babelNoCode", locale)),
    exportTitle: JSON.stringify(translateBare("construct.preview.exportTitle", locale)),
    exportMissing: JSON.stringify(translateBare("construct.preview.exportMissing", locale)),
    previewError: JSON.stringify(translateBare("construct.preview.previewError", locale)),
  };

  return `
import React from "react";
import { createRoot } from "react-dom/client";
import BabelModule from "@babel/standalone";

const Babel = BabelModule.default ?? BabelModule;

function readUserSource() {
  const el = document.getElementById("lc-user-json");
  if (!el?.textContent?.trim()) return "";
  try {
    return JSON.parse(el.textContent);
  } catch {
    return "";
  }
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

class ConstructErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { err: null };
  }
  static getDerivedStateFromError(err) {
    return { err };
  }
  render() {
    if (this.state.err) {
      const m = String(this.state.err && this.state.err.message ? this.state.err.message : this.state.err);
      const st = this.state.err && this.state.err.stack ? String(this.state.err.stack) : "";
      return React.createElement(
        "div",
        { className: "lc-jsx-error" },
        React.createElement("strong", null, ${L.renderError}),
        React.createElement("pre", null, m),
        st
          ? React.createElement("pre", { style: { opacity: 0.88, fontSize: "11px", marginTop: "8px" } }, st)
          : null,
      );
    }
    return this.props.children;
  }
}

const mountEl = document.getElementById("lc-jsx-root");
let __labPreviewUnmount = null;

async function run() {
  if (!mountEl) return;
  if (typeof __labPreviewUnmount === "function") {
    try {
      __labPreviewUnmount();
    } catch (_) {}
    __labPreviewUnmount = null;
  }
  mountEl.innerHTML = "";

  const userSource = readUserSource();
  if (!userSource.trim()) {
    mountEl.innerHTML =
      '<p class="lc-jsx-hint">' + escapeHtml(${L.emptyHint}) + '</p>';
    return;
  }

  mountEl.innerHTML = '<p class="lc-jsx-loading">' + escapeHtml(${L.loading}) + '</p>';

  try {
    const result = Babel.transform(userSource, {
      filename: "preview.tsx",
      presets: [
        ["typescript", { isTSX: true, allExtensions: true }],
        ["react", { runtime: "automatic" }],
      ],
    });
    const compiled = result?.code ?? "";
    if (!compiled.trim()) {
      mountEl.innerHTML =
        '<div class="lc-jsx-error"><strong>' + escapeHtml(${L.babelWord}) + '</strong><pre>' + escapeHtml(${L.babelNoCode}) + '</pre></div>';
      return;
    }
    const href = URL.createObjectURL(new Blob([compiled], { type: "application/javascript" }));
    try {
      const mod = await import(href);
      const Root = mod?.default;
      if (!Root) {
        mountEl.innerHTML =
          '<div class="lc-jsx-error"><strong>' + escapeHtml(${L.exportTitle}) + '</strong><pre>' + escapeHtml(${L.exportMissing}) + '</pre></div>';
        return;
      }
      mountEl.innerHTML = "";
      const root = createRoot(mountEl);
      __labPreviewUnmount = () => {
        try {
          root.unmount();
        } catch (_) {}
      };
      root.render(
        React.createElement(ConstructErrorBoundary, null, React.createElement(Root)),
      );
    } finally {
      URL.revokeObjectURL(href);
    }
  } catch (err) {
    const msg = String(err && err.message ? err.message : err);
    const st = err && err.stack ? String(err.stack) : "";
    mountEl.innerHTML =
      '<div class="lc-jsx-error"><strong>' + escapeHtml(${L.previewError}) + '</strong><pre>' +
      escapeHtml(msg) +
      "</pre>" +
      (st ? '<pre style="opacity:.88;font-size:11px;margin-top:8px">' + escapeHtml(st) + "</pre>" : "") +
      "</div>";
  }
}

run();
`.trim();
}

function stripMarkdownCodeFence(text: string): string {
  const trimmed = text.trim();
  const fullFence = trimmed.match(/^\s*```(?:tsx|jsx|ts|js)?\s*([\s\S]*?)```\s*$/im);
  if (fullFence?.[1]) return fullFence[1].trim();
  const innerFence = trimmed.match(/```(?:tsx|jsx|ts|js)?\s*([\s\S]*?)```/im);
  return (innerFence?.[1] ?? text).trim();
}

function extractHtmlStyleBlocks(source: string): { styles: string; scriptBody: string } {
  const styles: string[] = [];
  const scriptBody = source.replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gi, (_, css) => {
    styles.push(css.trim());
    return "\n";
  });
  return { styles: styles.filter(Boolean).join("\n\n"), scriptBody: scriptBody.trim() };
}

/** легкий clean jsx-модуля щоб Babel+import map не лягли */
function sanitizeJsxUserModuleSource(source: string): string {
  const lines = source.split("\n");
  const out: string[] = [];
  for (const line of lines) {
    const t = line.trim();
    if (/^import\s+type\b/.test(t)) continue;
    if (/^export\s+type\b/.test(t)) continue;
    if (/^export\s+\{/.test(t)) continue;
    if (/^export\s+\*\s+from\b/.test(t)) continue;
    out.push(line.replace(/\bexport\s+interface\b/, "interface"));
  }
  return out.join("\n").trim();
}

function escapeJsonForHtmlScript(json: string): string {
  return json.replace(/</g, "\\u003c");
}

/** iframe-док: import map + бутстрап; код → Babel → blob import() */
export function buildJsxSandboxHtmlDoc(text: string, locale: Locale = readStoredLocale()): string {
  let bundled = stripMarkdownCodeFence(text).trim();
  bundled = bundled
    .replace(/^\s*["']use client["']\s*;?\s*\r?\n?/i, "")
    .replace(/^\s*["']use server["']\s*;?\s*\r?\n?/i, "")
    .trim();
  const maxUser = Math.min(IMPORT_JSX_CLIPBOARD_TEXT_MAX, IMPORT_SANDBOX_HTML_MAX - 14_000);
  if (bundled.length > maxUser) bundled = bundled.slice(0, maxUser);

  const { styles: extractedCss, scriptBody } = extractHtmlStyleBlocks(bundled);
  const userModule = sanitizeJsxUserModuleSource(scriptBody);

  const safeExtractedCss = extractedCss.replace(/<\/style/gi, "<\\/style");
  const extraStylesBlock = safeExtractedCss ? `<style>${safeExtractedCss}</style>` : "";

  const userJson = escapeJsonForHtmlScript(JSON.stringify(userModule));
  const importMapJson = buildJsxImportMapJson();
  const bootstrap = getJsxPreviewEsmBootstrap(locale).replace(/<\/script/gi, "<\\/script");
  const esmShimsSrc =
    "https://ga.jspm.io/npm:es-module-shims@2.6.2/dist/es-module-shims.js";

  return `<!doctype html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><style>${JSX_PREVIEW_STYLES}</style>${extraStylesBlock}<script async crossorigin="anonymous" src="${esmShimsSrc}"></script></head><body><div id="lc-jsx-root"></div><script type="importmap">${importMapJson}</script><script type="application/json" id="lc-user-json">${userJson}</script><script type="module">${bootstrap}</script></body></html>`;
}
