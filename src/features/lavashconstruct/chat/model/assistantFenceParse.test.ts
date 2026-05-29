import { describe, expect, it } from "vitest";
import {
  collectPanelFencesFromMarkdown,
  parseTrailingOpenPanelFence,
} from "@/features/lavashconstruct/chat/model/assistantFenceParse";

describe("assistantFenceParse", () => {
  it("parses unclosed lavash-panel fence at end of reply", () => {
    const md = `Done on artboard.

\`\`\`html lavash-panel Neon Player
<!DOCTYPE html><html><body><button class="pp">Play</button></body></html>`;

    expect(parseTrailingOpenPanelFence(md)?.tabHint).toBe("lavash-panel Neon Player");
    expect(collectPanelFencesFromMarkdown(md)).toHaveLength(1);
    expect(collectPanelFencesFromMarkdown(md)[0]?.body).toContain("<button");
  });

  it("prefers closed fence over trailing open", () => {
    const md = "```html lavash-panel A\n<div>A</div>\n```\n```html lavash-panel B\n<div>B";
    const fences = collectPanelFencesFromMarkdown(md);
    expect(fences).toHaveLength(1);
    expect(fences[0]?.body).toContain("A");
  });
});
