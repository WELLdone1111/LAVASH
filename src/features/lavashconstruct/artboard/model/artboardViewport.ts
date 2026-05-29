import { ARTBOARD_INFINITE_PX } from "@/features/lavashconstruct/shared/model/constants";

/** Дозволений діапазон pan для фіксованого артборду в screen-space (після клампу). */
export function artboardPanExtents(
  zoom: number,
  viewportW: number,
  viewportH: number,
): { minX: number; maxX: number; minY: number; maxY: number } {
  const vw = Math.max(0, viewportW);
  const vh = Math.max(0, viewportH);
  const z = Math.max(zoom, 1e-4);
  const worldW = ARTBOARD_INFINITE_PX * z;
  const worldH = ARTBOARD_INFINITE_PX * z;

  let minX: number;
  let maxX: number;
  if (worldW <= vw) {
    const centered = (vw - worldW) / 2;
    minX = centered;
    maxX = centered;
  } else {
    minX = vw - worldW;
    maxX = 0;
  }

  let minY: number;
  let maxY: number;
  if (worldH <= vh) {
    const centered = (vh - worldH) / 2;
    minY = centered;
    maxY = centered;
  } else {
    minY = vh - worldH;
    maxY = 0;
  }

  return { minX, maxX, minY, maxY };
}

export function clampConstructArtboardPan(
  pan: { x: number; y: number },
  zoom: number,
  viewportW: number,
  viewportH: number,
): { x: number; y: number } {
  const ex = artboardPanExtents(zoom, viewportW, viewportH);
  return {
    x: Math.min(ex.maxX, Math.max(ex.minX, pan.x)),
    y: Math.min(ex.maxY, Math.max(ex.minY, pan.y)),
  };
}

/** Pan, який центрує артборд у в’юпорті (дефолт / ресет). */
export function centeredConstructArtboardPan(
  zoom: number,
  viewportW: number,
  viewportH: number,
): { x: number; y: number } {
  const ex = artboardPanExtents(zoom, viewportW, viewportH);
  return {
    x: (ex.minX + ex.maxX) / 2,
    y: (ex.minY + ex.maxY) / 2,
  };
}
