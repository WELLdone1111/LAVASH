import type { ConstructAssistantApplySummary } from "@/features/lavashconstruct/chat/model/constructAssistantApply";

/** Прибирає fenced-блоки з тексту бульбашки — код уже в CODE + на артборді. */
export function stripCodeFencesForChatDisplay(markdown: string): string {
  let withoutFences = markdown
    .replace(/```[^\n\r]*\r?\n[\s\S]*?```/g, "\n")
    .replace(/```[^\n\r]*```/g, "\n");
  // Незакритий lavash-panel — ховаємо хвіст від останнього ``` до кінця.
  const openPanel = markdown.lastIndexOf("```");
  if (openPanel >= 0) {
    const tail = markdown.slice(openPanel);
    if (!tail.slice(3).includes("```") && /\blavash-panel\b/i.test(tail)) {
      withoutFences = markdown.slice(0, openPanel);
    }
  }
  return withoutFences.replace(/\n{3,}/g, "\n\n").trim();
}

export type LavashApplyNoteLabels = {
  code: string;
  artboard: string;
  panel: string;
  onlyApply: string;
};

/** Короткий рядок у чаті: куди застосовано зміни (не дублює код). */
export function formatLavashApplyNoteForUser(
  summary: ConstructAssistantApplySummary,
  labels: LavashApplyNoteLabels,
): string {
  const lines: string[] = [];
  if (summary.codeFencesApplied > 0) lines.push(labels.code);
  if (summary.artboardApplied) lines.push(labels.artboard);
  if (summary.constructPanelsSpawned > 0) lines.push(labels.panel);
  if (lines.length === 0) return "";
  if (lines.length === 1) return lines[0];
  return lines.join("\n");
}

export function buildLavashChatBubbleText(args: {
  modelMarkdown: string;
  summary: ConstructAssistantApplySummary;
  labels: LavashApplyNoteLabels;
  emptyFallback: string;
}): string {
  const prose = stripCodeFencesForChatDisplay(args.modelMarkdown);
  const applyNote = formatLavashApplyNoteForUser(args.summary, args.labels);
  const hadMachineOutput =
    args.summary.codeFencesApplied > 0 ||
    args.summary.artboardApplied ||
    args.summary.constructPanelsSpawned > 0;

  if (prose && applyNote) return `${prose}\n\n${applyNote}`;
  if (prose) return prose;
  if (applyNote) return applyNote;
  if (hadMachineOutput) return args.labels.onlyApply;
  return args.emptyFallback;
}

export const LAVASH_CONSTRUCT_APPLIED_EVENT = "lavash-construct-applied";

export function emitLavashAppliedEvent(summary: ConstructAssistantApplySummary): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(LAVASH_CONSTRUCT_APPLIED_EVENT, { detail: summary }));
}
