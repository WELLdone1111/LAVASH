import { useConstructStore } from "@/features/lavashconstruct/artboard/model/store";
import { toPosixProjectPath } from "@/features/lavashconstruct/project/model/projectArtboardLink";
import { useProjectWorkspaceStore } from "@/features/lavashconstruct/project/model/projectWorkspaceStore";

import {
  SYNC_DEBOUNCE_MS,
  SYNC_MERGE_WINDOW_MS,
  applyCodeToLinkedPanels,
} from "./panelContentSync";
import { artboardCodeSyncMachine } from "./syncStateMachine";

/** Двосторонній live-sync: відкритий файл проєкту ↔ панель з `linkedProjectFilePath`. */
export function startProjectArtboardSync(): () => void {
  const machine = artboardCodeSyncMachine;
  let debProject: ReturnType<typeof setTimeout> | undefined;
  let debArtboard: ReturnType<typeof setTimeout> | undefined;

  const flushProjectToArtboard = () => {
    debProject = undefined;
    if (!machine.canFlush("toArtboard")) return;

    const openFile = useProjectWorkspaceStore.getState().openFile;
    if (!openFile) return;
    const posixPath = toPosixProjectPath(openFile.path);

    machine.withLock("toArtboard", "project", () => {
      const { artboardPanels, commitArtboardPanels: commit } = useConstructStore.getState();
      const { panels, changed } = applyCodeToLinkedPanels(
        artboardPanels,
        (panel) => panel.linkedProjectFilePath,
        (link) => (link === posixPath ? openFile.content : undefined),
      );
      if (!changed) return;
      commit("Live sync from project file", panels, {
        mergeKey: "project-live-import",
        mergeWindowMs: SYNC_MERGE_WINDOW_MS,
      });
    });
  };

  const flushArtboardToProject = () => {
    debArtboard = undefined;
    if (!machine.canFlush("toCode")) return;

    const openFile = useProjectWorkspaceStore.getState().openFile;
    if (!openFile) return;
    const posixPath = toPosixProjectPath(openFile.path);
    const { artboardPanels } = useConstructStore.getState();
    const panel = artboardPanels.find((p) => p.linkedProjectFilePath === posixPath);
    if (!panel || panel.isLocked) return;
    const raw = panel.importedTextContent ?? "";
    if (openFile.content === raw) return;

    machine.withLock("toCode", "project", () => {
      useProjectWorkspaceStore.getState().setOpenFileContent(raw, false);
    });
  };

  const unsubProject = useProjectWorkspaceStore.subscribe((state, prev) => {
    if (machine.shouldIgnoreSource("code")) return;
    if (state.openFile?.content === prev.openFile?.content && state.openFile?.path === prev.openFile?.path) {
      return;
    }
    if (!state.openFile) return;
    if (debProject) clearTimeout(debProject);
    debProject = setTimeout(flushProjectToArtboard, SYNC_DEBOUNCE_MS);
  });

  const unsubArtboard = useConstructStore.subscribe((state, prevState) => {
    if (machine.shouldIgnoreSource("artboard")) return;
    if (state.artboardPanels === prevState.artboardPanels) return;
    const openFile = useProjectWorkspaceStore.getState().openFile;
    if (!openFile) return;
    const posixPath = toPosixProjectPath(openFile.path);
    const hadLink = state.artboardPanels.some((p) => p.linkedProjectFilePath === posixPath);
    if (!hadLink) return;
    if (debArtboard) clearTimeout(debArtboard);
    debArtboard = setTimeout(flushArtboardToProject, SYNC_DEBOUNCE_MS);
  });

  return () => {
    unsubProject();
    unsubArtboard();
    if (debProject) clearTimeout(debProject);
    if (debArtboard) clearTimeout(debArtboard);
  };
}

/** @deprecated Use `startProjectArtboardSync` from `@/features/lavashconstruct/sync`. */
export function startConstructProjectArtboardBidirectionalSync(): () => void {
  return startProjectArtboardSync();
}
