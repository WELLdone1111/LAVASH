export type CueSpawnPanelAction = {
  type: "spawn_panel";
  title: string;
  html: string;
  lang?: string;
};

export type CuePatchArtboardAction = {
  type: "patch_artboard";
  merge: boolean;
  artboardPanels: unknown[];
};

export type CueReplaceArtboardAction = {
  type: "replace_artboard";
  artboardPanels: unknown[];
};

export type CueRemovePanelsAction = {
  type: "remove_panels";
  panelIds: string[];
};

export type CueClearArtboardAction = {
  type: "clear_artboard";
};

export type CueReorderPanelsAction = {
  type: "reorder_panels";
  orderedIds: string[];
  /** Якщо задано — переставляє шари всередині composition board. */
  parentId?: string;
};

export type CueSelectPanelAction = {
  type: "select_panel";
  panelId: string | null;
};

export type CueAction =
  | CueSpawnPanelAction
  | CuePatchArtboardAction
  | CueReplaceArtboardAction
  | CueRemovePanelsAction
  | CueClearArtboardAction
  | CueReorderPanelsAction
  | CueSelectPanelAction;

export const CUE_ACTIONS_FENCE_HINT_RE = /\b(?:lavash-actions|cue-actions)\b/i;

export function isCueActionsFenceHint(tabHint: string): boolean {
  return CUE_ACTIONS_FENCE_HINT_RE.test(tabHint);
}

function readString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function readStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
}

function normalizeSpawnPanel(raw: Record<string, unknown>): CueSpawnPanelAction | null {
  const title = readString(raw.title);
  const html = readString(raw.html) || readString(raw.content) || readString(raw.body);
  if (!title || !html) return null;
  const lang = readString(raw.lang) || undefined;
  return { type: "spawn_panel", title, html, lang };
}

function normalizePatchArtboard(raw: Record<string, unknown>): CuePatchArtboardAction | null {
  const panels = raw.artboardPanels;
  if (!Array.isArray(panels) || panels.length === 0) return null;
  return {
    type: "patch_artboard",
    merge: raw.merge !== false,
    artboardPanels: panels,
  };
}

function normalizeReplaceArtboard(raw: Record<string, unknown>): CueReplaceArtboardAction | null {
  const panels = raw.artboardPanels;
  if (!Array.isArray(panels)) return null;
  return { type: "replace_artboard", artboardPanels: panels };
}

function normalizeRemovePanels(raw: Record<string, unknown>): CueRemovePanelsAction | null {
  const panelIds = readStringArray(raw.panelIds ?? raw.ids);
  if (panelIds.length === 0) return null;
  return { type: "remove_panels", panelIds };
}

function normalizeClearArtboard(raw: Record<string, unknown>): CueClearArtboardAction | null {
  if (raw.type !== "clear_artboard") return null;
  return { type: "clear_artboard" };
}

function normalizeReorderPanels(raw: Record<string, unknown>): CueReorderPanelsAction | null {
  const orderedIds = readStringArray(raw.orderedIds ?? raw.panelIds ?? raw.ids);
  if (orderedIds.length === 0) return null;
  const parentId = readString(raw.parentId) || undefined;
  return { type: "reorder_panels", orderedIds, parentId };
}

function normalizeSelectPanel(raw: Record<string, unknown>): CueSelectPanelAction | null {
  if (!("panelId" in raw) && !("id" in raw)) return null;
  const panelIdRaw = raw.panelId ?? raw.id;
  if (panelIdRaw === null) return { type: "select_panel", panelId: null };
  const panelId = readString(panelIdRaw);
  return { type: "select_panel", panelId: panelId || null };
}

export function normalizeCueAction(raw: unknown): CueAction | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const type = readString(row.type).toLowerCase();
  if (type === "spawn_panel") return normalizeSpawnPanel(row);
  if (type === "patch_artboard") return normalizePatchArtboard(row);
  if (type === "replace_artboard") return normalizeReplaceArtboard(row);
  if (type === "remove_panels" || type === "delete_panels") return normalizeRemovePanels(row);
  if (type === "clear_artboard") return normalizeClearArtboard(row);
  if (type === "reorder_panels") return normalizeReorderPanels(row);
  if (type === "select_panel") return normalizeSelectPanel(row);
  return null;
}

export function parseCueActionsPayload(parsed: unknown): CueAction[] {
  const list = Array.isArray(parsed)
    ? parsed
    : parsed && typeof parsed === "object" && Array.isArray((parsed as { actions?: unknown }).actions)
      ? (parsed as { actions: unknown[] }).actions
      : null;
  if (!list) return [];
  const out: CueAction[] = [];
  for (const item of list) {
    const action = normalizeCueAction(item);
    if (action) out.push(action);
  }
  return out;
}
