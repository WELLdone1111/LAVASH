import { useConstructCodeScratchStore } from "@/features/lavashconstruct/editor/model/codeScratchStore";
import { useConstructStore } from "@/features/lavashconstruct/artboard/model/store";
import type { ArtboardPanel } from "@/features/lavashconstruct/artboard/ui/types";

import {
  SYNC_DEBOUNCE_MS,
  SYNC_MERGE_WINDOW_MS,
  applyCodeToLinkedPanels,
  forEachLinkedPanelCode,
} from "./panelContentSync";
import { artboardCodeSyncMachine } from "./syncStateMachine";

function readScratchTabContent(tabId: string): string | undefined {
  const tab = useConstructCodeScratchStore.getState().tabs.find((t) => t.id === tabId);
  return tab?.content;
}

function clearOrphanScratchLink(panel: ArtboardPanel): ArtboardPanel | null {
  if (!panel.linkedScratchTabId) return null;
  return { ...panel, linkedScratchTabId: undefined };
}

/** Двосторонній live-sync: CODE scratch ↔ панелі з `linkedScratchTabId`. */
export function startScratchArtboardSync(): () => void {
  const machine = artboardCodeSyncMachine;
  let debScratch: ReturnType<typeof setTimeout> | undefined;
  let debArtboard: ReturnType<typeof setTimeout> | undefined;

  const flushScratchToArtboard = () => {
    debScratch = undefined;
    if (!machine.canFlush("toArtboard")) return;

    machine.withLock("toArtboard", "scratch", () => {
      const { artboardPanels, commitArtboardPanels: commit } = useConstructStore.getState();
      const { panels, changed } = applyCodeToLinkedPanels(
        artboardPanels,
        (panel) => panel.linkedScratchTabId,
        readScratchTabContent,
        clearOrphanScratchLink,
      );
      if (!changed) return;
      commit("Live sync from Code scratch", panels, {
        mergeKey: "scratch-live-import",
        mergeWindowMs: SYNC_MERGE_WINDOW_MS,
      });
    });
  };

  const flushArtboardToScratch = () => {
    debArtboard = undefined;
    if (!machine.canFlush("toCode")) return;

    machine.withLock("toCode", "scratch", () => {
      const { setTabContent } = useConstructCodeScratchStore.getState();
      const { artboardPanels } = useConstructStore.getState();

      forEachLinkedPanelCode(
        artboardPanels,
        (panel) => panel.linkedScratchTabId,
        (tabId, raw) => {
          const tab = useConstructCodeScratchStore.getState().tabs.find((t) => t.id === tabId);
          if (!tab || tab.content === raw) return;
          setTabContent(tabId, raw);
        },
      );
    });
  };

  const unsubScratch = useConstructCodeScratchStore.subscribe(() => {
    if (machine.shouldIgnoreSource("code")) return;
    if (debScratch) clearTimeout(debScratch);
    debScratch = setTimeout(flushScratchToArtboard, SYNC_DEBOUNCE_MS);
  });

  const unsubArtboard = useConstructStore.subscribe((state, prevState) => {
    if (machine.shouldIgnoreSource("artboard")) return;
    if (state.artboardPanels === prevState.artboardPanels) return;
    if (debArtboard) clearTimeout(debArtboard);
    debArtboard = setTimeout(flushArtboardToScratch, SYNC_DEBOUNCE_MS);
  });

  return () => {
    unsubScratch();
    unsubArtboard();
    if (debScratch) clearTimeout(debScratch);
    if (debArtboard) clearTimeout(debArtboard);
  };
}

/** @deprecated Use `startScratchArtboardSync` from `@/features/lavashconstruct/sync`. */
export function startConstructScratchArtboardBidirectionalSync(): () => void {
  return startScratchArtboardSync();
}
