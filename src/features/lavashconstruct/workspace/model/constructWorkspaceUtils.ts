import { CONSTRUCT_USER_LIB_DRAG_MIME } from "@/features/lavashconstruct/artboard/ui/ConstructUserLibPanel";
import {
  clampImportedCssPreviewMarkup,
  clampImportedHtmlPreviewExtraCss,
  clampImportedSandboxHtmlDoc,
  detectImportedVisualKind,
  normalizeImportedTextForEditPalette,
  resolveImportedVisualKindForFile,
} from "@/features/lavashconstruct/artboard/model/import";
import type { ArtboardPanel } from "@/features/lavashconstruct/artboard/ui/types";
import type { ConstructLibraryItem } from "@/features/lavashconstruct/shared/model/libraryItem";
import { safeNumber } from "@/features/lavashconstruct/shared/model/utils";

export const USER_LIB_MAX_ITEMS = 200;

export const DEFAULT_EDIT_SOURCE = `<button style="padding:10px 14px;border-radius:10px;border:1px solid var(--accent-color);background:var(--bg-color);color:var(--text-color);font-weight:600;">
  Click me
</button>`;

export type EditPanelSnapshot = {
  importedVisualKind?: ArtboardPanel["importedVisualKind"];
  importedTextContent?: string;
  importedHtmlPreviewExtraCss?: string;
  backgroundColor?: string;
  opacity?: number;
  blurPx?: number;
  borderRadiusPx?: number;
  hoverScale?: number;
  rotationDeg?: number;
  constructWidgetAccentColor?: string;
};

export function cloneConstructLibraryItem(item: ConstructLibraryItem): ConstructLibraryItem {
  const { linkedScratchTabId: _omit, ...rest } = item;
  return { ...rest, keywords: [...item.keywords] };
}

export function isArtboardImportDrag(types: Iterable<string>): boolean {
  const normalized = Array.from(types).map((type) => type.toLowerCase());
  return (
    normalized.includes(CONSTRUCT_USER_LIB_DRAG_MIME.toLowerCase()) ||
    normalized.includes("files") ||
    normalized.includes("text/plain") ||
    normalized.includes("text/html")
  );
}

export function sanitizeUserLibraryItems(value: unknown): ConstructLibraryItem[] {
  if (!Array.isArray(value)) return [];
  const next: ConstructLibraryItem[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== "object") continue;
    const o = raw as Partial<ConstructLibraryItem> & { constructWidgetId?: string };
    if (typeof o.constructWidgetId === "string" && o.constructWidgetId.trim()) continue;
    const id = typeof o.id === "string" && o.id.trim() ? o.id.trim().slice(0, 200) : "";
    if (!id) continue;
    const title =
      typeof o.title === "string" && o.title.trim() ? o.title.trim().slice(0, 200) : "Untitled";
    const kind: ConstructLibraryItem["kind"] = o.kind === "element" ? "element" : "panel";
    const keywords = Array.isArray(o.keywords)
      ? o.keywords
          .filter((k): k is string => typeof k === "string" && k.trim().length > 0)
          .map((k) => k.trim().slice(0, 120))
          .slice(0, 48)
      : [];
    const importedNorm = normalizeImportedTextForEditPalette(
      o.importedTextContent,
      o.importedVisualKind,
      o.importWarnings,
    );
    next.push({
      id,
      title,
      kind,
      category: "import",
      keywords,
      defaultWidth: safeNumber(o.defaultWidth, 200, 40, 1600),
      defaultHeight: safeNumber(o.defaultHeight, 120, 40, 1600),
      lockAspectRatioByDefault:
        typeof o.lockAspectRatioByDefault === "boolean" ? o.lockAspectRatioByDefault : undefined,
      importedSourceKind:
        o.importedSourceKind === "text" || o.importedSourceKind === "image" || o.importedSourceKind === "file"
          ? o.importedSourceKind
          : undefined,
      importedVisualKind:
        o.importedVisualKind === "plain-text" ||
        o.importedVisualKind === "html" ||
        o.importedVisualKind === "css" ||
        o.importedVisualKind === "jsx"
          ? o.importedVisualKind
          : undefined,
      importedMimeType:
        typeof o.importedMimeType === "string" && o.importedMimeType.trim()
          ? o.importedMimeType.trim().slice(0, 200)
          : undefined,
      importedTextContent: importedNorm.text,
      importedDataUrl:
        typeof o.importedDataUrl === "string" && o.importedDataUrl.startsWith("data:")
          ? o.importedDataUrl.slice(0, 2_000_000)
          : undefined,
      importedSandboxHtmlDoc: clampImportedSandboxHtmlDoc(o.importedSandboxHtmlDoc),
      importWarnings: importedNorm.importWarnings,
      importedCssPreviewMarkup: clampImportedCssPreviewMarkup(o.importedCssPreviewMarkup),
      importedHtmlPreviewExtraCss: clampImportedHtmlPreviewExtraCss(o.importedHtmlPreviewExtraCss),
    });
    if (next.length >= USER_LIB_MAX_ITEMS) break;
  }
  return next;
}

export function intersectsRect(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
): boolean {
  return !(
    a.x + a.width <= b.x ||
    b.x + b.width <= a.x ||
    a.y + a.height <= b.y ||
    b.y + b.height <= a.y
  );
}

function resolveEditVisualKindFromContent(source: string): "plain-text" | "html" | "css" | "jsx" {
  return detectImportedVisualKind("txt", source.trim() || DEFAULT_EDIT_SOURCE);
}

/** Класифікація лише за вмістом (без title панелі / розширення файлу). */
export function resolveEditVisualKind(source: string): "plain-text" | "html" | "css" | "jsx" {
  return resolveEditVisualKindFromContent(source);
}

/** Prefer stored panel kind; fall back to title extension, then content sniffing. */
export function resolvePanelEditVisualKind(
  panel: Pick<ArtboardPanel, "importedVisualKind" | "importedTextContent"> & {
    title?: ArtboardPanel["title"];
  },
  source: string,
): "plain-text" | "html" | "css" | "jsx" {
  if (panel.importedVisualKind) return panel.importedVisualKind;
  const fromTitle = panel.title?.trim();
  if (fromTitle && /\.\w+$/.test(fromTitle)) {
    const ext = fromTitle.split(".").pop() ?? "";
    return resolveImportedVisualKindForFile(ext, source.trim() || DEFAULT_EDIT_SOURCE);
  }
  return resolveEditVisualKindFromContent(source.trim() || DEFAULT_EDIT_SOURCE);
}
