import { describe, expect, it } from "vitest";
import {
  findTopmostRootPanelAtClientPoint,
  panelUsesAltEditMode,
} from "@/features/lavashconstruct/artboard/model/artboardPanelHitTest";
import type { ArtboardPanel } from "@/features/lavashconstruct/artboard/ui/types";

describe("artboardPanelHitTest", () => {
  it("detects alt-edit panels", () => {
    expect(panelUsesAltEditMode({ importedSourceKind: "text" } as ArtboardPanel)).toBe(true);
    expect(panelUsesAltEditMode({} as ArtboardPanel)).toBe(false);
  });

  it("finds topmost panel at client point", () => {
    const panels = [
      { id: "a", x: 0, y: 0, width: 100, height: 100, zIndex: 1, isVisible: true },
      { id: "b", x: 20, y: 20, width: 80, height: 80, zIndex: 2, isVisible: true },
    ] as ArtboardPanel[];
    const rect = { left: 0, top: 0 } as DOMRect;
    const hit = findTopmostRootPanelAtClientPoint(40, 40, rect, { x: 0, y: 0 }, 1, panels);
    expect(hit?.id).toBe("b");
  });
});
