import type { ArtboardPanel } from "@/features/lavashconstruct/artboard/ui/types";
import { getPanelWorldBounds } from "@/features/lavashconstruct/artboard/model/panelHierarchy";
import {
  ARTBOARD_EMPTY_FALLBACK_H,
  ARTBOARD_EMPTY_FALLBACK_W,
  ARTBOARD_MIN_SPAN_PX,
  ARTBOARD_PAD_PX,
} from "@/features/lavashconstruct/shared/model/constants";

/** Тайт-бокс навколо панелей (+ паддінг). Тільки для «вмістити в екран», не для лімітів pan. */
export type PanelsFitBounds = { minX: number; minY: number; maxX: number; maxY: number };

export function computePanelsBoundsForFit(panels: ArtboardPanel[]): PanelsFitBounds {
  const pad = ARTBOARD_PAD_PX;
  if (panels.length === 0) {
    return { minX: 0, minY: 0, maxX: ARTBOARD_EMPTY_FALLBACK_W, maxY: ARTBOARD_EMPTY_FALLBACK_H };
  }

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (const p of panels) {
    if (!p.isVisible) continue;
    const b = getPanelWorldBounds(p, panels);
    minX = Math.min(minX, b.x);
    minY = Math.min(minY, b.y);
    maxX = Math.max(maxX, b.x + b.width);
    maxY = Math.max(maxY, b.y + b.height);
  }

  minX -= pad;
  minY -= pad;
  maxX += pad;
  maxY += pad;

  const minSpan = ARTBOARD_MIN_SPAN_PX;
  if (maxX - minX < minSpan) {
    const mid = (minX + maxX) / 2;
    minX = mid - minSpan / 2;
    maxX = mid + minSpan / 2;
  }
  if (maxY - minY < minSpan) {
    const mid = (minY + maxY) / 2;
    minY = mid - minSpan / 2;
    maxY = mid + minSpan / 2;
  }

  return { minX, minY, maxX, maxY };
}
