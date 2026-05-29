import { describe, expect, it } from "vitest";
import { buildConstructApplyFormatGuide } from "@/features/lavashconstruct/chat/model/constructChatApplyFormatGuide";

describe("buildConstructApplyFormatGuide", () => {
  it("agent guide requires lavash-panel fences and forbids manual steps", () => {
    const guide = buildConstructApplyFormatGuide("agent");
    expect(guide).toContain("lavash-panel");
    expect(guide).toContain("NEVER tell the user");
    expect(guide).toContain("Ctrl+S");
  });

  it("ask guide forbids apply fences", () => {
    const guide = buildConstructApplyFormatGuide("ask");
    expect(guide).toContain("no apply fences");
  });
});
