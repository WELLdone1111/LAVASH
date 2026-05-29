import { describe, expect, it } from "vitest";
import { lspUriToRelativePath } from "@/features/lavashconstruct/editor/model/lsp/lspUriUtils";

describe("lspUriToRelativePath", () => {
  it("parses Windows file URI", () => {
    const rel = lspUriToRelativePath("file:///C:/proj/src/App.tsx");
    expect(rel).toBe("C:/proj/src/App.tsx");
  });

  it("parses posix file URI", () => {
    const rel = lspUriToRelativePath("file:///home/user/proj/index.ts");
    expect(rel).toBe("/home/user/proj/index.ts");
  });
});
