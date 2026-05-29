import { isAssistantPanelFence } from "@/features/lavashconstruct/chat/model/assistantFenceHints";
import { parseCodeFencesFromMarkdown, useConstructCodeScratchStore } from "@/features/lavashconstruct/editor/model/codeScratchStore";
import {
  applyConstructAssistantMarkdown,
  type ConstructAssistantApplyOptions,
  type ConstructAssistantApplySummary,
} from "@/features/lavashconstruct/chat/model/constructAssistantApply";
import { emitLavashAppliedEvent } from "@/features/lavashconstruct/chat/model/constructAssistantDisplay";

const APPLY_DEBOUNCE_MS = 90;

function fenceSignature(markdown: string): string {
  return parseCodeFencesFromMarkdown(markdown)
    .map((f) => `${f.lang}\0${f.tabHint}\0${f.body.length}`)
    .join("\n");
}

/** Незакритий ```-фенс в кінці буфера (стрімінг). */
export function parseTrailingOpenCodeFence(markdown: string): {
  lang: string;
  tabHint: string;
  body: string;
} | null {
  const last = markdown.lastIndexOf("```");
  if (last < 0) return null;
  const tail = markdown.slice(last + 3);
  const nl = tail.indexOf("\n");
  if (nl < 0) return null;
  const meta = tail.slice(0, nl).trim();
  const body = tail.slice(nl + 1);
  if (body.includes("```")) return null;
  const tokens = meta.split(/\s+/).filter(Boolean);
  const lang = tokens[0] ?? "";
  const tabHint = tokens.slice(1).join(" ").trim();
  if (!lang && !body.trim()) return null;
  if (lang.toLowerCase() === "json") return null;
  if (isAssistantPanelFence(tabHint)) return null;
  return { lang, tabHint, body };
}

function applyOpenFencePartial(
  markdown: string,
  options?: ConstructAssistantApplyOptions,
  openKey?: string,
): string | undefined {
  const open = parseTrailingOpenCodeFence(markdown);
  if (!open) return openKey;
  const key = `${open.lang}\0${open.tabHint}\0${open.body.length}`;
  if (key === openKey) return openKey;

  const { tabs, activeTabId, setTabContent } = useConstructCodeScratchStore.getState();
  const preferId = options?.preferScratchTabId?.trim();
  const preferIdx = preferId ? tabs.findIndex((t) => t.id === preferId) : -1;
  const activeIdx = Math.max(0, tabs.findIndex((t) => t.id === activeTabId));
  const targetId =
    preferIdx >= 0 ? tabs[preferIdx].id : (tabs[activeIdx]?.id ?? tabs[0]?.id);
  if (!targetId) return key;
  setTabContent(targetId, open.body);
  return key;
}

export type ConstructStreamApplyController = {
  pushChunk: (fullBuffer: string) => void;
  flush: () => ConstructAssistantApplySummary;
  getBuffer: () => string;
  getLastSummary: () => ConstructAssistantApplySummary;
};

/** Інкрементальне застосування під час стріму (повні фенси + хвіст відкритого фенса). */
export function createConstructStreamApplyController(
  options?: ConstructAssistantApplyOptions,
): ConstructStreamApplyController {
  const applyEnabled = options?.applyEnabled !== false;
  let buffer = "";
  let fenceSig = "";
  let openKey: string | undefined;
  let lastSummary: ConstructAssistantApplySummary = {
    codeFencesApplied: 0,
    artboardApplied: false,
    constructPanelsSpawned: 0,
  };
  let debounce: ReturnType<typeof setTimeout> | undefined;

  const runApply = () => {
    if (!applyEnabled) return;
    debounce = undefined;
    const sig = fenceSignature(buffer);
    if (sig !== fenceSig) {
      fenceSig = sig;
      lastSummary = applyConstructAssistantMarkdown(buffer, options);
      emitLavashAppliedEvent(lastSummary);
    }
    const nextOpenKey = applyOpenFencePartial(buffer, options, openKey);
    if (nextOpenKey !== openKey) {
      openKey = nextOpenKey;
      emitLavashAppliedEvent(lastSummary);
    }
  };

  return {
    pushChunk(fullBuffer: string) {
      buffer = fullBuffer;
      if (debounce) clearTimeout(debounce);
      debounce = setTimeout(runApply, APPLY_DEBOUNCE_MS);
    },
    flush() {
      if (debounce) {
        clearTimeout(debounce);
        debounce = undefined;
      }
      if (applyEnabled) {
        lastSummary = applyConstructAssistantMarkdown(buffer, options);
        emitLavashAppliedEvent(lastSummary);
        openKey = applyOpenFencePartial(buffer, options, openKey);
      }
      return lastSummary;
    },
    getBuffer: () => buffer,
    getLastSummary: () => lastSummary,
  };
}
