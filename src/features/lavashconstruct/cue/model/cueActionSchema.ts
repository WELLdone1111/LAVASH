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

export type CueAction = CueSpawnPanelAction | CuePatchArtboardAction;

export const CUE_ACTIONS_FENCE_HINT_RE = /\b(?:lavash-actions|cue-actions)\b/i;

export function isCueActionsFenceHint(tabHint: string): boolean {
  return CUE_ACTIONS_FENCE_HINT_RE.test(tabHint);
}

function readString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
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
    merge: raw.merge === true,
    artboardPanels: panels,
  };
}

export function normalizeCueAction(raw: unknown): CueAction | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const type = readString(row.type).toLowerCase();
  if (type === "spawn_panel") return normalizeSpawnPanel(row);
  if (type === "patch_artboard") return normalizePatchArtboard(row);
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
