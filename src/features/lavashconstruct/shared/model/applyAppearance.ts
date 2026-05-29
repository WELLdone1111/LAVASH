import {
  COLOR_THEME_PALETTES,
  WALLPAPER_BACKGROUNDS,
  type ColorThemeId,
  type WallpaperId,
} from "@/features/lavashconstruct/shared/model/appearanceCatalog";
import { syncWindowChromeBackground } from "@/lib/syncWindowChromeBackground";

export const APPEARANCE_THEME_STORAGE_KEY = "lavash-color-theme";
export const APPEARANCE_WALLPAPER_STORAGE_KEY = "lavash-wallpaper";

export const DEFAULT_COLOR_THEME_ID: ColorThemeId = "daronge";
export const DEFAULT_WALLPAPER_ID: WallpaperId = "charcoal";

export function readStoredColorThemeId(): ColorThemeId {
  if (typeof localStorage === "undefined") return DEFAULT_COLOR_THEME_ID;
  const raw = localStorage.getItem(APPEARANCE_THEME_STORAGE_KEY);
  if (raw && raw in COLOR_THEME_PALETTES) return raw as ColorThemeId;
  return DEFAULT_COLOR_THEME_ID;
}

export function readStoredWallpaperId(): WallpaperId {
  if (typeof localStorage === "undefined") return DEFAULT_WALLPAPER_ID;
  const raw = localStorage.getItem(APPEARANCE_WALLPAPER_STORAGE_KEY);
  if (raw && raw in WALLPAPER_BACKGROUNDS) return raw as WallpaperId;
  return DEFAULT_WALLPAPER_ID;
}

export function applyColorTheme(themeId: ColorThemeId): void {
  const palette = COLOR_THEME_PALETTES[themeId];
  const root = document.documentElement;
  root.dataset.lavashTheme = themeId;
  root.style.setProperty("--palette-bg", palette.bg);
  root.style.setProperty("--palette-surface", palette.surface);
  root.style.setProperty("--palette-surface-2", palette.surface2);
  root.style.setProperty("--palette-border", palette.border);
  root.style.setProperty("--palette-accent", palette.accent);
  root.style.setProperty("--palette-text", palette.text);
  root.style.setProperty("--palette-muted", palette.muted);
  root.style.setProperty("--palette-on-accent", palette.onAccent);
  syncWindowChromeBackground(palette.surface);
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(APPEARANCE_THEME_STORAGE_KEY, themeId);
  }
}

export function applyWallpaper(wallpaperId: WallpaperId): void {
  const bg = WALLPAPER_BACKGROUNDS[wallpaperId];
  document.documentElement.dataset.lavashWallpaper = wallpaperId;
  document.documentElement.style.setProperty("--lavash-app-wallpaper", bg);
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(APPEARANCE_WALLPAPER_STORAGE_KEY, wallpaperId);
  }
}

export function hydrateStoredAppearance(): void {
  applyColorTheme(readStoredColorThemeId());
  applyWallpaper(readStoredWallpaperId());
}
