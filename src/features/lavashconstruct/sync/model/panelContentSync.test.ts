import { describe, expect, it } from "vitest";
import type { ArtboardPanel } from "@/features/lavashconstruct/artboard/ui/types";
import {
  applyCodeToLinkedPanels,
  panelImportedContentEquals,
  patchPanelImportedCode,
} from "./panelContentSync";

function panel(overrides: Partial<ArtboardPanel> = {}): ArtboardPanel {
  return {
    id: "p1",
    title: "Panel",
    x: 0,
    y: 0,
    width: 120,
    height: 80,
    zIndex: 1,
    isVisible: true,
    isLocked: false,
    lockAspectRatio: false,
    importedSourceKind: "text",
    importedVisualKind: "plain-text",
    importedTextContent: "hello",
    linkedScratchTabId: "tab-1",
    ...overrides,
  };
}

describe("panelContentSync", () => {
  it("detects equal imported content", () => {
    const p = panel();
    expect(panelImportedContentEquals(p, "hello", undefined)).toBe(true);
    expect(panelImportedContentEquals(p, "world", undefined)).toBe(false);
  });

  it("patches panel code when content changes", () => {
    const p = panel();
    const { panel: next, changed } = patchPanelImportedCode(p, "updated");
    expect(changed).toBe(true);
    expect(next.importedTextContent).toBe("updated");
  });

  it("skips locked panels during linked apply", () => {
    const locked = panel({ isLocked: true, importedTextContent: "hello" });
    const { panels, changed } = applyCodeToLinkedPanels(
      [locked],
      (item) => item.linkedScratchTabId,
      () => "changed",
    );
    expect(changed).toBe(false);
    expect(panels[0]?.importedTextContent).toBe("hello");
  });

  it("applies code to panels with scratch links", () => {
    const p = panel();
    const { panels, changed } = applyCodeToLinkedPanels(
      [p],
      (item) => item.linkedScratchTabId,
      () => "from scratch",
    );
    expect(changed).toBe(true);
    expect(panels[0]?.importedTextContent).toBe("from scratch");
  });
});
