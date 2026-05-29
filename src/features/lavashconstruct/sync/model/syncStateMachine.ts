/** Канал синхронізації artboard ↔ code. */
export type SyncChannelId = "scratch" | "project";

/**
 * Напрям активної хвилі propagation (echo suppression).
 * - `toArtboard` — code → artboard
 * - `toCode`    — artboard → code (scratch tab або project file)
 */
export type SyncDirection = "idle" | "toArtboard" | "toCode";

export type SyncMachineSnapshot = {
  direction: SyncDirection;
  depth: number;
  channel: SyncChannelId | null;
};

export type ArtboardCodeSyncStateMachine = {
  snapshot: () => SyncMachineSnapshot;
  /** Чи пропустити реакцію джерела (store subscribe), щоб не зациклити echo. */
  shouldIgnoreSource: (source: "code" | "artboard") => boolean;
  /** Чи можна стартувати flush у цьому напрямку. */
  canFlush: (target: "toArtboard" | "toCode") => boolean;
  withLock: (direction: "toArtboard" | "toCode", channel: SyncChannelId, fn: () => void) => void;
  /** Тимчасово вимикає sync (revert чату, bulk restore). */
  withSyncPaused: (fn: () => void) => void;
};

export function createArtboardCodeSyncStateMachine(): ArtboardCodeSyncStateMachine {
  let direction: SyncDirection = "idle";
  let depth = 0;
  let channel: SyncChannelId | null = null;
  let syncPaused = false;

  return {
    snapshot() {
      return { direction, depth, channel };
    },

    shouldIgnoreSource(source) {
      if (syncPaused) return true;
      if (direction === "idle") return false;
      if (source === "code") return direction === "toCode";
      return direction === "toArtboard";
    },

    canFlush(target) {
      if (syncPaused) return false;
      if (direction === "idle") return true;
      if (target === "toArtboard") return direction !== "toCode";
      return direction !== "toArtboard";
    },

    withLock(nextDirection, channelId, fn) {
      const prevDirection = direction;
      const prevChannel = channel;
      direction = nextDirection;
      channel = channelId;
      depth += 1;
      try {
        fn();
      } finally {
        depth -= 1;
        if (depth === 0) {
          direction = "idle";
          channel = null;
        } else {
          direction = prevDirection;
          channel = prevChannel;
        }
      }
    },

    withSyncPaused(fn) {
      syncPaused = true;
      try {
        fn();
      } finally {
        syncPaused = false;
      }
    },
  };
}

/** Глобальна машина станів — один lock на всі канали (scratch + project). */
export const artboardCodeSyncMachine = createArtboardCodeSyncStateMachine();
