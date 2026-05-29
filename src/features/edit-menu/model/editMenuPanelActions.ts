import { ARTBOARD_INFINITE_PX } from "@/features/lavashconstruct/shared/model/constants";
import {
  collectPanelSubtreeIds,
  getPanelWorldBounds,
  normalizeArtboardPanelsHierarchy,
} from "@/features/lavashconstruct/artboard/model/panelHierarchy";
import type { ArtboardPanel } from "@/features/lavashconstruct/artboard/ui/types";

export function resolveCurrentPanelIds(
  selectedPanelIds: string[],
  selectedPanelId: string | null,
): string[] {
  return selectedPanelIds.length > 0 ? selectedPanelIds : selectedPanelId ? [selectedPanelId] : [];
}

export function copyPanelsFromSelection(
  artboardPanels: ArtboardPanel[],
  currentIds: string[],
): ArtboardPanel[] {
  if (currentIds.length === 0) return [];
  return artboardPanels
    .filter((panel) => currentIds.includes(panel.id))
    .sort((a, b) => a.zIndex - b.zIndex)
    .map((panel) => ({ ...panel }));
}

export function createPastedPanelClones(
  copiedPanels: ArtboardPanel[],
  artboardPanels: ArtboardPanel[],
): { clones: ArtboardPanel[]; nextIds: string[] } {
  const existingTitles = new Set(artboardPanels.map((panel) => panel.title));
  const maxZ = artboardPanels.reduce((max, panel) => Math.max(max, panel.zIndex), 0);
  const nextIds: string[] = [];
  const clones = copiedPanels.map((panel, index) => {
    let title = `${panel.title} Copy`;
    let titleN = 2;
    while (existingTitles.has(title)) {
      title = `${panel.title} Copy ${titleN}`;
      titleN += 1;
    }
    existingTitles.add(title);
    const id = `${panel.id}-copy-${crypto.randomUUID().slice(0, 8)}`;
    nextIds.push(id);
    const maxX = Math.max(0, ARTBOARD_INFINITE_PX - panel.width);
    const maxY = Math.max(0, ARTBOARD_INFINITE_PX - panel.height);
    const world = getPanelWorldBounds(panel, artboardPanels);
    const baseX = panel.parentId ? world.x : panel.x;
    const baseY = panel.parentId ? world.y : panel.y;
    return {
      ...panel,
      linkedScratchTabId: undefined,
      id,
      title,
      parentId: undefined,
      localX: undefined,
      localY: undefined,
      x: Math.max(0, Math.min(maxX, baseX + 28 + index * 10)),
      y: Math.max(0, Math.min(maxY, baseY + 28 + index * 10)),
      zIndex: maxZ + index + 1,
      isLocked: false,
    };
  });
  return { clones, nextIds };
}

export function deleteSelectedPanels(
  artboardPanels: ArtboardPanel[],
  currentIds: string[],
): { nextPanels: ArtboardPanel[]; nextSelectedId: string | null } | null {
  if (currentIds.length === 0) return null;
  const selected = artboardPanels.filter((panel) => currentIds.includes(panel.id));
  const deletable = selected.filter((panel) => !panel.isLocked).map((panel) => panel.id);
  if (deletable.length === 0) return null;
  const idsToRemove = collectPanelSubtreeIds(artboardPanels, deletable);
  const nextPanels = artboardPanels.filter((panel) => !idsToRemove.has(panel.id));
  const nextSelectedId = nextPanels[nextPanels.length - 1]?.id ?? null;
  return { nextPanels, nextSelectedId };
}

export function canCutSelection(artboardPanels: ArtboardPanel[], currentIds: string[]): boolean {
  if (currentIds.length === 0) return false;
  return artboardPanels.some((panel) => currentIds.includes(panel.id) && !panel.isLocked);
}

export function pastePanelsOntoArtboard(
  copiedPanels: ArtboardPanel[],
  artboardPanels: ArtboardPanel[],
): { nextPanels: ArtboardPanel[]; nextIds: string[] } | null {
  if (copiedPanels.length === 0) return null;
  const { clones, nextIds } = createPastedPanelClones(copiedPanels, artboardPanels);
  const nextPanels = normalizeArtboardPanelsHierarchy([...artboardPanels, ...clones]);
  return { nextPanels, nextIds };
}
