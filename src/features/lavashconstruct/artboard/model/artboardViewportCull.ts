import type { ArtboardPanel } from "@/features/lavashconstruct/artboard/ui/types";
import { getPanelWorldBounds } from "@/features/lavashconstruct/artboard/model/panelHierarchy";

export type ArtboardViewportCullInput = {
  panels: ArtboardPanel[];
  zoom: number;
  panX: number;
  panY: number;
  viewportW: number;
  viewportH: number;
  /** Extra screen px around viewport to pre-render panels */
  marginPx?: number;
  alwaysIncludeIds?: ReadonlySet<string>;
};

function rectsIntersect(
  a: { left: number; top: number; right: number; bottom: number },
  b: { left: number; top: number; right: number; bottom: number },
): boolean {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

/** Root panels visible in the artboard viewport (screen-space cull). */
export function filterRootPanelsForViewport(input: ArtboardViewportCullInput): ArtboardPanel[] {
  const {
    panels,
    zoom,
    panX,
    panY,
    viewportW,
    viewportH,
    marginPx = 160,
    alwaysIncludeIds,
  } = input;

  const z = Math.max(zoom, 1e-4);
  const vw = Math.max(0, viewportW);
  const vh = Math.max(0, viewportH);
  if (vw === 0 || vh === 0) return panels.filter((p) => p.isVisible && !p.parentId);

  const viewRect = {
    left: -marginPx,
    top: -marginPx,
    right: vw + marginPx,
    bottom: vh + marginPx,
  };

  const roots = panels.filter((p) => p.isVisible && !p.parentId);

  return roots.filter((panel) => {
    if (alwaysIncludeIds?.has(panel.id)) return true;
    const b = getPanelWorldBounds(panel, panels);
    const screen = {
      left: b.x * z + panX,
      top: b.y * z + panY,
      right: (b.x + b.width) * z + panX,
      bottom: (b.y + b.height) * z + panY,
    };
    return rectsIntersect(screen, viewRect);
  });
}
