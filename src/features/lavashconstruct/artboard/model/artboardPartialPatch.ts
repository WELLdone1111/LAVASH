import { sanitizeArtboardPanels } from "@/features/lavashconstruct/artboard/model/sanitizeArtboardPanels";
import type { ArtboardPanel } from "@/features/lavashconstruct/artboard/ui/types";

const PATCH_KEYS: (keyof ArtboardPanel)[] = [
  "title",
  "x",
  "y",
  "width",
  "height",
  "zIndex",
  "isVisible",
  "isLocked",
  "lockAspectRatio",
  "opacity",
  "blurPx",
  "borderRadiusPx",
  "backgroundColor",
  "isNeonGlowEnabled",
  "neonGlow",
  "neonGlowColor",
  "isShadowEnabled",
  "shadowX",
  "shadowY",
  "shadowBlur",
  "shadowSpread",
  "shadowOpacity",
  "shadowColor",
  "edgeGlow",
  "hoverScale",
  "rotationDeg",
  "transitionMs",
  "transitionCurve",
  "importedSourceKind",
  "importedVisualKind",
  "importedMimeType",
  "importedTextContent",
  "importedDataUrl",
  "importedSandboxHtmlDoc",
  "importWarnings",
  "importedCssPreviewMarkup",
  "importedHtmlPreviewExtraCss",
  "parentId",
  "isBoardContainer",
  "localX",
  "localY",
  "clipChildren",
  "constructWidgetId",
  "constructWidgetAccentColor",
  "linkedScratchTabId",
  "linkedProjectFilePath",
];

function readPatchId(raw: Record<string, unknown>): string | null {
  const id = typeof raw.id === "string" ? raw.id.trim() : "";
  return id.length > 0 ? id : null;
}

/** Частковий patch панелі з JSON моделі (лише наявні поля). */
export function parseArtboardPanelPatch(raw: unknown): (Partial<ArtboardPanel> & { id: string }) | null {
  if (!raw || typeof raw !== "object") return null;
  const source = raw as Record<string, unknown>;
  const id = readPatchId(source);
  if (!id) return null;

  const patch: Partial<ArtboardPanel> & { id: string } = { id };
  for (const key of PATCH_KEYS) {
    if (key in source && source[key] !== undefined) {
      (patch as Record<string, unknown>)[key] = source[key];
    }
  }
  return patch;
}

export function parseArtboardPanelPatches(rawPanels: unknown[]): Array<Partial<ArtboardPanel> & { id: string }> {
  const out: Array<Partial<ArtboardPanel> & { id: string }> = [];
  for (const raw of rawPanels) {
    const patch = parseArtboardPanelPatch(raw);
    if (patch) out.push(patch);
  }
  return out;
}

function shallowMergePanel(base: ArtboardPanel, patch: Partial<ArtboardPanel>): ArtboardPanel {
  const merged: ArtboardPanel = { ...base };
  for (const key of PATCH_KEYS) {
    if (patch[key] !== undefined) {
      (merged as Record<string, unknown>)[key as string] = patch[key];
    }
  }
  return merged;
}

/** merge:true — оновлює лише передані поля; нові id додаються як повні панелі. */
export function mergeArtboardPanelPatches(
  current: ArtboardPanel[],
  patches: Array<Partial<ArtboardPanel> & { id: string }>,
): ArtboardPanel[] | null {
  if (patches.length === 0) return null;

  const currentIds = new Set(current.map((p) => p.id));
  const patchById = new Map(patches.map((p) => [p.id, p]));
  const next: ArtboardPanel[] = current.map((panel) => {
    const patch = patchById.get(panel.id);
    return patch ? shallowMergePanel(panel, patch) : panel;
  });

  for (const patch of patches) {
    if (currentIds.has(patch.id)) continue;
    const created = sanitizeArtboardPanels([patch]);
    if (created?.[0]) next.push(created[0]);
  }

  return sanitizeArtboardPanels(next);
}
