import { ARTBOARD_INFINITE_PX } from "@/features/lavashconstruct/shared/model/constants";
import {
  clampImportedCssPreviewMarkup,
  clampImportedHtmlPreviewExtraCss,
  clampImportedSandboxHtmlDoc,
  normalizeImportedTextForEditPalette,
} from "@/features/lavashconstruct/artboard/model/import";
import {
  normalizeArtboardPanelsHierarchy,
  stripAutoTitledRootBoardContainers,
} from "@/features/lavashconstruct/artboard/model/panelHierarchy";
import { safeNumber } from "@/features/lavashconstruct/shared/model/utils";
import type { ArtboardPanel } from "@/features/lavashconstruct/artboard/ui/types";

/** Нормалізує масив панелей з пресета / збереження / відповіді LLM перед записом у Zustand. */
export function sanitizeArtboardPanels(value: unknown): ArtboardPanel[] | null {
  if (!Array.isArray(value)) return null;

  const next = value
    .map((item, index) => {
      if (!item || typeof item !== "object") return null;
      const source = item as Partial<ArtboardPanel>;
      const id = typeof source.id === "string" && source.id.trim() ? source.id : `panel-${index}`;
      const title =
        typeof source.title === "string" && source.title.trim() ? source.title : `Panel ${index + 1}`;
      const width = safeNumber(source.width, 200, 80, 1200);
      const height = safeNumber(source.height, 120, 60, 900);
      const maxX = Math.max(0, ARTBOARD_INFINITE_PX - width);
      const maxY = Math.max(0, ARTBOARD_INFINITE_PX - height);
      const importedNorm = normalizeImportedTextForEditPalette(
        source.importedTextContent,
        source.importedVisualKind,
        source.importWarnings,
      );
      return {
        id,
        title,
        x: safeNumber(source.x, 0, 0, maxX),
        y: safeNumber(source.y, 0, 0, maxY),
        width,
        height,
        zIndex: safeNumber(source.zIndex, index + 1, 1, 5000),
        isVisible: typeof source.isVisible === "boolean" ? source.isVisible : true,
        isLocked: typeof source.isLocked === "boolean" ? source.isLocked : false,
        lockAspectRatio: typeof source.lockAspectRatio === "boolean" ? source.lockAspectRatio : false,
        opacity: safeNumber(source.opacity, 1, 0, 1),
        blurPx: safeNumber(source.blurPx, 0, 0, 100),
        borderRadiusPx: safeNumber(source.borderRadiusPx, 12, 0, 50),
        backgroundColor:
          typeof source.backgroundColor === "string" && source.backgroundColor.trim()
            ? source.backgroundColor
            : "rgba(255,255,255,0.08)",
        isNeonGlowEnabled:
          typeof source.isNeonGlowEnabled === "boolean" ? source.isNeonGlowEnabled : false,
        neonGlow: safeNumber(source.neonGlow, 0, 0, 100),
        neonGlowColor:
          typeof source.neonGlowColor === "string" && source.neonGlowColor.trim()
            ? source.neonGlowColor
            : "#60a5fa",
        isShadowEnabled: typeof source.isShadowEnabled === "boolean" ? source.isShadowEnabled : true,
        shadowX: safeNumber(source.shadowX, 0, -60, 60),
        shadowY: safeNumber(source.shadowY, 12, -60, 60),
        shadowBlur: safeNumber(source.shadowBlur, 24, 0, 100),
        shadowSpread: safeNumber(source.shadowSpread, 0, -40, 40),
        shadowOpacity: safeNumber(source.shadowOpacity, 0.2, 0, 1),
        shadowColor:
          typeof source.shadowColor === "string" && source.shadowColor.trim()
            ? source.shadowColor
            : "#000000",
        edgeGlow: safeNumber(source.edgeGlow, 0, 0, 100),
        hoverScale: safeNumber(source.hoverScale, 1.02, 1, 1.15),
        rotationDeg: safeNumber(source.rotationDeg, 0, -180, 180),
        transitionMs: safeNumber(source.transitionMs, 260, 80, 600),
        transitionCurve:
          source.transitionCurve === "ease" ||
          source.transitionCurve === "linear" ||
          source.transitionCurve === "ease-in-out" ||
          source.transitionCurve === "cubic-bezier(0.22, 1, 0.36, 1)" ||
          source.transitionCurve === "cubic-bezier(0.22, 1, 0.42, 1)"
            ? source.transitionCurve
            : "ease-in-out",
        importedSourceKind:
          source.importedSourceKind === "text" ||
          source.importedSourceKind === "image" ||
          source.importedSourceKind === "file"
            ? source.importedSourceKind
            : undefined,
        importedVisualKind:
          source.importedVisualKind === "plain-text" ||
          source.importedVisualKind === "html" ||
          source.importedVisualKind === "css" ||
          source.importedVisualKind === "jsx"
            ? source.importedVisualKind
            : undefined,
        importedMimeType:
          typeof source.importedMimeType === "string" && source.importedMimeType.trim()
            ? source.importedMimeType
            : undefined,
        importedTextContent: importedNorm.text,
        importedDataUrl:
          typeof source.importedDataUrl === "string" && source.importedDataUrl.startsWith("data:")
            ? source.importedDataUrl
            : undefined,
        importedSandboxHtmlDoc: clampImportedSandboxHtmlDoc(source.importedSandboxHtmlDoc),
        importWarnings: importedNorm.importWarnings,
        importedCssPreviewMarkup: clampImportedCssPreviewMarkup(source.importedCssPreviewMarkup),
        importedHtmlPreviewExtraCss: clampImportedHtmlPreviewExtraCss(source.importedHtmlPreviewExtraCss),
        parentId:
          typeof source.parentId === "string" && source.parentId.trim().length > 0
            ? source.parentId.trim()
            : undefined,
        isBoardContainer: typeof source.isBoardContainer === "boolean" ? source.isBoardContainer : undefined,
        localX: typeof source.localX === "number" && Number.isFinite(source.localX) ? source.localX : undefined,
        localY: typeof source.localY === "number" && Number.isFinite(source.localY) ? source.localY : undefined,
        clipChildren: typeof source.clipChildren === "boolean" ? source.clipChildren : undefined,
        constructWidgetId:
          typeof source.constructWidgetId === "string" && source.constructWidgetId.trim().length > 0
            ? source.constructWidgetId.trim().slice(0, 64)
            : undefined,
        constructWidgetAccentColor:
          typeof source.constructWidgetAccentColor === "string" && source.constructWidgetAccentColor.trim().length > 0
            ? source.constructWidgetAccentColor.trim().slice(0, 120)
            : undefined,
        linkedScratchTabId:
          typeof source.linkedScratchTabId === "string" && source.linkedScratchTabId.trim().length > 0
            ? source.linkedScratchTabId.trim().slice(0, 80)
            : undefined,
        linkedProjectFilePath:
          typeof source.linkedProjectFilePath === "string" && source.linkedProjectFilePath.trim().length > 0
            ? source.linkedProjectFilePath.trim().replace(/\\/g, "/").slice(0, 512)
            : undefined,
      };
    })
    .filter((panel) => panel !== null) as ArtboardPanel[];

  const normalized = normalizeArtboardPanelsHierarchy(next);
  const stripped = stripAutoTitledRootBoardContainers(normalized);
  const final = normalizeArtboardPanelsHierarchy(stripped);

  return final.length > 0 ? final : null;
}
