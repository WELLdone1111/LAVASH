import { describe, expect, it } from "vitest";
import { createArtboardCodeSyncStateMachine } from "./syncStateMachine";

describe("createArtboardCodeSyncStateMachine", () => {
  it("allows flush when idle", () => {
    const machine = createArtboardCodeSyncStateMachine();
    expect(machine.canFlush("toArtboard")).toBe(true);
    expect(machine.canFlush("toCode")).toBe(true);
  });

  it("suppresses echo from the source that triggered the lock", () => {
    const machine = createArtboardCodeSyncStateMachine();
    machine.withLock("toCode", "scratch", () => {
      expect(machine.shouldIgnoreSource("code")).toBe(true);
      expect(machine.shouldIgnoreSource("artboard")).toBe(false);
      expect(machine.canFlush("toArtboard")).toBe(false);
      expect(machine.canFlush("toCode")).toBe(true);
    });
    expect(machine.snapshot().direction).toBe("idle");
  });

  it("restores idle after nested locks unwind", () => {
    const machine = createArtboardCodeSyncStateMachine();
    machine.withLock("toArtboard", "project", () => {
      machine.withLock("toArtboard", "project", () => {
        expect(machine.snapshot().depth).toBe(2);
      });
      expect(machine.snapshot().direction).toBe("toArtboard");
    });
    expect(machine.snapshot()).toEqual({ direction: "idle", depth: 0, channel: null });
  });

  it("pauses all sync sources during bulk restore", () => {
    const machine = createArtboardCodeSyncStateMachine();
    machine.withSyncPaused(() => {
      expect(machine.shouldIgnoreSource("code")).toBe(true);
      expect(machine.shouldIgnoreSource("artboard")).toBe(true);
      expect(machine.canFlush("toArtboard")).toBe(false);
      expect(machine.canFlush("toCode")).toBe(false);
    });
    expect(machine.canFlush("toArtboard")).toBe(true);
  });
});
