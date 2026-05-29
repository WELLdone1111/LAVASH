import type { ConstructCodeTab } from "@/features/lavashconstruct/editor/model/codeScratchStore";
import type { ArtboardPanel } from "@/features/lavashconstruct/artboard/ui/types";

const MAX_CONTEXT_CHARS = 14_000;
const MAX_TAB_CHARS_ACTIVE = 4_500;
const MAX_TAB_CHARS_OTHER = 900;
const MAX_PANEL_CODE_CHARS = 3_200;
const MAX_PANELS_IN_JSON = 24;

export type ConstructContextInput = {
  scratchTabs: ConstructCodeTab[];
  activeScratchTabId: string;
  artboardPanels: ArtboardPanel[];
  selectedPanelId: string | null;
  /** Закріплена в чаті панель — пріоритетніший фокус для моделі. */
  markedPanelId?: string | null;
};

function clip(text: string, max: number): string {
  const s = text.replace(/\r\n/g, "\n");
  if (s.length <= max) return s;
  return `${s.slice(0, max)}\n… [truncated ${s.length - max} chars]`;
}

function scratchTabBlock(tab: ConstructCodeTab, maxChars: number, markers: string[]): string {
  const body = tab.content.trim();
  const markerLine = markers.length ? ` (${markers.join(", ")})` : "";
  if (!body) {
    return `### tab "${tab.label}" id=${tab.id}${markerLine}\n(empty)\n`;
  }
  const lang = guessLangFromContent(body);
  return `### tab "${tab.label}" id=${tab.id}${markerLine}\n\`\`\`${lang}\n${clip(body, maxChars)}\n\`\`\`\n`;
}

function guessLangFromContent(body: string): string {
  if (/<[a-z][\s\S]*>/i.test(body) && /\b(class|style)=/i.test(body)) return "html";
  if (/^\s*[\w#.[\](),\s-]+\s*\{[\s\S]*\}/m.test(body) && !/function\s|const\s|import\s/.test(body)) return "css";
  if (/\bexport\s+default\b/.test(body) || /\bfrom\s+['"]react['"]/.test(body)) return "tsx";
  return "text";
}

function panelSummaryLine(p: ArtboardPanel, selected: boolean, marked: boolean): string {
  const bits = [
    `id=${p.id}`,
    `title="${p.title}"`,
    `${Math.round(p.x)},${Math.round(p.y)}`,
    `${Math.round(p.width)}×${Math.round(p.height)}`,
    `z=${p.zIndex}`,
  ];
  if (p.importedVisualKind) bits.push(`kind=${p.importedVisualKind}`);
  if (p.linkedScratchTabId) bits.push(`linkedScratch=${p.linkedScratchTabId}`);
  if (p.parentId) bits.push(`parent=${p.parentId}`);
  if (p.constructWidgetId) bits.push(`widget=${p.constructWidgetId}`);
  if (marked) bits.push("MARKED");
  if (selected) bits.push("SELECTED");
  if (p.isLocked) bits.push("locked");
  if (!p.isVisible) bits.push("hidden");
  return `- ${bits.join(" ")}`;
}

function compactPanelForJson(p: ArtboardPanel, includeCode: boolean): Record<string, unknown> {
  const o: Record<string, unknown> = {
    id: p.id,
    title: p.title,
    x: p.x,
    y: p.y,
    width: p.width,
    height: p.height,
    zIndex: p.zIndex,
    isVisible: p.isVisible,
    isLocked: p.isLocked,
  };
  if (p.importedVisualKind) o.importedVisualKind = p.importedVisualKind;
  if (p.linkedScratchTabId) o.linkedScratchTabId = p.linkedScratchTabId;
  if (p.parentId) o.parentId = p.parentId;
  if (p.localX != null) o.localX = p.localX;
  if (p.localY != null) o.localY = p.localY;
  if (p.constructWidgetId) o.constructWidgetId = p.constructWidgetId;
  if (includeCode && p.importedTextContent?.trim()) {
    o.importedTextContent = clip(p.importedTextContent, MAX_PANEL_CODE_CHARS);
  }
  return o;
}

/**
 * Знімок Code scratch + артборду для всіх провайдерів (Ollama / Groq / Gemini).
 * Клієнт додає блок на початку user-turn; не показується в UI чату.
 */
export function buildConstructContextForModel(input: ConstructContextInput): string {
  const { scratchTabs, activeScratchTabId, artboardPanels, selectedPanelId, markedPanelId } = input;
  const focusPanelId = markedPanelId ?? selectedPanelId;
  const focusPanel =
    focusPanelId != null ? artboardPanels.find((p) => p.id === focusPanelId) : undefined;
  const linkedScratchId = focusPanel?.linkedScratchTabId?.trim() || null;

  const parts: string[] = [
    "[LavashConstruct snapshot — read-only; use for Code + artboard edits; user message is after the separator]",
    "",
    "## Code scratch",
  ];

  if (scratchTabs.length === 0) {
    parts.push("(no tabs)");
  } else {
    for (const tab of scratchTabs) {
      const markers: string[] = [];
      if (tab.id === activeScratchTabId) markers.push("active");
      if (linkedScratchId && tab.id === linkedScratchId) markers.push("linked-to-focus-panel");
      if (markedPanelId && focusPanel?.linkedScratchTabId === tab.id) markers.push("marked-panel-scratch");
      const max =
        tab.id === activeScratchTabId || tab.id === linkedScratchId
          ? MAX_TAB_CHARS_ACTIVE
          : MAX_TAB_CHARS_OTHER;
      parts.push(scratchTabBlock(tab, max, markers));
    }
  }

  parts.push("", "## Artboard");
  if (artboardPanels.length === 0) {
    parts.push("(empty artboard)");
  } else {
    parts.push(`${artboardPanels.length} panel(s):`);
    for (const p of artboardPanels) {
      parts.push(panelSummaryLine(p, p.id === selectedPanelId, p.id === markedPanelId));
    }
    const jsonPanels = artboardPanels.slice(0, MAX_PANELS_IN_JSON).map((p) =>
      compactPanelForJson(
        p,
        p.id === focusPanelId ||
          p.linkedScratchTabId === activeScratchTabId ||
          (linkedScratchId != null && p.linkedScratchTabId === linkedScratchId),
      ),
    );
    try {
      parts.push(
        "",
        markedPanelId
          ? "Marked panel (primary focus for this turn — use `json lavash-artboard` with `\"merge\": true` to patch by id):"
          : "Selected / linked panel payload (use `json lavash-artboard` with `\"merge\": true` to patch by id):",
        "```json",
        JSON.stringify({ merge: true, artboardPanels: jsonPanels }, null, 0),
        "```",
      );
    } catch {
      /* skip json */
    }
  }

  parts.push("", "---", "User message:", "");
  let block = parts.join("\n");
  if (block.length > MAX_CONTEXT_CHARS) {
    block = `${block.slice(0, MAX_CONTEXT_CHARS)}\n… [lab snapshot truncated]`;
  }
  return block;
}
