import { useLavashDocumentStore } from "@/features/lavashconstruct/documents/model/lavashDocumentStore";
import { useProjectWorkspaceStore } from "@/features/lavashconstruct/project/model/projectWorkspaceStore";

export function hasUnsavedWorkspaceChanges(): boolean {
  const lavash = useLavashDocumentStore.getState();
  const { openFile } = useProjectWorkspaceStore.getState();
  const projectDirty = Boolean(openFile?.dirty);
  return lavash.dirty || projectDirty;
}

export function confirmDiscardWorkspaceChanges(message: string): boolean {
  if (!hasUnsavedWorkspaceChanges()) return true;
  return window.confirm(message);
}
