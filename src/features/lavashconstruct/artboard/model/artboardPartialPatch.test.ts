import { describe, expect, it } from "vitest";

import {
  mergeArtboardPanelPatches,
  parseArtboardPanelPatch,
} from "@/features/lavashconstruct/artboard/model/artboardPartialPatch";
import type { ArtboardPanel } from "@/features/lavashconstruct/artboard/ui/types";

const basePanel = (): ArtboardPanel => ({
  id: "panel-a",
  title: "Button",
  x: 10,
  y: 20,
  width: 200,
  height: 120,
  zIndex: 1,
  isVisible: true,
  isLocked: false,
  lockAspectRatio: false,
  importedVisualKind: "html",
  importedTextContent: "<button>Go</button>",
});

describe("artboardPartialPatch", () => {
  it("merges only provided fields and preserves content", () => {
    const current = [basePanel()];
    const patch = parseArtboardPanelPatch({ id: "panel-a", x: 300, title: "Moved" });
    expect(patch).not.toBeNull();

    const merged = mergeArtboardPanelPatches(current, [patch!]);
    expect(merged).not.toBeNull();
    expect(merged![0].x).toBe(300);
    expect(merged![0].title).toBe("Moved");
    expect(merged![0].importedTextContent).toBe("<button>Go</button>");
    expect(merged![0].y).toBe(20);
  });

  it("adds new panel when patch id is unknown", () => {
    const current = [basePanel()];
    const merged = mergeArtboardPanelPatches(current, [
      {
        id: "panel-b",
        title: "New",
        x: 40,
        y: 40,
        width: 180,
        height: 100,
        importedTextContent: "<div>Hi</div>",
        importedVisualKind: "html",
      },
    ]);
    expect(merged?.length).toBe(2);
    expect(merged?.some((p) => p.id === "panel-b")).toBe(true);
  });
});
