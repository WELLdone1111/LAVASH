import {
  CONSTRUCT_SETTINGS_SCHEMA_VERSION,
  DEFAULT_ADVANCED_EXPORT,
  DEFAULT_CONSTRUCT_MODE,
  DEFAULT_EXPORT_FORMAT,
  DEFAULT_MAGNETIC_THRESHOLD,
} from "@/features/lavashconstruct/shared/model/constants";
import { normalizeExportFormat } from "@/features/lavashconstruct/shared/model/normalizeExportFormat";
import { sanitizeArtboardPanels } from "@/features/lavashconstruct/artboard/model/sanitizeArtboardPanels";
import type { AdvancedExportKind, ExportFormat } from "@/features/lavashconstruct/shared/model/types";
import type { ArtboardPanel, ConstructEditableState } from "@/features/lavashconstruct/artboard/ui/types";
import type { ConstructLibraryItem } from "@/features/lavashconstruct/shared/model/libraryItem";

export const LAVASH_DOCUMENT_EXTENSION = ".lavash.json";

export type LavashDocument = {
  schemaVersion: number;
  name: string;
  savedAt: number;
  constructState: ConstructEditableState;
  artboardPanels: ArtboardPanel[];
  selectedPanelId: string | null;
  selectedExportFormat: ExportFormat;
  selectedAdvancedExport: AdvancedExportKind;
  userLibraryItems: ConstructLibraryItem[];
};

export type LavashDocumentApplyTarget = {
  setConstructState: (state: ConstructEditableState) => void;
  setArtboardPanels: (panels: ArtboardPanel[]) => void;
  setSelectedPanelId: (id: string | null) => void;
  setSelectedExportFormat: (format: ExportFormat) => void;
  setSelectedAdvancedExport: (kind: AdvancedExportKind) => void;
  setUserLibraryItems: (items: ConstructLibraryItem[]) => void;
};

export function buildLavashDocument(input: {
  name: string;
  constructState: ConstructEditableState;
  artboardPanels: ArtboardPanel[];
  selectedPanelId: string | null;
  selectedExportFormat: ExportFormat;
  selectedAdvancedExport: AdvancedExportKind;
  userLibraryItems: ConstructLibraryItem[];
}): LavashDocument {
  return {
    schemaVersion: CONSTRUCT_SETTINGS_SCHEMA_VERSION,
    name: input.name.trim().slice(0, 120) || "LAVASH",
    savedAt: Date.now(),
    constructState: input.constructState,
    artboardPanels: input.artboardPanels.map((p) => ({ ...p })),
    selectedPanelId: input.selectedPanelId,
    selectedExportFormat: input.selectedExportFormat,
    selectedAdvancedExport: input.selectedAdvancedExport,
    userLibraryItems: input.userLibraryItems.map((item) => ({
      ...item,
      keywords: [...item.keywords],
    })),
  };
}

export function parseLavashDocumentText(raw: string): LavashDocument | null {
  try {
    const parsed = JSON.parse(raw) as Partial<LavashDocument> & {
      layout?: { constructState?: ConstructEditableState; artboardPanels?: ArtboardPanel[] };
    };
    if (!parsed || typeof parsed !== "object") return null;

    const layout = parsed.layout;
    const constructState = parsed.constructState ?? layout?.constructState;
    const artboardPanels = parsed.artboardPanels ?? layout?.artboardPanels;
    if (!constructState || !Array.isArray(artboardPanels)) return null;

    const exportFormat = normalizeExportFormat(parsed.selectedExportFormat) ?? ".lavash-theme";
    const advancedKinds: AdvancedExportKind[] = [
      "OBS Studio Plugin",
      "Wallpaper Engine",
      "Rainmeter",
      "Share Layout",
    ];
    const advanced = advancedKinds.includes(parsed.selectedAdvancedExport as AdvancedExportKind)
      ? (parsed.selectedAdvancedExport as AdvancedExportKind)
      : DEFAULT_ADVANCED_EXPORT;

    return {
      schemaVersion:
        typeof parsed.schemaVersion === "number" ? parsed.schemaVersion : CONSTRUCT_SETTINGS_SCHEMA_VERSION,
      name: typeof parsed.name === "string" && parsed.name.trim() ? parsed.name.trim() : "LAVASH",
      savedAt: typeof parsed.savedAt === "number" ? parsed.savedAt : Date.now(),
      constructState,
      artboardPanels: sanitizeArtboardPanels(artboardPanels) ?? [],
      selectedPanelId:
        typeof parsed.selectedPanelId === "string" || parsed.selectedPanelId === null
          ? parsed.selectedPanelId
          : null,
      selectedExportFormat: exportFormat,
      selectedAdvancedExport: advanced,
      userLibraryItems: Array.isArray(parsed.userLibraryItems)
        ? (parsed.userLibraryItems as ConstructLibraryItem[])
        : [],
    };
  } catch {
    return null;
  }
}

/** Порожній дизайн для «Новий документ» без церемонії проєкту. */
export function createBlankLavashDocument(name = "Untitled"): LavashDocument {
  return buildLavashDocument({
    name,
    constructState: {
      constructEditMode: DEFAULT_CONSTRUCT_MODE,
      magneticThreshold: DEFAULT_MAGNETIC_THRESHOLD,
      isPreviewAttachmentEnabled: true,
      isDockZonesHighlightEnabled: false,
      isCollisionAvoidanceEnabled: false,
      isMiniPlayerIdle: false,
      isArtboardGridDotsVisible: true,
      isPanelAlignmentSnapEnabled: true,
      isMiniShapeMorphingEnabled: true,
      isMiniReactiveBackgroundEnabled: true,
      isMiniAutoSnapEdgesEnabled: true,
      isMainAdaptiveLayoutEnabled: true,
      isMainCinematicBackdropEnabled: true,
      isMainDockAutoSnapEnabled: true,
      mainPanelDensity: "balanced",
    },
    artboardPanels: [],
    selectedPanelId: null,
    selectedExportFormat: DEFAULT_EXPORT_FORMAT,
    selectedAdvancedExport: DEFAULT_ADVANCED_EXPORT,
    userLibraryItems: [],
  });
}

export function applyLavashDocument(doc: LavashDocument, target: LavashDocumentApplyTarget): void {
  target.setConstructState(doc.constructState);
  target.setArtboardPanels(doc.artboardPanels);
  target.setSelectedPanelId(doc.selectedPanelId);
  target.setSelectedExportFormat(doc.selectedExportFormat);
  target.setSelectedAdvancedExport(doc.selectedAdvancedExport);
  target.setUserLibraryItems(doc.userLibraryItems);
}
