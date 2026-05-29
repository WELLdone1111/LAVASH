import type { ArtboardPanel } from "@/features/lavashconstruct/artboard/ui/types";
import {
  applyCodeToLinkedPanels,
  forEachLinkedPanelCode,
} from "@/features/lavashconstruct/sync/model/panelContentSync";

export type ScratchTabSnapshot = { id: string; content: string };

function scratchLinkResolver(panel: ArtboardPanel): string | undefined {
  return panel.linkedScratchTabId;
}

/** Code scratch → artboard panels (pure). */
export function computeScratchToArtboard(
  panels: ArtboardPanel[],
  readScratch: (tabId: string) => string | undefined,
  onOrphanLink?: (panel: ArtboardPanel) => ArtboardPanel | null,
): { panels: ArtboardPanel[]; changed: boolean } {
  return applyCodeToLinkedPanels(panels, scratchLinkResolver, readScratch, onOrphanLink);
}

/** Artboard → scratch tabs; лише вкладки, де контент реально змінився. */
export function collectArtboardToScratchUpdates(
  panels: ArtboardPanel[],
  tabs: readonly ScratchTabSnapshot[],
): { tabId: string; content: string }[] {
  const tabById = new Map(tabs.map((tab) => [tab.id, tab]));
  const updates: { tabId: string; content: string }[] = [];

  forEachLinkedPanelCode(panels, scratchLinkResolver, (tabId, raw) => {
    const tab = tabById.get(tabId);
    if (!tab || tab.content === raw) return;
    updates.push({ tabId, content: raw });
  });

  return updates;
}

/** @deprecated Prefer `collectArtboardToScratchUpdates`. */
export function applyArtboardToScratchInPlace(
  panels: ArtboardPanel[],
  tabs: ScratchTabSnapshot[],
  setTabContent: (tabId: string, content: string) => void,
): void {
  for (const { tabId, content } of collectArtboardToScratchUpdates(panels, tabs)) {
    setTabContent(tabId, content);
  }
}
