import type { ArtboardPanel } from "@/features/lavashconstruct/artboard/ui/types";
import { useConstructStore } from "@/features/lavashconstruct/artboard/model/store";
import {
  type ConstructCodeTab,
  useConstructCodeScratchStore,
} from "@/features/lavashconstruct/editor/model/codeScratchStore";
import { artboardCodeSyncMachine } from "@/features/lavashconstruct/sync/model/syncStateMachine";

export type ConstructChatRevertSnapshot = {
  artboardPanels: ArtboardPanel[];
  selectedPanelId: string | null;
  scratchTabs: ConstructCodeTab[];
  scratchActiveTabId: string;
};

function cloneSnapshot<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/** Стан артборда + CODE scratch одразу перед застосуванням відповіді асистента. */
export function captureConstructChatRevertSnapshot(): ConstructChatRevertSnapshot {
  const construct = useConstructStore.getState();
  const scratch = useConstructCodeScratchStore.getState();
  return {
    artboardPanels: cloneSnapshot(construct.artboardPanels),
    selectedPanelId: construct.selectedPanelId,
    scratchTabs: cloneSnapshot(scratch.tabs),
    scratchActiveTabId: scratch.activeTabId,
  };
}

/** Відновлює workspace до знімка (без echo у live-sync). */
export function restoreConstructChatRevertSnapshot(snapshot: ConstructChatRevertSnapshot): void {
  artboardCodeSyncMachine.withSyncPaused(() => {
    useConstructCodeScratchStore.getState().restoreSnapshot(snapshot.scratchTabs, snapshot.scratchActiveTabId);
    useConstructStore.getState().setArtboardPanelsDirect(snapshot.artboardPanels);
    useConstructStore.getState().setSelectedPanelId(snapshot.selectedPanelId);
  });
}

/** Перший revertSnapshot assistant-повідомлення після індексу (для edit user msg). */
export function findRevertSnapshotAfterMessageIndex<
  T extends { role: string; revertSnapshot?: ConstructChatRevertSnapshot },
>(messages: readonly T[], fromIndex: number): ConstructChatRevertSnapshot | null {
  for (let i = fromIndex + 1; i < messages.length; i += 1) {
    const msg = messages[i];
    if (msg.role === "assistant" && msg.revertSnapshot) {
      return msg.revertSnapshot;
    }
  }
  return null;
}

/** Залишає revertSnapshot лише на останніх N assistant-повідомленнях (localStorage). */
export function trimRevertSnapshotsForPersist<T extends { role: string; revertSnapshot?: unknown }>(
  messages: readonly T[],
  keepLast = 10,
): T[] {
  let remaining = keepLast;
  const out = new Array<T>(messages.length);
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const msg = messages[i];
    if (msg.role === "assistant" && msg.revertSnapshot) {
      if (remaining > 0) {
        out[i] = msg;
        remaining -= 1;
      } else {
        const { revertSnapshot: _drop, ...rest } = msg;
        out[i] = rest as T;
      }
    } else {
      out[i] = msg;
    }
  }
  return out;
}
