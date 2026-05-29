import { normalizeImportedTextForEditPalette } from "@/features/lavashconstruct/artboard/model/import";
import type { ArtboardPanel } from "@/features/lavashconstruct/artboard/ui/types";

export const SYNC_DEBOUNCE_MS = 85;
export const SYNC_MERGE_WINDOW_MS = 960;

export function panelImportedContentEquals(
  panel: ArtboardPanel,
  text: string,
  importWarnings: string[] | undefined,
): boolean {
  return (
    text === panel.importedTextContent &&
    JSON.stringify(importWarnings ?? []) === JSON.stringify(panel.importWarnings ?? [])
  );
}

/** Нормалізує raw code і повертає патч панелі або null, якщо без змін. */
export function patchPanelImportedCode(
  panel: ArtboardPanel,
  rawCode: string,
): { panel: ArtboardPanel; changed: boolean } {
  if (panel.isLocked) return { panel, changed: false };

  const norm = normalizeImportedTextForEditPalette(rawCode, panel.importedVisualKind, undefined);
  const text = norm.text ?? "";
  if (panelImportedContentEquals(panel, text, norm.importWarnings)) {
    return { panel, changed: false };
  }

  return {
    panel: {
      ...panel,
      importedTextContent: text,
      importWarnings: norm.importWarnings,
    },
    changed: true,
  };
}

export type PanelLinkResolver = (panel: ArtboardPanel) => string | undefined;

/** Застосовує code → artboard для панелей з link (scratch tab id або project path). */
export function applyCodeToLinkedPanels(
  panels: ArtboardPanel[],
  resolveLink: PanelLinkResolver,
  readCode: (link: string) => string | undefined,
  onOrphanLink?: (panel: ArtboardPanel) => ArtboardPanel | null,
): { panels: ArtboardPanel[]; changed: boolean } {
  let changed = false;
  const next = panels.map((panel) => {
    const link = resolveLink(panel)?.trim();
    if (!link) return panel;

    const code = readCode(link);
    if (code === undefined) {
      if (!onOrphanLink) return panel;
      const orphanPatch = onOrphanLink(panel);
      if (!orphanPatch) return panel;
      changed = true;
      return orphanPatch;
    }

    const { panel: patched, changed: panelChanged } = patchPanelImportedCode(panel, code);
    if (panelChanged) changed = true;
    return patched;
  });

  return { panels: next, changed };
}

/** Застосовує artboard → code для всіх панелей з link. */
export function forEachLinkedPanelCode(
  panels: ArtboardPanel[],
  resolveLink: PanelLinkResolver,
  pushCode: (link: string, raw: string) => void,
): void {
  for (const panel of panels) {
    const link = resolveLink(panel)?.trim();
    if (!link || panel.isLocked) continue;
    pushCode(link, panel.importedTextContent ?? "");
  }
}
