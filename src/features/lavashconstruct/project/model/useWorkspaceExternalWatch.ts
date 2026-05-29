import { useEffect } from "react";
import { isTauri } from "@tauri-apps/api/core";
import { checkLavashDocumentExternalChange } from "@/features/lavashconstruct/documents/model/lavashDocumentStore";
import { checkProjectFileExternalChange } from "@/features/lavashconstruct/project/model/projectWorkspaceStore";

const POLL_MS = 2000;

/** Poll disk mtimes for open lavash document and project code file. */
export function useWorkspaceExternalWatch(enabled = true): void {
  useEffect(() => {
    if (!enabled || !isTauri()) return;
    const tick = () => {
      void checkLavashDocumentExternalChange();
      void checkProjectFileExternalChange();
    };
    const id = window.setInterval(tick, POLL_MS);
    return () => window.clearInterval(id);
  }, [enabled]);
}
