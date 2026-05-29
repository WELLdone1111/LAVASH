import * as monaco from "monaco-editor";
import type {
  CompletionItem,
  CompletionList,
  Diagnostic,
  Hover,
  InlayHint,
  Location,
  LocationLink,
  MarkupContent,
  TextEdit,
} from "vscode-languageserver-types";

type PublishDiagnosticsParams = {
  uri: string;
  diagnostics: Diagnostic[];
};
import {
  createTauriLspConnection,
  startLspServer,
  stopLspServer,
  type LspStartResult,
} from "@/features/lavashconstruct/editor/model/lsp/tauriTransport";
import { sendLspRequestWithTimeout } from "@/features/lavashconstruct/editor/model/lsp/lspRequestTimeout";

type ManagedDocument = {
  /** URI для LSP (file:// на диску). */
  lspUri: string;
  languageId: string;
  version: number;
  model: monaco.editor.ITextModel;
};

function findManagedDocument(
  documents: Map<string, ManagedDocument>,
  model: monaco.editor.ITextModel,
): ManagedDocument | undefined {
  for (const doc of documents.values()) {
    if (doc.model === model) return doc;
  }
  return undefined;
}

function findDocumentByLspUri(
  documents: Map<string, ManagedDocument>,
  lspUri: string,
): ManagedDocument | undefined {
  for (const doc of documents.values()) {
    if (doc.lspUri === lspUri) return doc;
  }
  return undefined;
}

function toLspRange(range: monaco.IRange) {
  return {
    start: { line: range.startLineNumber - 1, character: range.startColumn - 1 },
    end: { line: range.endLineNumber - 1, character: range.endColumn - 1 },
  };
}

type ProviderDisposables = monaco.IDisposable[];

function isRequestCanceled(error: unknown): boolean {
  if (error instanceof Error) {
    return error.name === "Canceled" || error.message === "Canceled";
  }
  return false;
}

async function withLspProviderGuard<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (isRequestCanceled(error)) return fallback;
    throw error;
  }
}

export class LavashLspSession {
  readonly sessionId: string;
  readonly workspaceUri: string;
  readonly languageKey: string;
  private connection: ReturnType<typeof createTauriLspConnection>;
  private initialized = false;
  private initPromise: Promise<void> | null = null;
  private documents = new Map<string, ManagedDocument>();
  private providerDisposables: ProviderDisposables = [];

  private constructor(result: LspStartResult, languageKey: string) {
    this.sessionId = result.sessionId;
    this.workspaceUri = result.workspaceUri;
    this.languageKey = languageKey;
    this.connection = createTauriLspConnection(result.sessionId);
  }

  static async acquire(languageKey: string): Promise<LavashLspSession> {
    const result = await startLspServer(languageKey);
    const session = new LavashLspSession(result, languageKey);
    await session.ensureInitialized();
    return session;
  }

  private async ensureInitialized(): Promise<void> {
    if (this.initialized) return;
    if (!this.initPromise) {
      this.initPromise = this.initialize();
    }
    await this.initPromise;
  }

  private async initialize(): Promise<void> {
    this.connection.onNotification("textDocument/publishDiagnostics", (params: PublishDiagnosticsParams) => {
      const doc = findDocumentByLspUri(this.documents, params.uri);
      if (!doc) return;
      const markers = params.diagnostics.map((d: Diagnostic) => toMonacoMarker(doc.model, d));
      monaco.editor.setModelMarkers(doc.model, "lavash-lsp", markers);
    });

    this.connection.listen();

    await sendLspRequestWithTimeout(this.connection, "initialize", {
      processId: null,
      clientInfo: { name: "lavash", version: "0.1.0-alpha.1" },
      capabilities: {
        textDocument: {
          completion: {
            completionItem: {
              snippetSupport: true,
              commitCharactersSupport: true,
            },
          },
          hover: { contentFormat: ["markdown", "plaintext"] },
          synchronization: { dynamicRegistration: false },
          publishDiagnostics: { relatedInformation: true },
          formatting: { dynamicRegistration: false },
          definition: { dynamicRegistration: false },
          inlayHint: { dynamicRegistration: false },
        },
      },
      rootUri: this.workspaceUri,
      workspaceFolders: [{ uri: this.workspaceUri, name: "lavash-workspace" }],
    });

    this.connection.sendNotification("initialized", {});
    this.initialized = true;
  }

