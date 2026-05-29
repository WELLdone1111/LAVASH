import {
  detectImportedVisualKind,
  normalizeImportedTextForEditPalette,
} from "@/features/lavashconstruct/artboard/model/import";
import { normalizeArtboardPanelsHierarchy } from "@/features/lavashconstruct/artboard/model/panelHierarchy";
import { useConstructStore } from "@/features/lavashconstruct/artboard/model/store";
import type { ArtboardPanel } from "@/features/lavashconstruct/artboard/ui/types";

const PREVIEW_EXTENSIONS = new Set([
  "html",
  "htm",
  "css",
  "scss",
  "less",
  "jsx",
  "tsx",
  "js",
  "mjs",
  "cjs",
  "svg",
]);

export function toPosixProjectPath(path: string): string {
  return path.replace(/\\/g, "/");
}

export function extensionFromProjectPath(path: string): string {
  const base = toPosixProjectPath(path).split("/").pop() ?? path;
  const dot = base.lastIndexOf(".");
  return dot >= 0 ? base.slice(dot + 1).toLowerCase() : "txt";
}

export function isProjectFilePreviewable(path: string): boolean {
  return PREVIEW_EXTENSIONS.has(extensionFromProjectPath(path));
}

/** Створює або оновлює панель артборду, прив’язану до файлу проєкту. */
export function ensureArtboardPanelForProjectFile(relativePath: string, content: string): string | null {
  if (!isProjectFilePreviewable(relativePath)) return null;

  const posixPath = toPosixProjectPath(relativePath);
  const fileName = posixPath.split("/").pop() ?? posixPath;
  const ext = extensionFromProjectPath(posixPath);
  const visualKind = detectImportedVisualKind(ext, content);
  const norm = normalizeImportedTextForEditPalette(content, visualKind, undefined);

  const { artboardPanels, commitArtboardPanels, setSelectedPanelId } = useConstructStore.getState();
  const existing = artboardPanels.find((p) => p.linkedProjectFilePath === posixPath);

  if (existing) {
    const same =
      existing.importedTextContent === norm.text &&
      existing.importedVisualKind === visualKind &&
      JSON.stringify(existing.importWarnings ?? []) === JSON.stringify(norm.importWarnings ?? []);
    if (!same) {
      const next = artboardPanels.map((p) =>
        p.id === existing.id
          ? {
              ...p,
              importedTextContent: norm.text,
              importedVisualKind: visualKind,
              importWarnings: norm.importWarnings,
            }
          : p,
      );
      commitArtboardPanels(`Sync ${fileName}`, next, {
        mergeKey: "project-file-link",
        mergeWindowMs: 480,
      });
    }
    setSelectedPanelId(existing.id);
    return existing.id;
  }

  const maxZ = artboardPanels.reduce((m, p) => Math.max(m, p.zIndex), 0);
  const newPanel: ArtboardPanel = {
    id: `proj-${crypto.randomUUID().slice(0, 8)}`,
    title: fileName,
    x: 140,
    y: 120,
    width: 440,
    height: 300,
    zIndex: maxZ + 1,
    isVisible: true,
    isLocked: false,
    lockAspectRatio: false,
    opacity: 1,
    blurPx: 0,
    borderRadiusPx: 12,
    backgroundColor: "transparent",
    isNeonGlowEnabled: false,
    neonGlow: 0,
    neonGlowColor: "#60a5fa",
    isShadowEnabled: true,
    shadowX: 0,
    shadowY: 12,
    shadowBlur: 24,
    shadowSpread: 0,
    shadowOpacity: 0.2,
    shadowColor: "#000000",
    edgeGlow: 0,
    hoverScale: 1.02,
    transitionMs: 180,
    transitionCurve: "ease-in-out",
    importedSourceKind: "file",
    importedVisualKind: visualKind,
    importedTextContent: norm.text,
    importWarnings: norm.importWarnings,
    linkedProjectFilePath: posixPath,
  };

  commitArtboardPanels(
    `Open ${fileName}`,
    normalizeArtboardPanelsHierarchy([...artboardPanels, newPanel]),
  );
  setSelectedPanelId(newPanel.id);
  return newPanel.id;
}
