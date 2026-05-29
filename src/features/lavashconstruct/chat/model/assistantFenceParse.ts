import { isAssistantPanelFence } from "@/features/lavashconstruct/chat/model/assistantFenceHints";
import {
  parseCodeFencesFromMarkdown,
  type ParsedCodeFence,
} from "@/features/lavashconstruct/editor/model/codeScratchStore";

/** Незакритий ```html lavash-panel …``` в кінці відповіді (моделі часто забувають ```). */
export function parseTrailingOpenPanelFence(markdown: string): ParsedCodeFence | null {
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
  if (!isAssistantPanelFence(tabHint)) return null;
  if (lang.trim().toLowerCase() === "json") return null;
  if (!body.trim()) return null;
  return { lang, tabHint, body };
}

/** Закриті фенси + один відкритий lavash-panel, якщо закритого panel-fence немає. */
export function collectPanelFencesFromMarkdown(markdown: string): ParsedCodeFence[] {
  const closed = parseCodeFencesFromMarkdown(markdown).filter((f) => isAssistantPanelFence(f.tabHint));
  if (closed.length > 0) return closed;
  const open = parseTrailingOpenPanelFence(markdown);
  return open ? [open] : [];
}
