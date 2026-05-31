import { describe, expect, it } from "vitest";
import {
  mergeStreamThinkingParts,
  splitAssistantStreamThinkContent,
  thinkingPreviewLine,
} from "@/features/lavashconstruct/chat/model/constructChatStreamThink";

const THINK_OPEN = "<think>";
const THINK_CLOSE = "</think>";

describe("splitAssistantStreamThinkContent", () => {
  it("extracts complete think block and leaves content", () => {
    const raw = `${THINK_OPEN}Need UI panel${THINK_CLOSE}Hello world`;
    expect(splitAssistantStreamThinkContent(raw)).toEqual({
      thinking: "Need UI panel",
      content: "Hello world",
    });
  });

  it("handles streaming partial think block", () => {
    const raw = `${THINK_OPEN}Still reasoning…`;
    expect(splitAssistantStreamThinkContent(raw)).toEqual({
      thinking: "Still reasoning…",
      content: "",
    });
  });

  it("passes through plain content", () => {
    expect(splitAssistantStreamThinkContent("Just answer")).toEqual({
      thinking: "",
      content: "Just answer",
    });
  });
});

describe("mergeStreamThinkingParts", () => {
  it("merges native channel with tag extraction", () => {
    const raw = `${THINK_OPEN}Inline${THINK_CLOSE}Hi`;
    expect(mergeStreamThinkingParts("Native trace", raw)).toEqual({
      thinking: "Native trace\n\nInline",
      content: "Hi",
    });
  });
});

describe("thinkingPreviewLine", () => {
  it("truncates long preview", () => {
    const long = "a".repeat(80);
    expect(thinkingPreviewLine(long).endsWith("…")).toBe(true);
  });
});
