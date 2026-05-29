import { useCallback, useMemo, useState, type RefObject } from "react";
import type { ArtboardPanel } from "@/features/lavashconstruct/artboard/ui/types";
import { buildScratchCodeLibraryItem } from "@/features/lavashconstruct/chat/model/assistantConstructSync";
import type { ConstructLibraryItem } from "@/features/lavashconstruct/shared/model/libraryItem";

export type ArtboardMenuState =
  | { kind: "canvas"; x: number; y: number; worldX: number; worldY: number }
  | { kind: "panel"; x: number; y: number; panelId: string }
  | null;

export type UseWorkspaceArtboardMenuParams = {
  artboardPanels: ArtboardPanel[];
  artboardBoardRef: RefObject<HTMLDivElement | null>;
  artboardZoom: number;
  artboardPan: { x: number; y: number };
  handleAddLibraryPanelRef: RefObject<
    ((item: ConstructLibraryItem, targetWorld?: { x: number; y: number }) => void) | null
  >;
};

export function useWorkspaceArtboardMenu({
  artboardPanels,
  artboardBoardRef,
  artboardZoom,
  artboardPan,
  handleAddLibraryPanelRef,
}: UseWorkspaceArtboardMenuParams) {
  const [artboardMenu, setArtboardMenu] = useState<ArtboardMenuState>(null);

  const getArtboardDropWorldPoint = useCallback(
    (clientX: number, clientY: number): { x: number; y: number } | undefined => {
      const board = artboardBoardRef.current;
      if (!board) return undefined;
      const rect = board.getBoundingClientRect();
      const zoom = Math.max(artboardZoom, 1e-4);
      return {
        x: (clientX - rect.left - artboardPan.x) / zoom,
        y: (clientY - rect.top - artboardPan.y) / zoom,
      };
    },
    [artboardPan.x, artboardPan.y, artboardZoom, artboardBoardRef],
  );

  const handleArtboardCanvasContextMenu = useCallback(
    (clientX: number, clientY: number) => {
      const world = getArtboardDropWorldPoint(clientX, clientY);
      setArtboardMenu({
        kind: "canvas",
        x: clientX,
        y: clientY,
        worldX: world?.x ?? 120,
        worldY: world?.y ?? 120,
      });
    },
    [getArtboardDropWorldPoint],
  );

  const handleAddCodePanelAtMenu = useCallback(() => {
    if (artboardMenu?.kind !== "canvas") return;
    const item = buildScratchCodeLibraryItem({
      panelTitle: "html lavash-panel Panel",
      code: `<!DOCTYPE html>
<html lang="uk">
<head>
  <meta charset="utf-8" />
  <style>
    body { margin: 0; font-family: system-ui, sans-serif; padding: 16px; }
  </style>
</head>
<body>
  <div>New panel</div>
</body>
</html>`,
      langExt: "html",
    });
    if (item) {
      handleAddLibraryPanelRef.current?.(item, { x: artboardMenu.worldX, y: artboardMenu.worldY });
    }
  }, [artboardMenu, handleAddLibraryPanelRef]);

  const closeArtboardMenu = useCallback(() => setArtboardMenu(null), []);

  const contextMenuPanel = useMemo(
    () =>
      artboardMenu?.kind === "panel"
        ? artboardPanels.find((panel) => panel.id === artboardMenu.panelId) ?? null
        : null,
    [artboardMenu, artboardPanels],
  );

  return {
    artboardMenu,
    setArtboardMenu,
    handleArtboardCanvasContextMenu,
    handleAddCodePanelAtMenu,
    closeArtboardMenu,
    contextMenuPanel,
  };
}
