import { parseCodeFencesFromMarkdown, useConstructCodeScratchStore } from "@/features/lavashconstruct/editor/model/codeScratchStore";
import { isAssistantPanelFence } from "@/features/lavashconstruct/chat/model/assistantFenceHints";
import {
  applyAssistantArtboardFromMarkdown,
  applyAssistantConstructPanelFences,
} from "@/features/lavashconstruct/chat/model/assistantConstructSync";

export type ConstructAssistantApplyOptions = {
  preferScratchTabId?: string | null;
  /** Прив’язати construct-panel до активної/виділеної scratch-вкладки. */
  linkConstructPanelToScratchTabId?: string | null;
  /** Ask / Plan / Debug — без apply. */
  applyEnabled?: boolean;
};

export type ConstructAssistantApplySummary = {
  codeFencesApplied: number;
  artboardApplied: boolean;
  constructPanelsSpawned: number;
};

function countCodeScratchFences(markdown: string): number {
  return parseCodeFencesFromMarkdown(markdown).filter((f) => !isAssistantPanelFence(f.tabHint)).length;
}

/** Застосовує fenced-код / артборд / lavash-panel і повертає короткий звіт для API-thread. */
export function applyConstructAssistantMarkdown(
  markdown: string,
  options?: ConstructAssistantApplyOptions,
): ConstructAssistantApplySummary {
  if (options?.applyEnabled === false) {
    return {
      codeFencesApplied: 0,
      artboardApplied: false,
      constructPanelsSpawned: 0,
    };
  }
  const fenceCount = countCodeScratchFences(markdown);

  useConstructCodeScratchStore.getState().applyFromAssistantMarkdown(markdown, {
    preferScratchTabId: options?.preferScratchTabId,
  });

  const artboardApplied = applyAssistantArtboardFromMarkdown(markdown);
  const constructPanelsSpawned = applyAssistantConstructPanelFences(markdown, {
    linkedScratchTabId: options?.linkConstructPanelToScratchTabId,
  });

  return {
    codeFencesApplied: fenceCount,
    artboardApplied,
    constructPanelsSpawned,
  };
}

/** Рядок для append до assistant turn у `ollamaThread` (не в UI). */
export function formatConstructApplySyncNote(summary: ConstructAssistantApplySummary): string {
  const bits: string[] = [];
  if (summary.codeFencesApplied > 0) {
    bits.push(`code→scratch: ${summary.codeFencesApplied} fence(s)`);
  }
  if (summary.artboardApplied) bits.push("artboard: applied");
  if (summary.constructPanelsSpawned > 0) {
    bits.push(`construct-panel: ${summary.constructPanelsSpawned} panel(s)`);
  }
  if (bits.length === 0) return "";
  return `\n\n[LavashConstruct sync] ${bits.join("; ")}.`;
}
