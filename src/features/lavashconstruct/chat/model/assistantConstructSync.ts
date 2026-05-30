import {
  isAssistantArtboardFence,
} from "@/features/lavashconstruct/chat/model/assistantFenceHints";
import {
  detectImportedVisualKind,
  inferCssPreviewBodyMarkup,
  inferCssPreviewPanelSize,
  inferHtmlPreviewPanelSize,
  normalizeImportedTextForEditPalette,
} from "@/features/lavashconstruct/artboard/model/import";
import type { ConstructLibraryItem } from "@/features/lavashconstruct/shared/model/libraryItem";
import { parseCodeFencesFromMarkdown } from "@/features/lavashconstruct/editor/model/codeScratchStore";
import { collectPanelFencesFromMarkdown } from "@/features/lavashconstruct/chat/model/assistantFenceParse";
import { sanitizeArtboardPanels } from "@/features/lavashconstruct/artboard/model/sanitizeArtboardPanels";
import { useConstructStore } from "@/features/lavashconstruct/artboard/model/store";
import type { ArtboardPanel } from "@/features/lavashconstruct/artboard/ui/types";

function extractArtboardPanelsPayload(data: unknown): unknown {
  if (!data || typeof data !== "object") return null;
  const o = data as Record<string, unknown>;
  if (Array.isArray(o.artboardPanels)) return o.artboardPanels;
  if (o.constructArtboard && typeof o.constructArtboard === "object") {
    const inner = (o.constructArtboard as Record<string, unknown>).artboardPanels;
    if (Array.isArray(inner)) return inner;
  }
  return null;
}

function readArtboardMergeFlag(parsed: unknown): boolean | null {
  if (!parsed || typeof parsed !== "object") return null;
  const o = parsed as Record<string, unknown>;
  if (o.merge === true) return true;
  if (o.merge === false) return false;
  return null;
}

/** Оновлює/додає панелі за id; решту панелей артборду лишає без змін. */
function mergeArtboardPanelsById(current: ArtboardPanel[], incoming: ArtboardPanel[]): ArtboardPanel[] {
  const incomingById = new Map(incoming.map((p) => [p.id, p]));
  const used = new Set<string>();
  const next = current.map((c) => {
    const inc = incomingById.get(c.id);
    if (inc) {
      used.add(c.id);
      return inc;
    }
    return c;
  });
  for (const p of incoming) {
    if (!used.has(p.id)) {
      next.push(p);
      used.add(p.id);
    }
  }
  return next;
}

function shouldMergeArtboardPayload(
  mergeFlag: boolean | null,
  current: ArtboardPanel[],
  incoming: ArtboardPanel[],
): boolean {
  if (mergeFlag === true) return true;
  if (mergeFlag === false) return false;
  if (incoming.length === 0) return false;
  const currentIds = new Set(current.map((p) => p.id));
  return incoming.every((p) => currentIds.has(p.id));
}

/**
 * Якщо у markdown є блок ```json lavash-artboard``` (або legacy hints) з полем `artboardPanels`,
 * застосовує його до артборду через той самий санітайзер, що й пресети.
 * @returns чи було застосовано оновлення
 */
export function applyArtboardPayload(parsed: unknown): boolean {
  const rawPanels = extractArtboardPanelsPayload(parsed);
  if (!Array.isArray(rawPanels)) return false;
  const panels = sanitizeArtboardPanels(rawPanels);
  if (!panels) return false;

  const mergeFlag = readArtboardMergeFlag(parsed);
  const current = useConstructStore.getState().artboardPanels;
  const merged =
    shouldMergeArtboardPayload(mergeFlag, current, panels) && current.length > 0
      ? mergeArtboardPanelsById(current, panels)
      : panels;
  const normalized = sanitizeArtboardPanels(merged);
  if (!normalized) return false;

  useConstructStore.getState().setArtboardPanelsDirect(normalized);
  return true;
}

export function applyAssistantArtboardFromMarkdown(markdown: string): boolean {
  const fences = parseCodeFencesFromMarkdown(markdown);
  for (const f of fences) {
    if (f.lang.toLowerCase() !== "json") continue;
    const hint = f.tabHint.trim().toLowerCase();
    if (!isAssistantArtboardFence(hint)) continue;
    let parsed: unknown;
    try {
      parsed = JSON.parse(f.body);
    } catch {
      continue;
    }
    if (applyArtboardPayload(parsed)) return true;
  }
  return false;
}

