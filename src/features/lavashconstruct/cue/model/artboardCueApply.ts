import {
  mergeArtboardPanelPatches,
  parseArtboardPanelPatches,
} from "@/features/lavashconstruct/artboard/model/artboardPartialPatch";
import { collectPanelSubtreeIds } from "@/features/lavashconstruct/artboard/model/panelHierarchy";
import { sanitizeArtboardPanels } from "@/features/lavashconstruct/artboard/model/sanitizeArtboardPanels";
import { useConstructStore } from "@/features/lavashconstruct/artboard/model/store";

export function applyCueRemovePanels(panelIds: readonly string[]): boolean {
  const store = useConstructStore.getState();
  if (panelIds.length === 0) return false;

  const idsToRemove = new Set<string>();
  for (const id of panelIds) {
    if (!id.trim()) continue;
    for (const subtreeId of collectPanelSubtreeIds(store.artboardPanels, [id.trim()])) {
      idsToRemove.add(subtreeId);
    }
  }
  if (idsToRemove.size === 0) return false;

  const next = store.artboardPanels.filter((panel) => !idsToRemove.has(panel.id));
  if (next.length === store.artboardPanels.length) return false;

  store.commitArtboardPanels("CUE remove panels", next);
  return true;
}

export function applyCueClearArtboard(): boolean {
  const store = useConstructStore.getState();
  if (store.artboardPanels.length === 0) return false;
  store.commitArtboardPanels("CUE clear artboard", []);
  return true;
}

export function applyCueReplaceArtboard(rawPanels: unknown[]): boolean {
  const panels = sanitizeArtboardPanels(rawPanels);
  if (!panels) return false;
  useConstructStore.getState().commitArtboardPanels("CUE replace artboard", panels);
  return true;
}

export function applyCuePatchArtboard(rawPanels: unknown[], merge: boolean): boolean {
  if (!merge) {
    return applyCueReplaceArtboard(rawPanels);
  }

  const patches = parseArtboardPanelPatches(rawPanels);
  if (patches.length === 0) return false;

  const store = useConstructStore.getState();
  const merged = mergeArtboardPanelPatches(store.artboardPanels, patches);
  if (!merged) return false;

  store.commitArtboardPanels("CUE patch artboard", merged);
  return true;
}

export function applyCueReorderPanels(orderedIds: readonly string[], parentId?: string): boolean {
  const ids = orderedIds.map((id) => id.trim()).filter(Boolean);
  if (ids.length === 0) return false;

  const store = useConstructStore.getState();
  const parent = parentId?.trim();
  if (parent) {
    const before = store.artboardPanels.map((p) => ({ ...p }));
    store.reorderCompositionPanels(parent, ids);
    const after = useConstructStore.getState().artboardPanels;
    return JSON.stringify(before) !== JSON.stringify(after);
  }

  const before = store.artboardPanels.map((p) => ({ ...p }));
  store.reorderArtboardPanels(ids);
  const after = useConstructStore.getState().artboardPanels;
  return JSON.stringify(before) !== JSON.stringify(after);
}

export function applyCueSelectPanel(panelId: string | null): boolean {
  const store = useConstructStore.getState();
  const nextId = panelId?.trim() || null;
  if (nextId && !store.artboardPanels.some((p) => p.id === nextId)) return false;
  store.setSelectedPanelId(nextId);
  return true;
}
