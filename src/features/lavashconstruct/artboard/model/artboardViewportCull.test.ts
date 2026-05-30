import { describe, expect, it } from "vitest";
import { filterRootPanelsForViewport } from "@/features/lavashconstruct/artboard/model/artboardViewportCull";
import type { ArtboardPanel } from "@/features/lavashconstruct/artboard/ui/types";

function panel(id: string, x: number, y: number): ArtboardPanel {
  return {
    id,
    title: id,
    x,
    y,
    width: 100,
    height: 80,
    zIndex: 1,
    isVisible: true,
    isLocked: false,
    lockAspectRatio: false,
    opacity: 1,
    category: "import",
    kind: "element",
  } as ArtboardPanel;
}

describe("filterRootPanelsForViewport", () => {
  it("includes panels intersecting viewport", () => {
    const panels = [panel("a", 10, 10), panel("b", 5000, 5000)];
    const visible = filterRootPanelsForViewport({
      panels,
      zoom: 1,
      panX: 0,
      panY: 0,
      viewportW: 800,
      viewportH: 600,
    });
    expect(visible.map((p) => p.id)).toContain("a");
    expect(visible.map((p) => p.id)).not.toContain("b");
  });

  it("always includes pinned ids", () => {
    const panels = [panel("far", 9000, 9000)];
    const visible = filterRootPanelsForViewport({
      panels,
      zoom: 1,
      panX: 0,
      panY: 0,
      viewportW: 400,
      viewportH: 300,
      alwaysIncludeIds: new Set(["far"]),
    });
    expect(visible.map((p) => p.id)).toContain("far");
  });
});
