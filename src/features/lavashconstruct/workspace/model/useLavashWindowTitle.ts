import { useEffect } from "react";
import { isTauri } from "@tauri-apps/api/core";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { useLavashDocumentStore } from "@/features/lavashconstruct/documents/model/lavashDocumentStore";
import { useProjectWorkspaceStore } from "@/features/lavashconstruct/project/model/projectWorkspaceStore";

const BASE_TITLE = "LAVASH";

export function useLavashWindowTitle(): void {
  const docName = useLavashDocumentStore((s) => s.displayName);
  const docDirty = useLavashDocumentStore((s) => s.dirty);
  const docPath = useLavashDocumentStore((s) => s.filePath);
  const codePath = useProjectWorkspaceStore((s) => s.openFile?.path);
  const codeDirty = useProjectWorkspaceStore((s) => s.openFile?.dirty);

  useEffect(() => {
    const parts: string[] = [];
    if (docPath || docDirty) {
      parts.push(`${docName}${docDirty ? " •" : ""}`);
    }
    if (codePath) {
      const short = codePath.replace(/\\/g, "/").split("/").pop() ?? codePath;
      parts.push(`${short}${codeDirty ? " •" : ""}`);
    }
    const title = parts.length > 0 ? `${parts.join(" — ")} — ${BASE_TITLE}` : BASE_TITLE;
    document.title = title;
    if (!isTauri()) return;
    void getCurrentWebviewWindow().setTitle(title).catch(() => {
      /* ignore if window not ready */
    });
  }, [docName, docDirty, docPath, codePath, codeDirty]);
}
