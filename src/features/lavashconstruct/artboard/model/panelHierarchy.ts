import type { ArtboardPanel } from "@/features/lavashconstruct/artboard/ui/types";

/** Горизонтальний паддінг всередині `.lc-draggable-panel`. */
export const BOARD_PANEL_PAD_X = 10;
/** Зсув від верху панелі до внутрішньої композиційної зони (хедер + відступи). */
export const BOARD_BODY_TOP_OFFSET = 30;
export const BOARD_PANEL_PAD_BOTTOM = 8;

export type AxisAlignedRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export function resolvePanelTemplateId(panel: ArtboardPanel): string | null {
  if (panel.id === "player-board-default" || panel.id.startsWith("player-board-")) {
    return "player-board";
  }
  return null;
}

export function isPlayerBoardPanel(panel: ArtboardPanel): boolean {
  if (panel.isBoardContainer) return true;
  return resolvePanelTemplateId(panel) === "player-board";
}

/** Батько вкладеної панелі має бути PlayerBoard (дошки можуть вкладатись в дошки). */
export function isValidChildParentRelation(child: ArtboardPanel, parent: ArtboardPanel | undefined): boolean {
  if (!child.parentId) return true;
  if (!parent || parent.id !== child.parentId) return false;
  return isPlayerBoardPanel(parent);
}

/** Так, якщо `descendantId` в піддереві під `ancestorId` (йдемо вгору по parentId). */
export function isPanelDescendantOf(panels: ArtboardPanel[], descendantId: string, ancestorId: string): boolean {
  let cur: ArtboardPanel | undefined = panels.find((p) => p.id === descendantId);
  while (cur) {
    const pid = cur.parentId;
    if (!pid) break;
    if (pid === ancestorId) return true;
    cur = panels.find((p) => p.id === pid);
  }
  return false;
}

/** Усі панелі з `seedIds` плюс кожен нащадок по parentId. */
export function collectPanelSubtreeIds(panels: ArtboardPanel[], seedIds: Iterable<string>): Set<string> {
  const ids = new Set<string>();
  for (const sid of seedIds) ids.add(sid);
  let grew = true;
  while (grew) {
    grew = false;
    for (const p of panels) {
      if (!ids.has(p.id) && p.parentId && ids.has(p.parentId)) {
        ids.add(p.id);
        grew = true;
      }
    }
  }
  return ids;
}

/**
 * Панелі, що йдуть у пресет: явний вибір + ancestor-дошки (валідний ланцюжок parentId)
 * + усі нащадки всередині цього замикання.
 */
export function collectPresetClosureIds(panels: ArtboardPanel[], seedIds: Iterable<string>): Set<string> {
  const byId = new Map(panels.map((p) => [p.id, p]));
  const withAncestors = new Set<string>();
  for (const sid of seedIds) {
    let cur: ArtboardPanel | undefined = byId.get(sid);
    while (cur) {
      withAncestors.add(cur.id);
      const pid = cur.parentId;
      cur = pid ? byId.get(pid) : undefined;
    }
  }
  return collectPanelSubtreeIds(panels, withAncestors);
}

export function getBoardInnerSize(panel: ArtboardPanel): { width: number; height: number } {
  const w = Math.max(0, panel.width - BOARD_PANEL_PAD_X * 2);
  const h = Math.max(0, panel.height - BOARD_BODY_TOP_OFFSET - BOARD_PANEL_PAD_BOTTOM);
  return { width: w, height: h };
}

/** Початок inner-композиції дошки у світових координатах (верх-ліво). Працює для вкладених дошок. */
export function getBoardInnerOriginWorld(panel: ArtboardPanel, panels: ArtboardPanel[]): { x: number; y: number } {
  const wb = getPanelWorldBounds(panel, panels);
  return {
    x: wb.x + BOARD_PANEL_PAD_X,
    y: wb.y + BOARD_BODY_TOP_OFFSET,
  };
}

export function getBoardInnerRectWorld(panel: ArtboardPanel, panels: ArtboardPanel[]): AxisAlignedRect {
  const origin = getBoardInnerOriginWorld(panel, panels);
  const inner = getBoardInnerSize(panel);
  return { x: origin.x, y: origin.y, width: inner.width, height: inner.height };
}

