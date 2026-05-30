import { create } from "zustand";
import { ARTBOARD_INFINITE_PX, DEFAULT_CONSTRUCT_MODE, DEFAULT_MAGNETIC_THRESHOLD } from "@/features/lavashconstruct/shared/model/constants";
import type { ArtboardPanel, ConstructEditableState } from "@/features/lavashconstruct/artboard/ui/types";
import {
  clampAllBoardChildren,
  clampChildLocalPosition,
  collectPanelSubtreeIds,
  getBoardInnerSize,
  isBoardContainerPanel,
  isValidChildParentRelation,
} from "@/features/lavashconstruct/artboard/model/panelHierarchy";
import { panelsInSameCohortSorted } from "@/features/lavashconstruct/artboard/model/layerStack";

type HistoryItem = {
  action: string;
  at: number;
  state: ConstructEditableState;
  artboardPanels: ArtboardPanel[];
  mergeKey?: string;
};

const MAX_HISTORY = 200;

function normalizePanelZIndex(panels: ArtboardPanel[]): ArtboardPanel[] {
  const sorted = [...panels].sort((a, b) => a.zIndex - b.zIndex);
  const zMap = new Map<string, number>();
  sorted.forEach((panel, index) => {
    zMap.set(panel.id, index + 1);
  });
  return panels.map((panel) => ({ ...panel, zIndex: zMap.get(panel.id) ?? panel.zIndex }));
}

export const INITIAL_ARTBOARD_PANELS: ArtboardPanel[] = [];

type ConstructStoreState = {
  constructState: ConstructEditableState;
  artboardPanels: ArtboardPanel[];
  selectedPanelId: string | null;
  past: HistoryItem[];
  future: HistoryItem[];
};

type ConstructStoreActions = {
  commitConstructState: (
    action: string,
    patch: Partial<ConstructEditableState>,
    options?: { mergeKey?: string; mergeWindowMs?: number },
  ) => void;
  undo: () => void;
  redo: () => void;
  setConstructStateDirect: (next: ConstructEditableState) => void;
  setArtboardPanelsDirect: (next: ArtboardPanel[]) => void;
  setArtboardPanels: (updater: (items: ArtboardPanel[]) => ArtboardPanel[]) => void;
  moveArtboardPanel: (payload: { id: string; x: number; y: number; dragFreeChild?: boolean }) => void;
  resizeArtboardPanel: (payload: { id: string; width: number; height: number }) => void;
  commitArtboardPanels: (
    action: string,
    nextPanels: ArtboardPanel[],
    options?: { mergeKey?: string; mergeWindowMs?: number },
  ) => void;
  bringArtboardPanelToFront: (id: string) => void;
  moveArtboardPanelLayerUp: (id: string) => void;
  moveArtboardPanelLayerDown: (id: string) => void;
  moveArtboardPanelToFront: (id: string) => void;
  moveArtboardPanelToBack: (id: string) => void;
  setSelectedPanelId: (id: string | null) => void;
  reorderArtboardPanels: (orderedIds: string[]) => void;
  /** Переставляємо z-index між панелями з одним `parentBoardId` (тільки діти композиції). */
  reorderCompositionPanels: (parentBoardId: string, orderedIds: string[]) => void;
  toggleArtboardPanelVisible: (id: string) => void;
  toggleArtboardPanelLocked: (id: string) => void;
  toggleArtboardPanelAspectLock: (id: string) => void;
  updateArtboardPanelStyle: (id: string, patch: Partial<ArtboardPanel>) => void;
  removeArtboardPanel: (id: string) => void;
};

const DEFAULT_CONSTRUCT_STATE: ConstructEditableState = {
  constructEditMode: DEFAULT_CONSTRUCT_MODE,
  magneticThreshold: DEFAULT_MAGNETIC_THRESHOLD,
  isPreviewAttachmentEnabled: true,
  isDockZonesHighlightEnabled: false,
  isCollisionAvoidanceEnabled: false,
  isMiniPlayerIdle: false,
  isArtboardGridDotsVisible: true,
  isPanelAlignmentSnapEnabled: true,
  isMiniShapeMorphingEnabled: true,
  isMiniReactiveBackgroundEnabled: true,
  isMiniAutoSnapEdgesEnabled: true,
  isMainAdaptiveLayoutEnabled: true,
  isMainCinematicBackdropEnabled: true,
  isMainDockAutoSnapEnabled: true,
  mainPanelDensity: "balanced",
};