  registerProviders(languageId: string): void {
    if (this.providerDisposables.length > 0) return;

    this.providerDisposables.push(
      monaco.languages.registerCompletionItemProvider(languageId, {
        triggerCharacters: [".", "<", '"', "'", "/", "@", "#"],
        provideCompletionItems: async (model, position) => {
          const doc = findManagedDocument(this.documents, model);
          if (!doc) return { suggestions: [] };
          return withLspProviderGuard(async () => {
            const result = await sendLspRequestWithTimeout(this.connection, "textDocument/completion", {
              textDocument: { uri: doc.lspUri },
              position: { line: position.lineNumber - 1, character: position.column - 1 },
            });
            return toMonacoCompletions(model, result as CompletionItem[] | CompletionList | null);
          }, { suggestions: [] });
        },
      }),

      monaco.languages.registerHoverProvider(languageId, {
        provideHover: async (model, position) => {
          const doc = findManagedDocument(this.documents, model);
          if (!doc) return null;
          return withLspProviderGuard(async () => {
            const result = await sendLspRequestWithTimeout(this.connection, "textDocument/hover", {
              textDocument: { uri: doc.lspUri },
              position: { line: position.lineNumber - 1, character: position.column - 1 },
            });
            return toMonacoHover(result as Hover | null);
          }, null);
        },
      }),

      monaco.languages.registerInlayHintsProvider(languageId, {
        provideInlayHints: async (model, range) => {
          const doc = findManagedDocument(this.documents, model);
          if (!doc) return { hints: [], dispose: () => {} };
          return withLspProviderGuard(async () => {
            const result = await sendLspRequestWithTimeout(this.connection, "textDocument/inlayHint", {
              textDocument: { uri: doc.lspUri },
              range: toLspRange(range),
            });
            return {
              hints: toMonacoInlayHints(result as InlayHint[] | null),
              dispose: () => {},
            };
          }, { hints: [], dispose: () => {} });
        },
      }),

      monaco.languages.registerDefinitionProvider(languageId, {
        provideDefinition: async (model, position) => {
          const doc = findManagedDocument(this.documents, model);
          if (!doc) return null;
          return withLspProviderGuard(async () => {
            const result = await sendLspRequestWithTimeout(this.connection, "textDocument/definition", {
              textDocument: { uri: doc.lspUri },
              position: { line: position.lineNumber - 1, character: position.column - 1 },
            });
            return toMonacoDefinition(result as Location | Location[] | LocationLink[] | null);
          }, null);
        },
      }),

      monaco.languages.registerDocumentFormattingEditProvider(languageId, {
        provideDocumentFormattingEdits: async (model) => {
          const doc = findManagedDocument(this.documents, model);
          if (!doc) return [];
          return withLspProviderGuard(async () => {
            const edits = await sendLspRequestWithTimeout(this.connection, "textDocument/formatting", {
              textDocument: { uri: doc.lspUri },
              options: { tabSize: 2, insertSpaces: true },
            });
            return toMonacoTextEdits(edits as TextEdit[] | null);
          }, []);
        },
      }),
    );
  }

  async openDocument(
    lspUri: string,
    languageId: string,
    model: monaco.editor.ITextModel,
  ): Promise<void> {
    await this.ensureInitialized();
    const modelKey = model.uri.toString();
    const existing = this.documents.get(modelKey);
    if (existing && existing.model === model && existing.lspUri === lspUri) {
      return;
    }
    if (existing) {
      this.closeDocument(modelKey);
    }

    const doc: ManagedDocument = {
      lspUri,
      languageId,
      version: 1,
      model,
    };
    this.documents.set(modelKey, doc);

    this.connection.sendNotification("textDocument/didOpen", {
      textDocument: {
        uri: lspUri,
        languageId,
        version: doc.version,
        text: model.getValue(),
      },
    });
  }

