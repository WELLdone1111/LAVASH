export type ConstructEditMode = "main" | "mini";

export type ExportFormat = ".lavash-theme" | ".json" | "Chrome Extension (.zip)";

export type AdvancedExportKind =
  | "OBS Studio Plugin"
  | "Wallpaper Engine"
  | "Rainmeter"
  | "Share Layout";

export type LavashConstructWorkspaceProps = {
  animationState: "enter" | "exit";
  dockPulseKey?: number;
};
