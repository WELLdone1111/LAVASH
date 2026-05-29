import * as monaco from "monaco-editor";
import type { Location, LocationLink } from "vscode-languageserver-types";
import { useProjectWorkspaceStore } from "@/features/lavashconstruct/project/model/projectWorkspaceStore";
import { lspUriToRelativePath } from "@/features/lavashconstruct/editor/model/lsp/lspUriUtils";

export { lspUriToRelativePath } from "@/features/lavashconstruct/editor/model/lsp/lspUriUtils";

export function openLspLocationInProject(location: Location | LocationLink): boolean {
  const uri = "targetUri" in location ? location.targetUri : location.uri;
  const rel = lspUriToRelativePath(uri);
  if (!rel) return false;
  const root = useProjectWorkspaceStore.getState().projectRoot;
  if (!root) return false;
  void useProjectWorkspaceStore.getState().openProjectFile(rel);
  return true;
}

export function toMonacoDefinitionWithNavigation(
  result: Location | Location[] | LocationLink[] | null,
  currentLspUri: string,
): monaco.languages.Location[] | null {
  if (!result) return null;
  const entries = Array.isArray(result) ? result : [result];
  const locations: monaco.languages.Location[] = [];

  for (const entry of entries) {
    const uri = "targetUri" in entry ? entry.targetUri : entry.uri;
    const range = "targetUri" in entry ? entry.targetRange : entry.range;

    if (uri !== currentLspUri) {
      openLspLocationInProject(entry);
      continue;
    }

    locations.push({
      uri: monaco.Uri.parse(uri),
      range: {
        startLineNumber: range.start.line + 1,
        startColumn: range.start.character + 1,
        endLineNumber: range.end.line + 1,
        endColumn: range.end.character + 1,
      },
    });
  }

  return locations.length > 0 ? locations : null;
}

export function toMonacoLocations(
  result: Location | Location[] | null,
): monaco.languages.Location[] | null {
  if (!result) return null;
  const entries = Array.isArray(result) ? result : [result];
  return entries.map((entry) => ({
    uri: monaco.Uri.parse(entry.uri),
    range: {
      startLineNumber: entry.range.start.line + 1,
      startColumn: entry.range.start.character + 1,
      endLineNumber: entry.range.end.line + 1,
      endColumn: entry.range.end.character + 1,
    },
  }));
}

export function toMonacoWorkspaceEdit(
  edit: { changes?: Record<string, { range: Location["range"]; newText: string }[]> } | null,
): monaco.languages.WorkspaceEdit | null {
  if (!edit?.changes) return null;
  const edits: monaco.languages.IWorkspaceTextEdit[] = [];
  for (const [uri, textEdits] of Object.entries(edit.changes)) {
    for (const te of textEdits) {
      edits.push({
        resource: monaco.Uri.parse(uri),
        textEdit: {
          range: {
            startLineNumber: te.range.start.line + 1,
            startColumn: te.range.start.character + 1,
            endLineNumber: te.range.end.line + 1,
            endColumn: te.range.end.character + 1,
          },
          text: te.newText,
        },
        versionId: undefined,
      });
    }
  }
  return { edits };
}
