import { ARTBOARD_INFINITE_PX } from "@/features/lavashconstruct/shared/model/constants";
import type { ArtboardPanel } from "@/features/lavashconstruct/artboard/ui/types";

/** Мінімально штовхаємо панель з AABB-перетинів з іншими прямокутниками (ліміт ітерацій). */
export function resolvePanelOverlap(
  self: ArtboardPanel,
  x: number,
  y: number,
  others: ArtboardPanel[],
): { x: number; y: number } {
  const ART = ARTBOARD_INFINITE_PX;
  const maxXBound = Math.max(0, ART - self.width);
  const maxYBound = Math.max(0, ART - self.height);
  let cx = Math.max(0, Math.min(x, maxXBound));
  let cy = Math.max(0, Math.min(y, maxYBound));

  const maxIter = Math.max(8, others.length * 6);
  for (let iter = 0; iter < maxIter; iter++) {
    let moved = false;
    const left = cx;
    const top = cy;
    const right = cx + self.width;
    const bottom = cy + self.height;
    const midX = (left + right) / 2;
    const midY = (top + bottom) / 2;

    for (const o of others) {
      if (o.id === self.id || !o.isVisible) continue;

      const ol = o.x;
      const ot = o.y;
      const or = o.x + o.width;
      const ob = o.y + o.height;

      const overlapX = Math.min(right, or) - Math.max(left, ol);
      const overlapY = Math.min(bottom, ob) - Math.max(top, ot);
      if (overlapX <= 0 || overlapY <= 0) continue;

      const omidX = (ol + or) / 2;
      const omidY = (ot + ob) / 2;

      if (overlapX < overlapY) {
        cx += midX < omidX ? -overlapX : overlapX;
      } else {
        cy += midY < omidY ? -overlapY : overlapY;
      }
      cx = Math.max(0, Math.min(cx, maxXBound));
      cy = Math.max(0, Math.min(cy, maxYBound));
      moved = true;
      break;
    }
    if (!moved) break;
  }

  return { x: cx, y: cy };
}
