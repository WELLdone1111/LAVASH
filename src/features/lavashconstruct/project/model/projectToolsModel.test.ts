import { describe, expect, it } from "vitest";

import {
  formatDevToolsError,
  gitStatusLabel,
  gitStatusMapFromList,
} from "@/features/lavashconstruct/project/model/projectToolsModel";

describe("projectToolsModel", () => {
  it("builds git status map from rows", () => {
    expect(
      gitStatusMapFromList([
        { path: "src/a.ts", status: "M" },
        { path: "new.txt", status: "??" },
      ]),
    ).toEqual({
      "src/a.ts": "M",
      "new.txt": "??",
    });
  });

  it("maps porcelain codes to labels", () => {
    expect(gitStatusLabel("??")).toBe("untracked");
    expect(gitStatusLabel(" M")).toBe("modified");
    expect(gitStatusLabel("A ")).toBe("added");
  });

  it("formats errors from strings and Error objects", () => {
    expect(formatDevToolsError("Git missing", "fallback")).toBe("Git missing");
    expect(formatDevToolsError(new Error("spawn failed"), "fallback")).toBe("spawn failed");
    expect(formatDevToolsError(null, "fallback")).toBe("fallback");
  });
});
