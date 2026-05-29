import { useEffect, useRef } from "react";
import { isTauri } from "@tauri-apps/api/core";
import type { editor } from "monaco-editor";
import * as monaco from "monaco-editor";
import { configureMonacoForExternalLsp } from "@/features/lavashconstruct/editor/model/monacoSetup";
import { getLspSession } from "@/features/lavashconstruct/editor/model/lsp/lspClient";
import { lspServerKeyForMonacoLanguage, lspSupportsLanguage } from "@/features/lavashconstruct/editor/model/lsp/lspRegistry";
import { getWorkspaceFileUri, syncWorkspaceFile } from "@/features/lavashconstruct/editor/model/lsp/workspaceApi";

function isMonacoCanceled(error: unknown): boolean {
  if (error instanceof Error) {
    return error.name === "Canceled" || error.message === "Canceled";
  }
  return (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    String((error as { message: unknown }).message) === "Canceled"
  );
}

function detachOrphanEditorModel(
  previous: monaco.editor.ITextModel | null,
  keep: monaco.editor.ITextModel,
): void {
  if (!previous || previous === keep) return;
  if (previous.uri.scheme === "file") return;
  if (monaco.editor.getModel(previous.uri) === previous) {
    previous.dispose();
  }
}

function attachEditorModel(editorInstance: editor.IStandaloneCodeEditor, model: monaco.editor.ITextModel): void {
  if (editorInstance.getModel()?.uri.toString() === model.uri.toString()) {
    return;
  }
  const previous = editorInstance.getModel();
  editorInstance.setModel(model);
  detachOrphanEditorModel(previous, model);
}

export type UseMonacoLspOptions = {
  enabled?: boolean;
  documentId: string;
  relativePath: string;
  language: string;
  value: string;
  editor: editor.IStandaloneCodeEditor | null;
};

export function useMonacoLsp({
  enabled = true,
  documentId,
  relativePath,
  language,
  value,
  editor,
}: UseMonacoLspOptions): void {
  const mountGenRef = useRef(0);
  const sessionRef = useRef<Awaited<ReturnType<typeof getLspSession>>>(null);
  const boundModelKeyRef = useRef<string | null>(null);
  const lspUriRef = useRef<string | null>(null);
  const syncTimerRef = useRef<number | null>(null);
  const contentListenerRef = useRef<monaco.IDisposable | null>(null);

  const closeBoundDocument = () => {
    const modelKey = boundModelKeyRef.current;
    const session = sessionRef.current;
    if (modelKey && session) {
      session.closeDocument(modelKey);
    }
    boundModelKeyRef.current = null;
  };

  useEffect(() => {
    if (!enabled || !editor || !isTauri() || !lspSupportsLanguage(language)) {
      return;
    }

    const languageKey = lspServerKeyForMonacoLanguage(language);
    if (!languageKey) return;

    configureMonacoForExternalLsp();

    const mountGen = ++mountGenRef.current;
    let disposed = false;
    const isStale = () => disposed || mountGen !== mountGenRef.current;

    const mount = async () => {
      try {
        const diskContent = editor.getModel()?.getValue() ?? value;
        await syncWorkspaceFile(relativePath, diskContent);
        if (isStale()) return;

        const lspUri = await getWorkspaceFileUri(relativePath);
        if (!lspUri || isStale()) return;

        contentListenerRef.current?.dispose();
        contentListenerRef.current = null;
        closeBoundDocument();

        const modelUri = monaco.Uri.parse(lspUri);
        let activeModel = monaco.editor.getModel(modelUri);

        const session = await getLspSession(languageKey);
        if (!session || isStale()) return;
        sessionRef.current = session;

        if (!activeModel) {
          const editorModel = editor.getModel();
          if (editorModel?.uri.toString() === lspUri) {
            activeModel = editorModel;
          } else {
            activeModel = monaco.editor.createModel(value, language, modelUri);
            attachEditorModel(editor, activeModel);
          }
        } else {
          if (activeModel.getValue() !== value) {
            activeModel.setValue(value);
          }
          attachEditorModel(editor, activeModel);
        }

        if (isStale()) return;

        session.registerProviders(language);
        boundModelKeyRef.current = activeModel.uri.toString();
        lspUriRef.current = lspUri;

        await session.openDocument(lspUri, language, activeModel);
        if (isStale()) {
          session.closeDocument(activeModel.uri.toString());
          boundModelKeyRef.current = null;
          lspUriRef.current = null;
          return;
        }

        contentListenerRef.current = activeModel.onDidChangeContent(() => {
          const next = activeModel!.getValue();
          if (syncTimerRef.current) {
            window.clearTimeout(syncTimerRef.current);
          }
          syncTimerRef.current = window.setTimeout(() => {
            void syncWorkspaceFile(relativePath, next);
            const uri = lspUriRef.current;
            if (uri) sessionRef.current?.changeDocument(uri, next);
          }, 180);
        });
      } catch (error) {
        if (!isMonacoCanceled(error)) {
          console.warn("[lsp] mount failed", relativePath, error);
        }
      }
    };

    void mount();

    return () => {
      disposed = true;
      if (syncTimerRef.current) {
        window.clearTimeout(syncTimerRef.current);
        syncTimerRef.current = null;
      }
      contentListenerRef.current?.dispose();
      contentListenerRef.current = null;
      closeBoundDocument();
      lspUriRef.current = null;
    };
  }, [documentId, editor, enabled, language, relativePath]);

  useEffect(() => {
    if (!enabled || !editor || !isTauri() || !lspSupportsLanguage(language)) {
      return;
    }
    const current = editor.getModel();
    if (!current || current.uri.scheme !== "file") return;
    if (current.getValue() === value) return;
    const full = current.getFullModelRange();
    editor.executeEdits("lavash-sync", [{ range: full, text: value }]);
  }, [editor, enabled, language, value]);
}
