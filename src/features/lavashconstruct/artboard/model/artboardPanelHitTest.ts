import { getPanelWorldBounds } from "@/features/lavashconstruct/artboard/model/panelHierarchy";
import type { ArtboardPanel } from "@/features/lavashconstruct/artboard/ui/types";

/** AI / import preview — Alt-chord edit mode (move, resize, editor). */
export function panelUsesAltEditMode(panel: ArtboardPanel): boolean {
  return Boolean(panel.importedSourceKind);
}

export function clientPointToArtboardWorld(
  clientX: number,
  clientY: number,
  boardRect: DOMRect,
  pan: { x: number; y: number },
  zoom: number,
): { x: number; y: number } {
  const z = Math.max(zoom || 1, 1e-4);
  return {
    x: (clientX - boardRect.left - pan.x) / z,
    y: (clientY - boardRect.top - pan.y) / z,
  };
}

/** Topmost root panel under screen point (for wheel / hover chords). */
export function findTopmostRootPanelAtClientPoint(
  clientX: number,
  clientY: number,
  boardRect: DOMRect,
  pan: { x: number; y: number },
  zoom: number,
  panels: ArtboardPanel[],
): ArtboardPanel | null {
  const { x, y } = clientPointToArtboardWorld(clientX, clientY, boardRect, pan, zoom);
  const roots = panels
    .filter((p) => p.isVisible && !p.parentId)
    .sort((a, b) => b.zIndex - a.zIndex);
  for (const panel of roots) {
    const b = getPanelWorldBounds(panel, panels);
    if (x >= b.x && x <= b.x + b.width && y >= b.y && y <= b.y + b.height) {
      return panel;
    }
  }
  return null;
}
