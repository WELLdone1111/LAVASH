import {
  CONSTRUCT_CHAT_COLLAPSED_RAIL_PX,
  type ConstructUnifiedLayout,
} from "@/features/lavashconstruct/workspace/model/constructUnifiedLayoutStorage";

/** Тільки CSS-змінні — сітка в `.lc-unified-shell`, без перепису grid на кожен кадр. */
export function paintConstructShellGrid(el: HTMLElement, layout: ConstructUnifiedLayout): void {
  if (layout.chatCollapsed) {
    el.dataset.chatCollapsed = "1";
    el.style.setProperty("--lc-chat-column-width", `${CONSTRUCT_CHAT_COLLAPSED_RAIL_PX}px`);
    return;
  }
  delete el.dataset.chatCollapsed;
  el.style.setProperty("--lc-chat-column-width", `${layout.chatW}px`);
}

export function paintConstructBottomGrid(el: HTMLElement, layersFr: number): void {
  const r = Math.max(0.001, 1 - layersFr);
  el.style.display = "grid";
  el.style.gridTemplateColumns = `minmax(120px, ${layersFr}fr) 4px minmax(140px, ${r}fr)`;
  el.style.gap = "0";
  el.style.minHeight = "0";
  el.style.minWidth = "0";
}
