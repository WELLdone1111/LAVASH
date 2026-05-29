import { describe, expect, it } from "vitest";
import { trimRevertSnapshotsForPersist, findRevertSnapshotAfterMessageIndex } from "./constructChatRevertSnapshot";

describe("trimRevertSnapshotsForPersist", () => {
  it("keeps revertSnapshot only on the last N assistant messages", () => {
    const mk = (id: string, role: "user" | "assistant") => ({
      id,
      role,
      text: id,
      revertSnapshot:
        role === "assistant"
          ? {
              artboardPanels: [],
              selectedPanelId: null,
              scratchTabs: [],
              scratchActiveTabId: "s1",
            }
          : undefined,
    });
    const messages = [
      mk("u1", "user"),
      mk("a1", "assistant"),
      mk("u2", "user"),
      mk("a2", "assistant"),
      mk("u3", "user"),
      mk("a3", "assistant"),
    ];
    const trimmed = trimRevertSnapshotsForPersist(messages, 1);
    expect(trimmed[1].revertSnapshot).toBeUndefined();
    expect(trimmed[3].revertSnapshot).toBeUndefined();
    expect(trimmed[5].revertSnapshot).toBeDefined();
  });
});

describe("findRevertSnapshotAfterMessageIndex", () => {
  it("returns first assistant revert snapshot after index", () => {
    const snap = {
      artboardPanels: [],
      selectedPanelId: null,
      scratchTabs: [],
      scratchActiveTabId: "s1",
    };
    const messages = [
      { role: "user", text: "u1" },
      { role: "assistant", text: "a1", revertSnapshot: snap },
      { role: "user", text: "u2" },
      { role: "assistant", text: "a2" },
    ];
    expect(findRevertSnapshotAfterMessageIndex(messages, 0)?.scratchActiveTabId).toBe("s1");
    expect(findRevertSnapshotAfterMessageIndex(messages, 2)).toBeNull();
  });
});