  changeDocument(lspUri: string, text: string): void {
    const doc = [...this.documents.values()].find((d) => d.lspUri === lspUri);
    if (!doc) return;
    doc.version += 1;
    this.connection.sendNotification("textDocument/didChange", {
      textDocument: { uri: lspUri, version: doc.version },
      contentChanges: [{ text }],
    });
  }

  closeDocument(modelKey: string): void {
    const doc = this.documents.get(modelKey);
    if (!doc) return;
    this.connection.sendNotification("textDocument/didClose", {
      textDocument: { uri: doc.lspUri },
    });
    monaco.editor.setModelMarkers(doc.model, "lavash-lsp", []);
    this.documents.delete(modelKey);
  }

  dispose(): void {
    for (const modelKey of [...this.documents.keys()]) {
      this.closeDocument(modelKey);
    }
    for (const disposable of this.providerDisposables) {
      disposable.dispose();
    }
    this.providerDisposables = [];
    this.connection.dispose();
    void stopLspServer(this.sessionId);
  }
}

const sessionCache = new Map<string, Promise<LavashLspSession>>();

export async function disposeAllLspSessions(): Promise<void> {
  const pending = [...sessionCache.values()];
  sessionCache.clear();
  const sessions = await Promise.all(pending.map((p) => p.catch(() => null)));
  for (const session of sessions) {
    session?.dispose();
  }
}

export async function getLspSession(languageKey: string): Promise<LavashLspSession | null> {
  try {
    let pending = sessionCache.get(languageKey);
    if (!pending) {
      pending = LavashLspSession.acquire(languageKey);
      sessionCache.set(languageKey, pending);
    }
    return await pending;
  } catch (error) {
    sessionCache.delete(languageKey);
    console.warn("[lsp] session unavailable", languageKey, error);
    return null;
  }
}

function toMonacoMarker(model: monaco.editor.ITextModel, diagnostic: Diagnostic): monaco.editor.IMarkerData {
  void model;
  const startLine = Math.max(1, (diagnostic.range.start.line ?? 0) + 1);
  const startCol = Math.max(1, (diagnostic.range.start.character ?? 0) + 1);
  const endLine = Math.max(startLine, (diagnostic.range.end.line ?? 0) + 1);
  const endCol = Math.max(startCol, (diagnostic.range.end.character ?? 0) + 1);
  return {
    severity: toMonacoSeverity(diagnostic.severity),
    message: diagnostic.message,
    source: diagnostic.source ?? "LSP",
    startLineNumber: startLine,
    startColumn: startCol,
    endLineNumber: endLine,
    endColumn: endCol,
  };
}

function toMonacoSeverity(severity?: number): monaco.MarkerSeverity {
  switch (severity) {
    case 1:
      return monaco.MarkerSeverity.Error;
    case 2:
      return monaco.MarkerSeverity.Warning;
    case 3:
      return monaco.MarkerSeverity.Info;
    case 4:
      return monaco.MarkerSeverity.Hint;
    default:
      return monaco.MarkerSeverity.Info;
  }
}

function completionLabel(item: CompletionItem): string {
  if (typeof item.label === "string") return item.label;
  return String((item.label as { label: string }).label);
}

function toMonacoCompletions(
  model: monaco.editor.ITextModel,
  result: CompletionItem[] | CompletionList | null,
): monaco.languages.CompletionList {
  const items = Array.isArray(result) ? result : (result?.items ?? []);
  return {
    suggestions: items.map((item) => {
      const label = completionLabel(item);
      const textEdit = item.textEdit && "range" in item.textEdit ? item.textEdit : null;
      return {
        label,
        kind: toMonacoCompletionKind(item.kind),
        insertText: item.insertText ?? label,
        range: textEdit
          ? toMonacoRangeFromLsp(textEdit.range)
          : {
              startLineNumber: model.getPositionAt(0).lineNumber,
              startColumn: 1,
              endLineNumber: model.getPositionAt(model.getValueLength()).lineNumber,
              endColumn: 1,
            },
        detail: item.detail,
        documentation: markupToString(item.documentation),
        sortText: item.sortText,
        filterText: item.filterText,
      };
    }),
  };
}

