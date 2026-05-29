import Editor, { type OnMount } from "@monaco-editor/react";
import type { editor } from "monaco-editor";
import { useCallback, useEffect, useMemo, useState } from "react";
import { isTauri } from "@tauri-apps/api/core";
import { ensureMonacoEnvironment } from "@/features/lavashconstruct/editor/model/monacoSetup";
import { resolveMonacoLanguage, type ResolveMonacoLanguageInput } from "@/features/lavashconstruct/editor/model/detectLanguage";
import { workspaceRelativePath } from "@/features/lavashconstruct/editor/model/lsp/lspRegistry";
import { useMonacoLsp } from "@/features/lavashconstruct/editor/model/lsp/useMonacoLsp";
import { getWorkspaceFileUri, syncWorkspaceFile } from "@/features/lavashconstruct/editor/model/lsp/workspaceApi";

export type ConstructMonacoEditorProps = {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  height?: string | number;
  languageInput?: ResolveMonacoLanguageInput;
  readOnly?: boolean;
  /** Stable id for virtual workspace file + LSP document. */
  documentId?: string;
  /** When set, LSP reads/writes this path in the active workspace (project folder). */
  workspaceRelativePath?: string;
  enableLsp?: boolean;
};

ensureMonacoEnvironment();

export default function ConstructMonacoEditor({
  value,
  onChange,
  className,
  height = "280px",
  languageInput,
  readOnly = false,
  documentId,
  workspaceRelativePath: workspaceRelativePathProp,
  enableLsp = true,
}: ConstructMonacoEditorProps) {
  const language = useMemo(() => resolveMonacoLanguage(languageInput ?? {}), [languageInput]);
  const [monacoEditor, setMonacoEditor] = useState<editor.IStandaloneCodeEditor | null>(null);
  const resolvedDocumentId = documentId ?? "lavash-doc";
  const relativePath = useMemo(
    () => workspaceRelativePathProp ?? workspaceRelativePath(resolvedDocumentId, language),
    [language, resolvedDocumentId, workspaceRelativePathProp],
  );

  const useExternalLsp = enableLsp && !readOnly && isTauri();
  const [lspModelPath, setLspModelPath] = useState<string | null>(null);

  useEffect(() => {
    if (!useExternalLsp) {
      setLspModelPath(null);
      return;
    }

    let cancelled = false;
    void (async () => {
      await syncWorkspaceFile(relativePath, value);
      const uri = await getWorkspaceFileUri(relativePath);
      if (!cancelled) {
        setLspModelPath(uri);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [relativePath, useExternalLsp]);

  const handleMount = useCallback<OnMount>((instance: editor.IStandaloneCodeEditor) => {
    setMonacoEditor(instance);
    instance.focus();
  }, []);

  useEffect(() => {
    if (!monacoEditor) return;

    const syncLayoutDuringResize = () => {
      const splitting = document.documentElement.hasAttribute("data-lc-split-dragging");
      monacoEditor.updateOptions({ automaticLayout: !splitting });
      if (!splitting) monacoEditor.layout();
    };

    syncLayoutDuringResize();
    const observer = new MutationObserver(syncLayoutDuringResize);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-lc-split-dragging"],
    });
    return () => observer.disconnect();
  }, [monacoEditor]);

  useMonacoLsp({
    enabled: enableLsp && !readOnly,
    documentId: resolvedDocumentId,
    relativePath,
    language,
    value,
    editor: monacoEditor,
  });

  const handleChange = useCallback(
    (next: string | undefined) => {
      onChange(next ?? "");
    },
    [onChange],
  );

  const options = useMemo<editor.IStandaloneEditorConstructionOptions>(
    () => ({
      readOnly,
      stickyScroll: { enabled: !useExternalLsp },
      minimap: { enabled: true },
      fontSize: 13,
      lineHeight: 20,
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
      fontLigatures: false,
      automaticLayout: true,
      wordWrap: "on",
      scrollBeyondLastLine: false,
      smoothScrolling: true,
      cursorBlinking: "smooth",
      cursorSmoothCaretAnimation: "on",
      renderLineHighlight: "all",
      bracketPairColorization: { enabled: true },
      guides: { bracketPairs: true, indentation: true },
      padding: { top: 8, bottom: 8 },
      tabSize: 2,
      insertSpaces: true,
      folding: true,
      lineNumbers: "on",
      glyphMargin: true,
      quickSuggestions: { other: true, comments: false, strings: true },
      suggestOnTriggerCharacters: true,
      scrollbar: {
        verticalScrollbarSize: 10,
        horizontalScrollbarSize: 10,
      },
    }),
    [readOnly, useExternalLsp],
  );

  const editorKey = useExternalLsp ? relativePath : resolvedDocumentId;

  if (useExternalLsp && !lspModelPath) {
    return <div className={className} style={{ height, minHeight: height }} aria-busy="true" />;
  }

  return (
    <Editor
      key={editorKey}
      className={className}
      height={height}
      language={language}
      theme="vs-dark"
      {...(useExternalLsp ? { defaultValue: value, path: lspModelPath ?? undefined } : { value })}
      onChange={handleChange}
      onMount={handleMount}
      loading={null}
      options={options}
    />
  );
}
