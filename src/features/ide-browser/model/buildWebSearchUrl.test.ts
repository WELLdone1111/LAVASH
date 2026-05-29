import { describe, expect, it } from "vitest";
import { buildWebSearchUrl } from "@/features/ide-browser/model/buildWebSearchUrl";

describe("buildWebSearchUrl", () => {
  it("builds google search for plain text", () => {
    expect(buildWebSearchUrl("neon player ui")).toBe(
      "https://www.google.com/search?q=neon%20player%20ui",
    );
  });

  it("passes through https urls", () => {
    expect(buildWebSearchUrl("https://example.com")).toBe("https://example.com");
  });

  it("adds https for bare domains", () => {
    expect(buildWebSearchUrl("figma.com")).toBe("https://figma.com");
  });

  it("returns home page for empty input", () => {
    expect(buildWebSearchUrl("")).toMatch(/\/ide-browser\/google-search\.html$/);
  });
});
