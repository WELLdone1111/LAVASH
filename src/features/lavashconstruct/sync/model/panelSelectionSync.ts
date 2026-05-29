import { canPanelEditSourceCode } from "@/features/lavashconstruct/artboard/model/artboardPanelScreenAnchor";
import type { ArtboardPanel } from "@/features/lavashconstruct/artboard/ui/types";
import { useConstructCodeScratchStore } from "@/features/lavashconstruct/editor/model/codeScratchStore";
import { toPosixProjectPath } from "@/features/lavashconstruct/project/model/projectArtboardLink";
import { useProjectWorkspaceStore } from "@/features/lavashconstruct/project/model/projectWorkspaceStore";

export type FocusPanelCodeOptions = {
  openEditPanel: (panelId: string) => void;
  setProjectViewMode?: (mode: "design" | "split" | "code") => void;
};

/** Відкриває код, пов’язаний з панеллю: project file, scratch tab або edit panel. */
export function focusPanelLinkedCode(panel: ArtboardPanel, options: FocusPanelCodeOptions): void {
  const projectPath = panel.linkedProjectFilePath?.trim();
  if (projectPath) {
    const open = useProjectWorkspaceStore.getState().openFile;
    const normalized = toPosixProjectPath(projectPath);
    if (!open || toPosixProjectPath(open.path) !== normalized) {
      void useProjectWorkspaceStore.getState().openProjectFile(normalized);
    }
    options.setProjectViewMode?.("split");
    return;
  }

  const scratchTabId = panel.linkedScratchTabId?.trim();
  if (scratchTabId) {
    const scratch = useConstructCodeScratchStore.getState();
    if (scratch.tabs.some((tab) => tab.id === scratchTabId)) {
      scratch.setActiveTabId(scratchTabId);
    }
    options.setProjectViewMode?.("code");
    return;
  }

  if (canPanelEditSourceCode(panel)) {
    options.openEditPanel(panel.id);
  }
}
