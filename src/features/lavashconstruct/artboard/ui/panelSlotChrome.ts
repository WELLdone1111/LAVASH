import type { CSSProperties } from "react";
import type { ArtboardPanel } from "@/features/lavashconstruct/artboard/ui/types";

export function panelBoxShadowValue(panel: ArtboardPanel): string {
  if (panel.isShadowEnabled === false) return "none";
  const base = `${panel.shadowX ?? 0}px ${panel.shadowY ?? 12}px ${panel.shadowBlur ?? 24}px ${panel.shadowSpread ?? 0}px color-mix(in srgb, ${panel.shadowColor ?? "#000000"} ${Math.round((panel.shadowOpacity ?? 0.2) * 100)}%, transparent)`;
  const neon = panel.isNeonGlowEnabled
    ? `, 0 0 ${((panel.neonGlow ?? 0) / 100) * 24}px color-mix(in srgb, ${panel.neonGlowColor ?? "#60a5fa"} 75%, transparent)`
    : "";
  const edge = `, inset 0 0 ${((panel.edgeGlow ?? 0) / 100) * 16}px color-mix(in srgb, white 35%, transparent)`;
  return `${base}${neon}${edge}`;
}

/**
 * Скляний хром для звичайних панелей; імпорт / ліба — візуально пуста оболонка
 * (прозора, поки юзер не задав `backgroundColor`).
 */
export function panelShellSurfaceStyle(
  panel: ArtboardPanel,
  frameless: boolean,
): Pick<CSSProperties, "backgroundColor" | "backdropFilter" | "boxShadow"> {
  if (!frameless) {
    return {
      backgroundColor: panel.backgroundColor ?? "rgba(255,255,255,0.08)",
      backdropFilter: `blur(${panel.blurPx ?? 0}px)`,
      boxShadow: panelBoxShadowValue(panel),
    };
  }
  const bg =
    typeof panel.backgroundColor === "string" && panel.backgroundColor.trim().length > 0
      ? panel.backgroundColor
      : "transparent";
  const backdrop = (panel.blurPx ?? 0) > 0 ? `blur(${panel.blurPx}px)` : "none";
  return {
    backgroundColor: bg,
    backdropFilter: backdrop,
    boxShadow: "none",
  };
}

export function rootPanelWorldTransform(panel: ArtboardPanel, adaptiveScale: number): string {
  const r = panel.rotationDeg ?? 0;
  return `translate(${panel.x}px, ${panel.y}px) scale(${adaptiveScale}) rotate(${r}deg)`;
}

export const ROOT_PANEL_TRANSFORM_ORIGIN = "50% 50%";

export function nestedPanelLocalTransform(panel: ArtboardPanel): { transform: string; transformOrigin: string } {
  const r = panel.rotationDeg ?? 0;
  if (r === 0) return { transform: "none", transformOrigin: "top left" };
  return { transform: `rotate(${r}deg)`, transformOrigin: "50% 50%" };
}
