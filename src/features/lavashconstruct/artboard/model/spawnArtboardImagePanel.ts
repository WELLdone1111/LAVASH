import { useConstructStore } from "@/features/lavashconstruct/artboard/model/store";
import type { ArtboardPanel } from "@/features/lavashconstruct/artboard/ui/types";
import { normalizeArtboardPanelsHierarchy } from "@/features/lavashconstruct/artboard/model/panelHierarchy";

export function spawnArtboardImagePanel(args: {
  title: string;
  dataUrl: string;
  mimeType?: string;
  width?: number;
  height?: number;
  nearPanelId?: string | null;
}): ArtboardPanel {
  const { artboardPanels, setArtboardPanelsDirect, setSelectedPanelId } = useConstructStore.getState();
  const near = args.nearPanelId
    ? artboardPanels.find((p) => p.id === args.nearPanelId)
    : artboardPanels.find((p) => p.id === useConstructStore.getState().selectedPanelId);

  const width = Math.max(160, Math.min(args.width ?? 420, 960));
  const height = Math.max(120, Math.min(args.height ?? 420, 960));
  const maxZ = artboardPanels.reduce((m, p) => Math.max(m, p.zIndex), 0);

  const panel: ArtboardPanel = {
    id: `img-gen-${crypto.randomUUID().slice(0, 10)}`,
    title: args.title.trim() || "Generated image",
    x: near ? near.x + 32 : 120,
    y: near ? near.y + 32 : 120,
    width,
    height,
    zIndex: maxZ + 1,
    isVisible: true,
    isLocked: false,
    lockAspectRatio: false,
    importedSourceKind: "image",
    importedMimeType: args.mimeType?.trim() || "image/png",
    importedDataUrl: args.dataUrl,
  };

  const next = normalizeArtboardPanelsHierarchy([...artboardPanels, panel]);
  setArtboardPanelsDirect(next);
  setSelectedPanelId(panel.id);
  return panel;
}
