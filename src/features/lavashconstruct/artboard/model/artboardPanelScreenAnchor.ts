import { getPanelWorldBounds } from "@/features/lavashconstruct/artboard/model/panelHierarchy";
import type { ArtboardPanel } from "@/features/lavashconstruct/artboard/ui/types";

export type ArtboardViewportTransform = {
  zoom: number;
  panX: number;
  panY: number;
};

/** World bounds → screen px (viewport coords) relative to artboard board element. */
export function getPanelScreenRect(
  panel: ArtboardPanel,
  panels: ArtboardPanel[],
  boardEl: HTMLElement,
  viewport: ArtboardViewportTransform,
): DOMRect {
  const boardRect = boardEl.getBoundingClientRect();
  const zoom = Math.max(viewport.zoom || 1, 1e-4);
  const wb = getPanelWorldBounds(panel, panels);
  const left = boardRect.left + viewport.panX + wb.x * zoom;
  const top = boardRect.top + viewport.panY + wb.y * zoom;
  return new DOMRect(left, top, wb.width * zoom, wb.height * zoom);
}

/** Anchor for floating editor — top-right corner of panel on screen. */
export function getPanelFloatingEditorAnchor(
  panel: ArtboardPanel,
  panels: ArtboardPanel[],
  boardEl: HTMLElement,
  viewport: ArtboardViewportTransform,
): { x: number; y: number } {
  const rect = getPanelScreenRect(panel, panels, boardEl, viewport);
  return {
    x: rect.right + 12,
    y: rect.top - 20,
  };
}

export function canPanelEditSourceCode(panel: ArtboardPanel): boolean {
  if (panel.constructWidgetId) return true;
  if (panel.importedSourceKind === "text") return true;
  return false;
}