export function getPanelWorldBounds(panel: ArtboardPanel, panels: ArtboardPanel[]): AxisAlignedRect {
  if (!panel.parentId) {
    return { x: panel.x, y: panel.y, width: panel.width, height: panel.height };
  }
  const parent = panels.find((p) => p.id === panel.parentId);
  if (!parent) {
    return { x: panel.x, y: panel.y, width: panel.width, height: panel.height };
  }
  const origin = getBoardInnerOriginWorld(parent, panels);
  const lx = panel.localX ?? 0;
  const ly = panel.localY ?? 0;
  return {
    x: origin.x + lx,
    y: origin.y + ly,
    width: panel.width,
    height: panel.height,
  };
}

export function clampChildLocalPosition(panel: ArtboardPanel, board: ArtboardPanel): ArtboardPanel {
  const inner = getBoardInnerSize(board);
  const maxX = Math.max(0, inner.width - panel.width);
  const maxY = Math.max(0, inner.height - panel.height);
  return {
    ...panel,
    localX: Math.max(0, Math.min(maxX, panel.localX ?? 0)),
    localY: Math.max(0, Math.min(maxY, panel.localY ?? 0)),
  };
}

export function clampAllBoardChildren(panels: ArtboardPanel[], boardId: string): ArtboardPanel[] {
  const board = panels.find((p) => p.id === boardId);
  if (!board) return panels;
  return panels.map((p) => (p.parentId === boardId ? clampChildLocalPosition(p, board) : p));
}

/**
 * Найглибший PlayerBoard, чий inner-composition rect містить (wx, wy) у world-space.
 * Пріоритет — глибша вкладеність, при рівності — вищий z-index.
 */
export function findPlayerBoardAtWorldPoint(panels: ArtboardPanel[], wx: number, wy: number): ArtboardPanel | null {
  const boards = panels.filter((p) => p.isVisible && isPlayerBoardPanel(p));
  const hits = boards.filter((b) => {
    const inner = getBoardInnerRectWorld(b, panels);
    return (
      wx >= inner.x &&
      wx <= inner.x + inner.width &&
      wy >= inner.y &&
      wy <= inner.y + inner.height
    );
  });
  if (hits.length === 0) return null;

  function depth(panel: ArtboardPanel): number {
    let d = 0;
    let cur: ArtboardPanel | undefined = panel;
    while (cur) {
      const pid: string | undefined = cur.parentId;
      if (!pid) break;
      d += 1;
      cur = panels.find((p) => p.id === pid);
    }
    return d;
  }

  hits.sort((a, b) => {
    const da = depth(a);
    const db = depth(b);
    if (da !== db) return da - db;
    return a.zIndex - b.zIndex;
  });
  return hits[hits.length - 1] ?? null;
}

/** Валідує вкладеність (тільки PlayerBoard як батьки) і клампить дітей у межі inner дошки. */
export function normalizeArtboardPanelsHierarchy(panels: ArtboardPanel[]): ArtboardPanel[] {
  let normalized = panels.map((panel) => {
    if (!panel.parentId) return panel;
    const parent = panels.find((p) => p.id === panel.parentId);
    if (!parent || !isPlayerBoardPanel(parent)) {
      return { ...panel, parentId: undefined, localX: undefined, localY: undefined };
    }
    return panel;
  });

  normalized = normalized.map((panel) => {
    if (!panel.parentId) return panel;
    const parent = normalized.find((p) => p.id === panel.parentId);
    if (!parent) return { ...panel, parentId: undefined, localX: undefined, localY: undefined };
    return clampChildLocalPosition(panel, parent);
  });

  return normalized;
}

/**
 * Прибирає кореневі «порожні» PlayerBoard з типовими назвами/ід (застарілі пресети / автододавання),
 * разом із дочірніми панелями всередині цих дощок.
 */
export function stripAutoTitledRootPlayerBoards(panels: ArtboardPanel[]): ArtboardPanel[] {
  const rootIdsToRemove: string[] = [];
  for (const p of panels) {
    if (p.parentId) continue;
    if (!isPlayerBoardPanel(p)) continue;
    const title = p.title.trim();
    const defaultTitle = /^PlayerBoard(\s+\d+)?$/i.test(title);
    const templateId = p.id === "player-board-default" || p.id.startsWith("player-board-");
    if (defaultTitle || templateId) {
      rootIdsToRemove.push(p.id);
    }
  }
  if (rootIdsToRemove.length === 0) return panels;
  const drop = new Set<string>();
  for (const rootId of rootIdsToRemove) {
    for (const id of collectPanelSubtreeIds(panels, [rootId])) {
      drop.add(id);
    }
  }
  return panels.filter((p) => !drop.has(p.id));
}
