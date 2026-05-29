import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ArtboardPanel } from "@/features/lavashconstruct/artboard/ui/types";
import { useConstructStore } from "@/features/lavashconstruct/artboard/model/store";
import { useConstructCodeScratchStore } from "@/features/lavashconstruct/editor/model/codeScratchStore";
import { SYNC_DEBOUNCE_MS } from "@/features/lavashconstruct/sync/model/panelContentSync";
import {
  collectArtboardToScratchUpdates,
  computeScratchToArtboard,
} from "@/features/lavashconstruct/sync/model/scratchSyncEngine";
import { startScratchArtboardSync } from "@/features/lavashconstruct/sync/model/scratchArtboardSync";

function linkedPanel(overrides: Partial<ArtboardPanel> = {}): ArtboardPanel {
  return {
    id: "panel-1",
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

describe("scratch ↔ artboard E2E scenario", () => {
  it("round-trips code → panel → code without redundant writes", () => {
    let panels = [linkedPanel()];
    const tabs = [{ id: "tab-1", content: "hello" }];

    const toArtboard = computeScratchToArtboard(panels, (id) =>
      id === "tab-1" ? "from scratch" : tabs.find((t) => t.id === id)?.content,
    );
    expect(toArtboard.changed).toBe(true);
    panels = toArtboard.panels;
    expect(panels[0]?.importedTextContent).toBe("from scratch");

    panels = [{ ...panels[0], importedTextContent: "from artboard" }];
    const updates = collectArtboardToScratchUpdates(panels, tabs);
    expect(updates).toEqual([{ tabId: "tab-1", content: "from artboard" }]);
  });

  it("skips scratch push when panel content already matches tab", () => {
    const panels = [linkedPanel({ importedTextContent: "same" })];
    const tabs = [{ id: "tab-1", content: "same" }];
    expect(collectArtboardToScratchUpdates(panels, tabs)).toEqual([]);
  });
});

describe("startScratchArtboardSync (debounced store)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useConstructCodeScratchStore.setState({
      tabs: [{ id: "tab-1", label: "Test", content: "hello" }],
      activeTabId: "tab-1",
    });
    useConstructStore.setState({
      artboardPanels: [linkedPanel()],
      selectedPanelId: "panel-1",
      past: [],
      future: [],
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("syncs scratch edit to linked panel after debounce", () => {
    const stop = startScratchArtboardSync();
    useConstructCodeScratchStore.getState().setTabContent("tab-1", "updated in scratch");
    vi.advanceTimersByTime(SYNC_DEBOUNCE_MS);
    const panel = useConstructStore.getState().artboardPanels[0];
    expect(panel?.importedTextContent).toBe("updated in scratch");
    stop();
  });

  it("syncs panel edit back to scratch tab", () => {
    const stop = startScratchArtboardSync();
    useConstructStore.getState().commitArtboardPanels("test", [
      linkedPanel({ importedTextContent: "from panel" }),
    ]);
    vi.advanceTimersByTime(SYNC_DEBOUNCE_MS);
    expect(useConstructCodeScratchStore.getState().tabs[0]?.content).toBe("from panel");
    stop();
  });
});