function looksLikeReactModule(source: string): boolean {
  return (
    /\bimport\s+React\b/.test(source) ||
    /\bfrom\s+['"]react['"]/.test(source) ||
    /\bstyled-components\b/.test(source) ||
    /\bexport\s+default\b/.test(source) ||
    /\bconst\s+[A-Z][A-Za-z0-9_]*\s*=\s*\(/.test(source)
  );
}

export type BuildScratchCodeLibraryItemArgs = {
  panelTitle: string;
  code: string;
  /** напр. токен мови з фенса `tsx` — якщо задано, `panelTitle` для назви панелі лишаємо як є */
  langExt?: string;
  /** Якщо задано — артборд-панель в реальному часі тягнеться за цією Code scratch-вкладкою. */
  scratchTabId?: string;
};

/**
 * Збираємо айтем у стилі User Lib, щоб `pasteImportedItemsToArtboard` / `handleAddLibraryPanel` могли
 * положити scratch-код на канву.
 */
export function buildScratchCodeLibraryItem(args: BuildScratchCodeLibraryItemArgs): ConstructLibraryItem | null {
  const raw = args.code.replace(/\r\n/g, "\n").trim();
  if (!raw) return null;

  const titleRaw = args.panelTitle.trim();
  const tokens = titleRaw.split(/\s+/).filter(Boolean);
  const first = tokens[0]?.toLowerCase() ?? "";
  const extFromLabel = ["tsx", "ts", "jsx", "js", "css", "html", "htm"].includes(first) ? first : null;
  const extCandidate = args.langExt?.trim().toLowerCase();
  const ext = extCandidate || extFromLabel || "tsx";

  let visualKind = detectImportedVisualKind(ext, raw);
  if (visualKind === "plain-text" && looksLikeReactModule(raw)) {
    visualKind = "jsx";
  }

  const norm = normalizeImportedTextForEditPalette(raw, visualKind, undefined);

  let title: string;
  if (extCandidate) {
    title = titleRaw.slice(0, 200) || "Code";
  } else if (extFromLabel && tokens.length > 1) {
    title = tokens.slice(1).join(" ").trim().slice(0, 200) || titleRaw.slice(0, 200);
  } else {
    title = titleRaw.slice(0, 200) || "Code";
  }
  if (!title.trim()) title = "Code";

  const cssPreviewSize = visualKind === "css" ? inferCssPreviewPanelSize(norm.text ?? "") : null;
  const htmlPreviewSize = visualKind === "html" ? inferHtmlPreviewPanelSize(norm.text ?? "") : null;
  const cssPreviewMarkup = visualKind === "css" ? inferCssPreviewBodyMarkup(norm.text ?? "") : undefined;

  return {
    id: `code-${crypto.randomUUID().slice(0, 14)}`,
    title: title.slice(0, 200),
    kind: "panel",
    category: "import",
    keywords: ["code"],
    defaultWidth: cssPreviewSize?.width ?? htmlPreviewSize?.width ?? 440,
    defaultHeight: cssPreviewSize?.height ?? htmlPreviewSize?.height ?? 340,
    importedSourceKind: "text",
    importedVisualKind: visualKind,
    importedTextContent: norm.text,
    importWarnings: norm.importWarnings,
    ...(cssPreviewMarkup ? { importedCssPreviewMarkup: cssPreviewMarkup } : {}),
    ...(args.scratchTabId?.trim()
      ? { linkedScratchTabId: args.scratchTabId.trim().slice(0, 80) }
      : {}),
  };
}

type ConstructLibraryPaster = (items: ConstructLibraryItem[]) => void;

let libraryPaster: ConstructLibraryPaster | null = null;

/** Реєструємо з `LavashConstructWorkspace`, щоб чат / фенси спавнили панелі так само, як тулбар Code. */
export function registerConstructArtboardLibraryPaster(fn: ConstructLibraryPaster | null) {
  libraryPaster = fn;
}

/**
 * Для кожного фенса ```lang … lavash-panel …``` спавнимо панель в стилі імпорту (той самий шлях, що drag з User Lib).
 * Фенси з panel-hint виключаємо з синку Code scratchpad — див. `applyFromAssistantMarkdown`.
 * @returns скільки панелей поставили в чергу
 */
export type ApplyConstructPanelFencesOptions = {
  linkedScratchTabId?: string | null;
};

export function applyAssistantConstructPanelFences(
  markdown: string,
  options?: ApplyConstructPanelFencesOptions,
): number {
  if (!libraryPaster) return 0;
  const scratchLink = options?.linkedScratchTabId?.trim() || undefined;
  const items: ConstructLibraryItem[] = [];
  for (const f of collectPanelFencesFromMarkdown(markdown)) {
    const panelTitle =
      f.tabHint.replace(/\b(?:lavash-panel|construct-panel)\b/gi, "").trim() || f.lang || "Panel";
    const item = buildScratchCodeLibraryItem({
      panelTitle,
      code: f.body,
      langExt: f.lang || undefined,
      scratchTabId: scratchLink,
    });
    if (item) items.push(item);
  }
  return pasteConstructLibraryItems(items);
}

export function pasteConstructLibraryItems(items: readonly ConstructLibraryItem[]): number {
  if (!libraryPaster || items.length === 0) return 0;
  libraryPaster([...items]);
  return items.length;
}