export const useConstructStore = create<ConstructStoreState & ConstructStoreActions>((set, get) => ({
  constructState: DEFAULT_CONSTRUCT_STATE,
  artboardPanels: INITIAL_ARTBOARD_PANELS,
  selectedPanelId: INITIAL_ARTBOARD_PANELS[INITIAL_ARTBOARD_PANELS.length - 1]?.id ?? null,
  past: [],
  future: [],

  commitConstructState: (action, patch, options) => {
    const current = get().constructState;
    const next = { ...current, ...patch };
    if (JSON.stringify(next) === JSON.stringify(current)) return;

    const now = Date.now();
    set((state) => {
      const last = state.past[state.past.length - 1];
      const shouldMerge =
        !!options?.mergeKey &&
        !!last &&
        last.mergeKey === options.mergeKey &&
        now - last.at <= (options.mergeWindowMs ?? 260);

      const nextPast = shouldMerge
        ? [...state.past.slice(0, -1), { ...last, at: now }]
        : [
            ...state.past.slice(-MAX_HISTORY + 1),
            {
              action,
              at: now,
              state: state.constructState,
              artboardPanels: state.artboardPanels,
              mergeKey: options?.mergeKey,
            },
          ];

      return { constructState: next, past: nextPast, future: [] };
    });
  },

  undo: () => {
    const state = get();
    if (state.past.length === 0) return;

    const last = state.past[state.past.length - 1];
    set({
      constructState: last.state,
      artboardPanels: last.artboardPanels,
      past: state.past.slice(0, -1),
      future: [
        {
          action: "Redo target",
          at: Date.now(),
          state: state.constructState,
          artboardPanels: state.artboardPanels,
        },
        ...state.future,
      ].slice(0, MAX_HISTORY),
    });
  },

  redo: () => {
    const state = get();
    if (state.future.length === 0) return;

    const [next, ...rest] = state.future;
    set({
      constructState: next.state,
      artboardPanels: next.artboardPanels,
      future: rest,
      past: [
        ...state.past.slice(-MAX_HISTORY + 1),
        {
          action: "Undo target",
          at: Date.now(),
          state: state.constructState,
          artboardPanels: state.artboardPanels,
        },
      ],
    });
  },

  setConstructStateDirect: (next) => {
    set({ constructState: next, past: [], future: [] });
  },

  setArtboardPanelsDirect: (next) => {
    const normalized = normalizePanelZIndex(next);
    set((state) => ({
      artboardPanels: normalized,
      selectedPanelId:
        normalized.some((panel) => panel.id === state.selectedPanelId)
          ? state.selectedPanelId
          : normalized[normalized.length - 1]?.id ?? null,
      past: [],
      future: [],
    }));
  },

  setArtboardPanels: (updater) => {
    set((state) => ({ artboardPanels: updater(state.artboardPanels) }));
  },

  moveArtboardPanel: ({ id, x, y, dragFreeChild }) => {
    const { magneticThreshold: threshold, isPanelAlignmentSnapEnabled: alignSnap } = get().constructState;
    const grid = Math.max(4, Math.round(threshold));
    const ART = ARTBOARD_INFINITE_PX;
    const clamp = (value: number, max: number) => Math.max(0, Math.min(value, max));
    const snapGrid = (value: number, max: number) => {
      const raw = clamp(value, max);
      if (!alignSnap) return raw;
      const snapped = Math.round(raw / grid) * grid;
      return clamp(snapped, max);
    };
    const snapFree = (value: number) => {
      if (!alignSnap) return value;
      return Math.round(value / grid) * grid;
    };

    set((state) => {
      const moving = state.artboardPanels.find((p) => p.id === id);
      if (!moving || moving.isLocked) return state;

      if (moving.parentId) {
        const parent = state.artboardPanels.find((p) => p.id === moving.parentId);
        if (!parent || !isValidChildParentRelation(moving, parent)) {
          return state;
        }
        const inner = getBoardInnerSize(parent);
        const maxLX = Math.max(0, inner.width - moving.width);
        const maxLY = Math.max(0, inner.height - moving.height);
        const nextLocalX = dragFreeChild ? snapFree(x) : snapGrid(x, maxLX);
        const nextLocalY = dragFreeChild ? snapFree(y) : snapGrid(y, maxLY);
        return {
          artboardPanels: state.artboardPanels.map((panel) =>
            panel.id === id ? { ...panel, localX: nextLocalX, localY: nextLocalY } : panel,
          ),
        };
      }

      return {
        artboardPanels: state.artboardPanels.map((panel) => {
          if (panel.id !== id) return panel;
          if (panel.isLocked) return panel;

          const maxX = Math.max(0, ART - panel.width);
          const maxY = Math.max(0, ART - panel.height);
          return {
            ...panel,
            x: snapGrid(x, maxX),
            y: snapGrid(y, maxY),
          };
        }),
      };
    });
  },

  resizeArtboardPanel: ({ id, width, height }) => {
    const minWidth = 120;
    const minHeight = 80;
    const ART = ARTBOARD_INFINITE_PX;

    set((state) => {
      const target = state.artboardPanels.find((p) => p.id === id);
      if (!target || target.isLocked) return state;

      if (target.parentId) {
        const parent = state.artboardPanels.find((p) => p.id === target.parentId);
        if (!parent || !isValidChildParentRelation(target, parent)) return state;
        const inner = getBoardInnerSize(parent);
        const lx = target.localX ?? 0;
        const ly = target.localY ?? 0;
        const maxW = Math.max(minWidth, inner.width - lx);
        const maxH = Math.max(minHeight, inner.height - ly);
        const nextWidth = Math.max(minWidth, Math.min(width, maxW));
        const nextHeight = Math.max(minHeight, Math.min(height, maxH));
        const resized = clampChildLocalPosition({ ...target, width: nextWidth, height: nextHeight }, parent);
        return {
          artboardPanels: state.artboardPanels.map((panel) => (panel.id === id ? resized : panel)),
        };
      }

      let nextPanels = state.artboardPanels.map((panel) => {
        if (panel.id !== id) return panel;
        const nextWidth = Math.max(minWidth, Math.min(width, ART - panel.x));
        const nextHeight = Math.max(minHeight, Math.min(height, ART - panel.y));
        return {
          ...panel,
          width: nextWidth,
          height: nextHeight,
        };
      });
      const board = nextPanels.find((p) => p.id === id && isBoardContainerPanel(p));
      if (board) {
        nextPanels = clampAllBoardChildren(nextPanels, board.id);
      }
      return { artboardPanels: nextPanels };
    });
  },

  commitArtboardPanels: (action, nextPanels, options) => {
    const state = get();
    const normalizedPanels = normalizePanelZIndex(nextPanels);
    if (JSON.stringify(normalizedPanels) === JSON.stringify(state.artboardPanels)) return;
    const now = Date.now();
    const last = state.past[state.past.length - 1];
    const shouldMerge =
      !!options?.mergeKey &&
      !!last &&
      last.mergeKey === options.mergeKey &&
      now - last.at <= (options.mergeWindowMs ?? 260);
    const nextPast = shouldMerge
      ? [...state.past.slice(0, -1), { ...last, at: now }]
      : [
          ...state.past.slice(-MAX_HISTORY + 1),
          {
            action,
            at: now,
            state: state.constructState,
            artboardPanels: state.artboardPanels,
            mergeKey: options?.mergeKey,
          },
        ];

    set({
      artboardPanels: normalizedPanels,
      future: [],
      past: nextPast,
    });
  },

  bringArtboardPanelToFront: (id) => {
    set((state) => {
      const current = state.artboardPanels.find((panel) => panel.id === id);
      if (!current) return state;
      const cohort = panelsInSameCohortSorted(state.artboardPanels, id);
      const maxZ = Math.max(...cohort.map((p) => p.zIndex));
      if (current.zIndex >= maxZ) return state;

      return {
        artboardPanels: normalizePanelZIndex(
          state.artboardPanels.map((panel) =>
            panel.id === id ? { ...panel, zIndex: maxZ + 1 } : panel,
          ),
        ),
      };
    });
  },

  moveArtboardPanelLayerUp: (id) => {
    set((state) => {
      const sorted = panelsInSameCohortSorted(state.artboardPanels, id);
      const index = sorted.findIndex((panel) => panel.id === id);
      if (index < 0 || index === sorted.length - 1) return state;

      const current = sorted[index];
      const next = sorted[index + 1];
      const swapped = state.artboardPanels.map((panel) => {
        if (panel.id === current.id) return { ...panel, zIndex: next.zIndex };
        if (panel.id === next.id) return { ...panel, zIndex: current.zIndex };
        return panel;
      });
      const normalized = normalizePanelZIndex(swapped);
      return {
        artboardPanels: normalized,
        future: [],
        past: [
          ...state.past.slice(-MAX_HISTORY + 1),
          {
            action: "Layer up",
            at: Date.now(),
            state: state.constructState,
            artboardPanels: state.artboardPanels,
          },
        ],
      };
    });
  },

  moveArtboardPanelLayerDown: (id) => {
    set((state) => {
      const sorted = panelsInSameCohortSorted(state.artboardPanels, id);
      const index = sorted.findIndex((panel) => panel.id === id);
      if (index <= 0) return state;

      const current = sorted[index];
      const prev = sorted[index - 1];
      const swapped = state.artboardPanels.map((panel) => {
        if (panel.id === current.id) return { ...panel, zIndex: prev.zIndex };
        if (panel.id === prev.id) return { ...panel, zIndex: current.zIndex };
        return panel;
      });
      const normalized = normalizePanelZIndex(swapped);
      return {
        artboardPanels: normalized,
        future: [],
        past: [
          ...state.past.slice(-MAX_HISTORY + 1),
          {
            action: "Layer down",
            at: Date.now(),
            state: state.constructState,
            artboardPanels: state.artboardPanels,
          },
        ],
      };
    });
  },

  moveArtboardPanelToFront: (id) => {
    set((state) => {
      const current = state.artboardPanels.find((panel) => panel.id === id);
      if (!current) return state;
      const cohort = panelsInSameCohortSorted(state.artboardPanels, id);
      const maxZ = Math.max(...cohort.map((p) => p.zIndex));
      if (current.zIndex >= maxZ) return state;

      const nextPanels = normalizePanelZIndex(
        state.artboardPanels.map((panel) =>
          panel.id === id ? { ...panel, zIndex: maxZ + 1 } : panel,
        ),
      );
      return {
        artboardPanels: nextPanels,
        future: [],
        past: [
          ...state.past.slice(-MAX_HISTORY + 1),
          {
            action: "Bring to front",
            at: Date.now(),
            state: state.constructState,
            artboardPanels: state.artboardPanels,
          },
        ],
      };
    });
  },

  moveArtboardPanelToBack: (id) => {
    set((state) => {
      const current = state.artboardPanels.find((panel) => panel.id === id);
      if (!current) return state;
      const cohort = panelsInSameCohortSorted(state.artboardPanels, id);
      const minZ = Math.min(...cohort.map((p) => p.zIndex));
      if (current.zIndex <= minZ) return state;

      const nextPanels = normalizePanelZIndex(
        state.artboardPanels.map((panel) =>
          panel.id === id ? { ...panel, zIndex: minZ - 1 } : panel,
        ),
      );
      return {
        artboardPanels: nextPanels,
        future: [],
        past: [
          ...state.past.slice(-MAX_HISTORY + 1),
          {
            action: "Send to back",
            at: Date.now(),
            state: state.constructState,
            artboardPanels: state.artboardPanels,
          },
        ],
      };
    });
  },

  setSelectedPanelId: (id) => {
    set({ selectedPanelId: id });
  },

  reorderArtboardPanels: (orderedIds) => {
    set((state) => {
      const roots = state.artboardPanels.filter((p) => !p.parentId);
      if (orderedIds.length !== roots.length) return state;
      const rootIds = new Set(roots.map((r) => r.id));
      if (!orderedIds.every((id) => rootIds.has(id))) return state;

      const rootById = new Map(roots.map((r) => [r.id, r]));
      let zi = 1;
      const nextRoots = orderedIds.map((rid) => ({ ...rootById.get(rid)!, zIndex: zi++ }));
      const children = [...state.artboardPanels.filter((p) => p.parentId)].sort((a, b) => a.zIndex - b.zIndex);
      const nextChildren = children.map((c) => ({ ...c, zIndex: zi++ }));
      const nextPanels = normalizePanelZIndex([...nextRoots, ...nextChildren]);

      return {
        artboardPanels: nextPanels,
        future: [],
        past: [
          ...state.past.slice(-MAX_HISTORY + 1),
          {
            action: "Reorder layers",
            at: Date.now(),
            state: state.constructState,
            artboardPanels: state.artboardPanels,
          },
        ],
      };
    });
  },

  reorderCompositionPanels: (parentBoardId, orderedIds) => {
    set((state) => {
      const siblings = state.artboardPanels.filter((p) => p.parentId === parentBoardId);
      if (orderedIds.length !== siblings.length) return state;
      const sibSet = new Set(siblings.map((s) => s.id));
      if (!orderedIds.every((id) => sibSet.has(id))) return state;

      const sortedByZAsc = [...siblings].sort((a, b) => a.zIndex - b.zIndex);
      const slots = sortedByZAsc.map((s) => s.zIndex);
      const nextPanels = state.artboardPanels.map((panel) => {
        if (panel.parentId !== parentBoardId) return panel;
        const idx = orderedIds.indexOf(panel.id);
        if (idx < 0) return panel;
        return { ...panel, zIndex: slots[idx]! };
      });
      const normalized = normalizePanelZIndex(nextPanels);

      return {
        artboardPanels: normalized,
        future: [],
        past: [
          ...state.past.slice(-MAX_HISTORY + 1),
          {
            action: "Reorder composition layers",
            at: Date.now(),
            state: state.constructState,
            artboardPanels: state.artboardPanels,
          },
        ],
      };
    });
  },

  toggleArtboardPanelVisible: (id) => {
    set((state) => {
      const exists = state.artboardPanels.some((panel) => panel.id === id);
      if (!exists) return state;
      return {
        artboardPanels: state.artboardPanels.map((panel) =>
          panel.id === id ? { ...panel, isVisible: !panel.isVisible } : panel,
        ),
        future: [],
        past: [
          ...state.past.slice(-MAX_HISTORY + 1),
          {
            action: "Toggle panel visibility",
            at: Date.now(),
            state: state.constructState,
            artboardPanels: state.artboardPanels,
          },
        ],
      };
    });
  },

  toggleArtboardPanelLocked: (id) => {
    set((state) => {
      const exists = state.artboardPanels.some((panel) => panel.id === id);
      if (!exists) return state;
      return {
        artboardPanels: state.artboardPanels.map((panel) =>
          panel.id === id ? { ...panel, isLocked: !panel.isLocked } : panel,
        ),
        future: [],
        past: [
          ...state.past.slice(-MAX_HISTORY + 1),
          {
            action: "Toggle panel lock",
            at: Date.now(),
            state: state.constructState,
            artboardPanels: state.artboardPanels,
          },
        ],
      };
    });
  },

  toggleArtboardPanelAspectLock: (id) => {
    set((state) => {
      const exists = state.artboardPanels.some((panel) => panel.id === id);
      if (!exists) return state;
      return {
        artboardPanels: state.artboardPanels.map((panel) =>
          panel.id === id ? { ...panel, lockAspectRatio: !panel.lockAspectRatio } : panel,
        ),
        future: [],
        past: [
          ...state.past.slice(-MAX_HISTORY + 1),
          {
            action: "Toggle aspect ratio lock",
            at: Date.now(),
            state: state.constructState,
            artboardPanels: state.artboardPanels,
          },
        ],
      };
    });
  },

  updateArtboardPanelStyle: (id, patch) => {
    set((state) => {
      const current = state.artboardPanels.find((panel) => panel.id === id);
      if (!current || current.isLocked) return state;
      return {
        artboardPanels: state.artboardPanels.map((panel) =>
          panel.id === id ? { ...panel, ...patch } : panel,
        ),
        future: [],
        past: [
          ...state.past.slice(-MAX_HISTORY + 1),
          {
            action: "Update panel style",
            at: Date.now(),
            state: state.constructState,
            artboardPanels: state.artboardPanels,
          },
        ],
      };
    });
  },

  removeArtboardPanel: (id) => {
    set((state) => {
      const panelToRemove = state.artboardPanels.find((panel) => panel.id === id);
      if (!panelToRemove || panelToRemove.isLocked) return state;
      const idsToRemove = collectPanelSubtreeIds(state.artboardPanels, [id]);
      const nextPanels = normalizePanelZIndex(
        state.artboardPanels.filter((panel) => !idsToRemove.has(panel.id)),
      );
      const removedSelection = idsToRemove.has(state.selectedPanelId ?? "");
      return {
        artboardPanels: nextPanels,
        selectedPanelId: removedSelection ? nextPanels[nextPanels.length - 1]?.id ?? null : state.selectedPanelId,
        future: [],
        past: [
          ...state.past.slice(-MAX_HISTORY + 1),
          {
            action: "Remove panel",
            at: Date.now(),
            state: state.constructState,
            artboardPanels: state.artboardPanels,
          },
        ],
      };
    });
  },
}));
