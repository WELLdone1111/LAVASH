import { describe, expect, it, vi } from "vitest";

const stopScratch = vi.fn();
const stopProject = vi.fn();

vi.mock("./scratchArtboardSync", () => ({
  startScratchArtboardSync: () => stopScratch,
}));

vi.mock("./projectArtboardSync", () => ({
  startProjectArtboardSync: () => stopProject,
}));

describe("startConstructArtboardCodeSync", () => {
  it("returns teardown that stops scratch and project sync", async () => {
    const { startConstructArtboardCodeSync } = await import("./constructArtboardCodeSync");
    const stop = startConstructArtboardCodeSync();
    expect(typeof stop).toBe("function");
    stop();
    expect(stopScratch).toHaveBeenCalledOnce();
    expect(stopProject).toHaveBeenCalledOnce();
  });
});