function toMonacoCompletionKind(kind?: number): monaco.languages.CompletionItemKind {
  const map: monaco.languages.CompletionItemKind[] = [
    monaco.languages.CompletionItemKind.Text,
    monaco.languages.CompletionItemKind.Method,
    monaco.languages.CompletionItemKind.Function,
    monaco.languages.CompletionItemKind.Constructor,
    monaco.languages.CompletionItemKind.Field,
    monaco.languages.CompletionItemKind.Variable,
    monaco.languages.CompletionItemKind.Class,
    monaco.languages.CompletionItemKind.Interface,
    monaco.languages.CompletionItemKind.Module,
    monaco.languages.CompletionItemKind.Property,
    monaco.languages.CompletionItemKind.Unit,
    monaco.languages.CompletionItemKind.Value,
    monaco.languages.CompletionItemKind.Enum,
    monaco.languages.CompletionItemKind.Keyword,
    monaco.languages.CompletionItemKind.Snippet,
    monaco.languages.CompletionItemKind.Color,
    monaco.languages.CompletionItemKind.File,
    monaco.languages.CompletionItemKind.Reference,
    monaco.languages.CompletionItemKind.Folder,
    monaco.languages.CompletionItemKind.EnumMember,
    monaco.languages.CompletionItemKind.Constant,
    monaco.languages.CompletionItemKind.Struct,
    monaco.languages.CompletionItemKind.Event,
    monaco.languages.CompletionItemKind.Operator,
    monaco.languages.CompletionItemKind.TypeParameter,
  ];
  if (kind === undefined || kind < 1 || kind >= map.length) {
    return monaco.languages.CompletionItemKind.Text;
  }
  return map[kind] ?? monaco.languages.CompletionItemKind.Text;
}

function toMonacoHover(hover: Hover | null): monaco.languages.Hover | null {
  if (!hover) return null;
  const contents = Array.isArray(hover.contents)
    ? hover.contents.map((c) => (typeof c === "string" ? c : c.value)).join("\n\n")
    : typeof hover.contents === "string"
      ? hover.contents
      : hover.contents.value;
  const range = hover.range
    ? {
        startLineNumber: hover.range.start.line + 1,
        startColumn: hover.range.start.character + 1,
        endLineNumber: hover.range.end.line + 1,
        endColumn: hover.range.end.character + 1,
      }
    : undefined;
  return { contents: [{ value: contents }], range };
}

function toMonacoDefinition(result: Location | Location[] | LocationLink[] | null) {
  if (!result) return null;
  const entries = Array.isArray(result) ? result : [result];
  return entries.map((entry) => {
    if ("targetUri" in entry) {
      return {
        uri: monaco.Uri.parse(entry.targetUri),
        range: toMonacoRangeFromLsp(entry.targetRange),
      };
    }
    return {
      uri: monaco.Uri.parse(entry.uri),
      range: toMonacoRangeFromLsp(entry.range),
    };
  });
}

function toMonacoTextEdits(edits: TextEdit[] | null): monaco.languages.TextEdit[] {
  if (!edits) return [];
  return edits.map((edit) => ({
    range: toMonacoRangeFromLsp(edit.range),
    text: edit.newText,
  }));
}

function toMonacoRangeFromLsp(range: Diagnostic["range"]): monaco.IRange {
  return {
    startLineNumber: range.start.line + 1,
    startColumn: range.start.character + 1,
    endLineNumber: range.end.line + 1,
    endColumn: range.end.character + 1,
  };
}

function markupToString(value: string | MarkupContent | undefined): string | undefined {
  if (!value) return undefined;
  return typeof value === "string" ? value : value.value;
}

function inlayHintLabel(hint: InlayHint): string {
  if (typeof hint.label === "string") return hint.label;
  return hint.label.map((part) => part.value).join("");
}

function toMonacoInlayHints(hints: InlayHint[] | null): monaco.languages.InlayHint[] {
  if (!hints?.length) return [];
  return hints.map((hint) => ({
    label: inlayHintLabel(hint),
    position: {
      lineNumber: hint.position.line + 1,
      column: hint.position.character + 1,
    },
    paddingLeft: hint.paddingLeft,
    paddingRight: hint.paddingRight,
  }));
}
