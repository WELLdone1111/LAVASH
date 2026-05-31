import {
  ARTBOARD_GRID_DENSITY,
  ARTBOARD_GRID_SCREEN_PITCH_TARGET,
  ARTBOARD_ZOOM_MAX,
  ARTBOARD_ZOOM_MIN,
} from "@/features/lavashconstruct/shared/model/constants";

export type ArtboardGridPitchLayout = {
  pitch: number;
  majorPitch: number;
  offsetX: number;
  offsetY: number;
  majorOffsetX: number;
  majorOffsetY: number;
};

const roundPx = (n: number) => Math.round(n * 1000) / 1000;

/** Єдине джерело кроку сітки крапок (world + screen px). */
export function computeArtboardGridPitch(
  artboardZoom: number,
  panX: number,
  panY: number,
): ArtboardGridPitchLayout {
  const z = Math.max(ARTBOARD_ZOOM_MIN, Math.min(ARTBOARD_ZOOM_MAX, artboardZoom));
  const basePitchWorld = 14 / Math.sqrt(ARTBOARD_GRID_DENSITY);
  const rawPitchScreen = basePitchWorld * z;
  const normalizePow2 = Math.round(Math.log2(ARTBOARD_GRID_SCREEN_PITCH_TARGET / rawPitchScreen));
  const screenPitch = rawPitchScreen * 2 ** normalizePow2;
  const majorPitch = screenPitch * 5;
  const pxPanX = Math.round(panX);
  const pxPanY = Math.round(panY);

  return {
    pitch: roundPx(screenPitch),
    majorPitch: roundPx(majorPitch),
    offsetX: roundPx(((pxPanX % screenPitch) + screenPitch) % screenPitch),
    offsetY: roundPx(((pxPanY % screenPitch) + screenPitch) % screenPitch),
    majorOffsetX: roundPx(((pxPanX % majorPitch) + majorPitch) % majorPitch),
    majorOffsetY: roundPx(((pxPanY % majorPitch) + majorPitch) % majorPitch),
  };
}
