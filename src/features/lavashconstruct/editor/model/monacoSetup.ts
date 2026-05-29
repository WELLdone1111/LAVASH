import { loader } from "@monaco-editor/react";
import editorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import cssWorker from "monaco-editor/esm/vs/language/css/css.worker?worker";
import htmlWorker from "monaco-editor/esm/vs/language/html/html.worker?worker";
import jsonWorker from "monaco-editor/esm/vs/language/json/json.worker?worker";
import tsWorker from "monaco-editor/esm/vs/language/typescript/ts.worker?worker";
import * as monaco from "monaco-editor";
import { isTauri } from "@tauri-apps/api/core";

loader.config({ monaco });

let configured = false;
let externalLspConfigured = false;
let skipTypeScriptWorker = false;
let monacoCanceledGuardInstalled = false;

export function isMonacoCanceledReason(reason: unknown): boolean {
  if (reason instanceof Error) {
    return reason.name === "Canceled" || reason.message === "Canceled";
  }
  return (
    typeof reason === "object" &&
    reason !== null &&
    "message" in reason &&
    String((reason as { message: unknown }).message) === "Canceled"
  );
}

function installMonacoCanceledGuard(): void {
  if (monacoCanceledGuardInstalled || typeof window === "undefined") return;
  monacoCanceledGuardInstalled = true;
  window.addEventListener("unhandledrejection", (event) => {
    if (isMonacoCanceledReason(event.reason)) {
      event.preventDefault();
    }
  });
}

/** Вимикає вбудований TS/JS IntelliSense у Monaco — підказки/діагностика з LSP (файли на диску). */
export function configureMonacoForExternalLsp(): void {
  if (externalLspConfigured) return;
  externalLspConfigured = true;
  installMonacoCanceledGuard();
  // ts.worker потрібен для підсвітки; editorWorker ламає tsMode (getSyntacticDiagnostics тощо).
  skipTypeScriptWorker = false;

  const tsLang = monaco.languages.typescript as unknown as {
    typescriptDefaults: TsLanguageDefaults;
    javascriptDefaults: TsLanguageDefaults;
  };
  const diagnostics = {
    noSemanticValidation: true,
    noSyntaxValidation: true,
    noSuggestionDiagnostics: true,
  };
  const inlayHints = {
    includeInlayParameterNameHints: "none" as const,
    includeInlayVariableTypeHints: false,
    includeInlayFunctionLikeReturnTypeHints: false,
    includeInlayPropertyDeclarationTypeHints: false,
    includeInlayEnumMemberValueHints: false,
  };
  const modeConfiguration = {
    completionItems: false,
    diagnostics: false,
    documentFormattingEdits: false,
    documentRangeFormattingEdits: false,
    hovers: false,
    documentHighlights: false,
    definitions: false,
    references: false,
    documentSymbols: false,
    rename: false,
    signatureHelp: false,
    onTypeFormattingEdits: false,
    codeActions: false,
    inlayHints: false,
    linkedEditing: false,
  };
  for (const defaults of [tsLang.typescriptDefaults, tsLang.javascriptDefaults]) {
    defaults.setDiagnosticsOptions(diagnostics);
    defaults.setInlayHintsOptions(inlayHints);
    defaults.setEagerModelSync(false);
    defaults.setModeConfiguration?.(modeConfiguration);
  }
}

type TsLanguageDefaults = {
  setDiagnosticsOptions: (opts: Record<string, boolean | string>) => void;
  setInlayHintsOptions: (opts: Record<string, boolean | string>) => void;
  setEagerModelSync: (enabled: boolean) => void;
  setModeConfiguration?: (opts: Record<string, boolean>) => void;
};

export function monacoEditorUriForWorkspaceFile(relativePath: string): string {
  const normalized = relativePath.replace(/\\/g, "/").replace(/^\/+/, "");
  return `lavash://workspace/${normalized}`;
}

export function ensureMonacoEnvironment(): void {
  if (configured) return;
  configured = true;

  if (isTauri()) {
    configureMonacoForExternalLsp();
  }

  self.MonacoEnvironment = {
    getWorker(_workerId: string, label: string) {
      if (skipTypeScriptWorker && (label === "typescript" || label === "javascript")) {
        return new editorWorker();
      }
      switch (label) {
        case "json":
          return new jsonWorker();
        case "css":
        case "scss":
        case "less":
          return new cssWorker();
        case "html":
        case "handlebars":
        case "razor":
          return new htmlWorker();
        case "typescript":
        case "javascript":
          return new tsWorker();
        default:
          return new editorWorker();
      }
    },
  };
}
