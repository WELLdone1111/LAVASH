import { artboardCodeSyncMachine } from "@/features/lavashconstruct/sync/model/syncStateMachine";
import { useConstructCodeScratchStore } from "@/features/lavashconstruct/editor/model/codeScratchStore";
import { useConstructStore } from "@/features/lavashconstruct/artboard/model/store";

/** Додатковий контекст для режиму Debug. */
export function buildConstructDebugContextForModel(): string {
  const sync = artboardCodeSyncMachine.snapshot();
  const { artboardPanels, selectedPanelId } = useConstructStore.getState();
  const scratch = useConstructCodeScratchStore.getState();

  const lines = [
    "[LavashConstruct debug snapshot]",
    `sync.direction=${sync.direction}`,
    `sync.depth=${sync.depth}`,
    `sync.channel=${sync.channel ?? "none"}`,
    `artboard.panels=${artboardPanels.length}`,
    `artboard.selectedPanelId=${selectedPanelId ?? "none"}`,
    `scratch.tabs=${scratch.tabs.length}`,
    `scratch.activeTabId=${scratch.activeTabId}`,
  ];

  for (const tab of scratch.tabs.slice(0, 8)) {
    const len = tab.content.length;
    lines.push(`scratch.tab id=${tab.id} label="${tab.label}" chars=${len}`);
  }

  return lines.join("\n");
}
