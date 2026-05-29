export type ColorThemeId = "daronge" | "midnight" | "rose" | "forest" | "lavender" | "mono";

export type WallpaperId =
  | "charcoal"
  | "warm-amber"
  | "blue-hour"
  | "rose-dusk"
  | "forest-mist"
  | "lavender-haze"
  | "sunset"
  | "ocean"
  | "midnight-grid"
  | "cream-paper"
  | "mono-fade"
  | "neon-arcade"
  | "aurora-sky"
  | "candy-pop"
  | "vinyl-groove"
  | "cosmic-dust"
  | "retro-wave";

export type AppearancePalette = {
  bg: string;
  surface: string;
  surface2: string;
  border: string;
  accent: string;
  text: string;
  muted: string;
  onAccent: string;
};

export const COLOR_THEME_IDS: ColorThemeId[] = [
  "daronge",
  "midnight",
  "rose",
  "forest",
  "lavender",
  "mono",
];

export const WALLPAPER_IDS: WallpaperId[] = [
  "charcoal",
  "warm-amber",
  "blue-hour",
  "rose-dusk",
  "forest-mist",
  "lavender-haze",
  "sunset",
  "ocean",
  "midnight-grid",
  "cream-paper",
  "mono-fade",
  "neon-arcade",
  "aurora-sky",
  "candy-pop",
  "vinyl-groove",
  "cosmic-dust",
  "retro-wave",
];

export const COLOR_THEME_PALETTES: Record<ColorThemeId, AppearancePalette> = {
  daronge: {
    bg: "#121212",
    surface: "#1e1e1e",
    surface2: "#252525",
    border: "#3a3a3a",
    accent: "#ffb800",
    text: "#e6e6e6",
    muted: "#9a9a9a",
    onAccent: "#0d0d0d",
  },
  midnight: {
    bg: "#0a0f1a",
    surface: "#121a28",
    surface2: "#182236",
    border: "#2a3a52",
    accent: "#5b9fff",
    text: "#e8eef8",
    muted: "#8fa3c4",
    onAccent: "#061018",
  },
  rose: {
    bg: "#140c10",
    surface: "#1f1218",
    surface2: "#2a1822",
    border: "#4a2a3a",
    accent: "#ff7eb6",
    text: "#f5e8ee",
    muted: "#c49aaa",
    onAccent: "#1a0810",
  },
  forest: {
    bg: "#0b120e",
    surface: "#141f18",
    surface2: "#1b2a22",
    border: "#2f4a3a",
    accent: "#6fcf97",
    text: "#e6f2eb",
    muted: "#8fb39a",
    onAccent: "#08120c",
  },
  lavender: {
    bg: "#100e16",
    surface: "#1a1624",
    surface2: "#241e30",
    border: "#3d3450",
    accent: "#b794f4",
    text: "#efeaf8",
    muted: "#a89bc4",
    onAccent: "#120e1a",
  },
  mono: {
    bg: "#101010",
    surface: "#1a1a1a",
    surface2: "#242424",
    border: "#3d3d3d",
    accent: "#d4d4d4",
    text: "#ececec",
    muted: "#9a9a9a",
    onAccent: "#101010",
  },
};

/** CSS background для шару за UI (градієнти). */
export const WALLPAPER_BACKGROUNDS: Record<WallpaperId, string> = {
  charcoal: "radial-gradient(120% 90% at 20% 0%, #2a2a2a 0%, #0d0d0d 58%)",
  "warm-amber":
    "radial-gradient(100% 80% at 85% 10%, color-mix(in srgb, #ffb800 28%, transparent) 0%, transparent 45%), linear-gradient(165deg, #1a1408 0%, #0d0b06 100%)",
  "blue-hour":
    "radial-gradient(90% 70% at 10% 20%, color-mix(in srgb, #4a8cff 22%, transparent) 0%, transparent 50%), linear-gradient(180deg, #0a1220 0%, #060a12 100%)",
  "rose-dusk":
    "radial-gradient(80% 60% at 90% 0%, color-mix(in srgb, #ff6b9d 20%, transparent) 0%, transparent 55%), linear-gradient(200deg, #1a0e14 0%, #0a0608 100%)",
  "forest-mist":
    "radial-gradient(70% 55% at 0% 100%, color-mix(in srgb, #4ecf8a 16%, transparent) 0%, transparent 50%), linear-gradient(160deg, #0e1612 0%, #080c0a 100%)",
  "lavender-haze":
    "radial-gradient(75% 65% at 50% 0%, color-mix(in srgb, #b794f4 18%, transparent) 0%, transparent 52%), linear-gradient(180deg, #12101a 0%, #08070c 100%)",
  sunset:
    "linear-gradient(145deg, #2a1020 0%, #1a0818 35%, #0c0610 70%, #060408 100%)",
  ocean: "linear-gradient(180deg, #0a1a28 0%, #061018 45%, #030810 100%)",
  "midnight-grid":
    "linear-gradient(#0c1018 0%, #080c14 100%), repeating-linear-gradient(0deg, transparent, transparent 23px, color-mix(in srgb, #5b9fff 8%, transparent) 23px, color-mix(in srgb, #5b9fff 8%, transparent) 24px), repeating-linear-gradient(90deg, transparent, transparent 23px, color-mix(in srgb, #5b9fff 8%, transparent) 23px, color-mix(in srgb, #5b9fff 8%, transparent) 24px)",
  "cream-paper": "linear-gradient(165deg, #2a2620 0%, #141210 100%)",
  "mono-fade": "linear-gradient(180deg, #222 0%, #0e0e0e 100%)",
  "neon-arcade":
    "radial-gradient(60% 50% at 80% 20%, color-mix(in srgb, #ff00aa 22%, transparent) 0%, transparent 50%), radial-gradient(50% 40% at 10% 80%, color-mix(in srgb, #00e5ff 18%, transparent) 0%, transparent 50%), #0a0810",
  "aurora-sky":
    "radial-gradient(80% 50% at 30% 0%, color-mix(in srgb, #00ffc8 14%, transparent) 0%, transparent 45%), radial-gradient(70% 45% at 70% 10%, color-mix(in srgb, #7b68ff 16%, transparent) 0%, transparent 48%), #060a12",
  "candy-pop":
    "linear-gradient(135deg, color-mix(in srgb, #ff6bcb 12%, #120810) 0%, #0a0810 40%, color-mix(in srgb, #6be4ff 10%, #081018) 100%)",
  "vinyl-groove":
    "repeating-radial-gradient(circle at 50% 50%, #1a1a1a 0 2px, #121212 2px 4px), radial-gradient(90% 70% at 50% 30%, #2a2218 0%, #0c0a08 100%)",
  "cosmic-dust":
    "radial-gradient(1px 1px at 20% 30%, color-mix(in srgb, #fff 35%, transparent) 0%, transparent 100%), radial-gradient(1px 1px at 60% 70%, color-mix(in srgb, #fff 25%, transparent) 0%, transparent 100%), radial-gradient(1px 1px at 80% 20%, color-mix(in srgb, #fff 20%, transparent) 0%, transparent 100%), #06060e",
  "retro-wave":
    "linear-gradient(180deg, #1a0a28 0%, #120818 40%, #0a0610 70%, #ff2a6d 70.2%, #ff2a6d 71%, #05d9e8 71.2%, #05d9e8 72%, #0a0610 72.1%, #0a0610 100%)",
};
