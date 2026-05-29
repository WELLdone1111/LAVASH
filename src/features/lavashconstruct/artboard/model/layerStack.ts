import type { ArtboardPanel } from "@/features/lavashconstruct/artboard/ui/types";

export type PanelStackEdges = {
  /** Одна панель → усі stack-опи ноу-опи. */
  isOnlyPanel: boolean;
  isAtFront: boolean;
  isAtBack: boolean;
};

/** Панелі в одній когорті, коли спільний parent (`undefined` = корінь канви). */
function cohortKey(panel: ArtboardPanel): string {
  return panel.parentId ?? "__ROOT__";
}

/** Сиблінги `panelId`, відсортовані по z-index зростання (зад → перед). */
export function panelsInSameCohortSorted(panels: ArtboardPanel[], panelId: string): ArtboardPanel[] {
  const target = panels.find((p) => p.id === panelId);
  if (!target) return [];
  const key = cohortKey(target);
  return panels.filter((p) => cohortKey(p) === key).sort((a, b) => a.zIndex - b.zIndex);
}

export function getPanelStackEdges(panels: ArtboardPanel[], panelId: string): PanelStackEdges {
  const cohort = panelsInSameCohortSorted(panels, panelId);
  if (cohort.length <= 1) {
    return { isOnlyPanel: true, isAtFront: true, isAtBack: true };
  }
  const panel = cohort.find((p) => p.id === panelId);
  if (!panel) {
    return { isOnlyPanel: false, isAtFront: true, isAtBack: true };
  }
  const zs = cohort.map((p) => p.zIndex);
  const minZ = Math.min(...zs);
  const maxZ = Math.max(...zs);
  return {
    isOnlyPanel: false,
    isAtFront: panel.zIndex === maxZ,
    isAtBack: panel.zIndex === minZ,
  };
}
