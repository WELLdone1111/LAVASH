export const CONSTRUCT_UNIFIED_LAYOUT_STORAGE_KEY = "lavash.construct.unifiedLayout.v1";

export type ConstructUnifiedLayout = {
  libW: number;
  chatW: number;
  bottomH: number;
  /** Частка ширини нижнього ряду для панелі Layers (решта — Code). */
  layersFr: number;
  /** Чат згорнуто до вузької смуги зліва. */
  chatCollapsed?: boolean;
};

export const CONSTRUCT_RAIL_WIDTH_PX = 38;

/** Ширина смуги «розгорнути чат», коли панель згорнута. */
export const CONSTRUCT_CHAT_COLLAPSED_RAIL_PX = 32;

/**
 * Мін. ширина колонки чату — компактний композер (mode pill + скріпка + send в один ряд справа).
 * ~92px pill + 32 + 32 + відступи композера/панелі.
 */
export const CONSTRUCT_CHAT_PANEL_MIN_WIDTH_PX = 208;

export const CONSTRUCT_UNIFIED_LAYOUT_DEFAULTS: ConstructUnifiedLayout = {
  libW: CONSTRUCT_RAIL_WIDTH_PX,
  chatW: 300,
  bottomH: 220,
  layersFr: 0.5,
};

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function readConstructUnifiedLayout(): ConstructUnifiedLayout {
  const d = CONSTRUCT_UNIFIED_LAYOUT_DEFAULTS;
  try {
    const raw = localStorage.getItem(CONSTRUCT_UNIFIED_LAYOUT_STORAGE_KEY);
    if (!raw) return { ...d };
    const o = JSON.parse(raw) as Partial<ConstructUnifiedLayout>;
    const rawLibW = Number(o.libW) || d.libW;
    const libW = rawLibW > 96 ? CONSTRUCT_RAIL_WIDTH_PX : clamp(rawLibW, 38, 58);
    return {
      libW,
      chatW: clamp(Number(o.chatW) || d.chatW, CONSTRUCT_CHAT_PANEL_MIN_WIDTH_PX, 620),
      bottomH: clamp(Number(o.bottomH) || d.bottomH, 96, 560),
      layersFr: clamp(Number(o.layersFr) || d.layersFr, 0.18, 0.82),
      chatCollapsed: Boolean(o.chatCollapsed),
    };
  } catch {
    return { ...d };
  }
}

export function writeConstructUnifiedLayout(layout: ConstructUnifiedLayout): void {
  try {
    localStorage.setItem(CONSTRUCT_UNIFIED_LAYOUT_STORAGE_KEY, JSON.stringify(layout));
  } catch {
    /* пофіг */
  }
}
