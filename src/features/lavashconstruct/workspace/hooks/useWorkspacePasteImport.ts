import { useCallback, useEffect, useRef, useState } from "react";
import type { DragEvent as ReactDragEvent, RefObject } from "react";
import { ARTBOARD_INFINITE_PX } from "@/features/lavashconstruct/shared/model/constants";
import { useConstructStore } from "@/features/lavashconstruct/artboard/model/store";
import type { ConstructLibraryItem } from "@/features/lavashconstruct/shared/model/libraryItem";
import {
  findBoardContainerAtWorldPoint,
  getBoardInnerOriginWorld,
  getBoardInnerSize,
  normalizeArtboardPanelsHierarchy,
} from "@/features/lavashconstruct/artboard/model/panelHierarchy";
import {
  analyzeClipboardImport,
  analyzedImportToLibraryItemBase,
  createImportedLibraryItemsFromFiles,
  normalizeImportedTextForEditPalette,
  type AnalyzedClipboardImport,
} from "@/features/lavashconstruct/artboard/model/import";
import type { ArtboardPanel, ConstructEditableState } from "@/features/lavashconstruct/artboard/ui/types";
import { CONSTRUCT_USER_LIB_DRAG_MIME } from "@/features/lavashconstruct/workspace/ui/ConstructWorkspaceRail";
import {
  cloneConstructLibraryItem,
  intersectsRect,
  isArtboardImportDrag,
  USER_LIB_MAX_ITEMS,
} from "@/features/lavashconstruct/workspace/model/constructWorkspaceUtils";

export type UseWorkspacePasteImportParams = {
  constructState: ConstructEditableState;
  artboardPanels: ArtboardPanel[];
  commitArtboardPanels: ReturnType<typeof useConstructStore.getState>["commitArtboardPanels"];
  setSelectedPanelId: (id: string | null) => void;
  artboardBoardRef: RefObject<HTMLDivElement | null>;
  artboardZoom: number;
  artboardPan: { x: number; y: number };
};

export function useWorkspacePasteImport({
  constructState,
  artboardPanels,
  commitArtboardPanels,
  setSelectedPanelId,
  artboardBoardRef,
  artboardZoom,
  artboardPan,
}: UseWorkspacePasteImportParams) {
  const [isLibraryDragOverArtboard, setIsLibraryDragOverArtboard] = useState(false);
  const [userLibraryItems, setUserLibraryItems] = useState<ConstructLibraryItem[]>([]);
  const [smartPaste, setSmartPaste] = useState<AnalyzedClipboardImport | null>(null);
  const [smartPasteMarkupDraft, setSmartPasteMarkupDraft] = useState("");

  const pasteImportedItemsToArtboardRef = useRef<
    (items: ConstructLibraryItem[], targetWorld?: { x: number; y: number }) => void
  >(() => {});
  const smartPasteTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const handleAddLibraryPanelRef = useRef<
    ((item: ConstructLibraryItem, targetWorld?: { x: number; y: number }) => void) | null
  >(null);

  function handleAddLibraryPanel(item: ConstructLibraryItem, targetWorld?: { x: number; y: number }) {
    const snapshot = useConstructStore.getState();
    const panels = snapshot.artboardPanels;
    const maxZ = panels.reduce((max, panel) => Math.max(max, panel.zIndex), 0);
    const board = artboardBoardRef.current;
    const baseTitle = item.title.trim();
    const usedTitles = new Set(panels.map((p) => p.title));
    let title = baseTitle;
    if (usedTitles.has(baseTitle)) {
      let idx = 2;
      while (usedTitles.has(`${baseTitle} ${idx}`)) idx += 1;
      title = `${baseTitle} ${idx}`;
    }

    const zoom = Math.max(artboardZoom, 1e-4);
    const densityScale =
      constructState.constructEditMode === "main"
        ? constructState.mainPanelDensity === "compact"
          ? 0.92
          : constructState.mainPanelDensity === "spacious"
            ? 1.08
            : 1
        : 1;
    const panelWidth = Math.max(80, Math.round(item.defaultWidth * densityScale));
    const panelHeight = Math.max(60, Math.round(item.defaultHeight * densityScale));
    let centerWorldX = 120 + item.defaultWidth / 2;
    let centerWorldY = 120 + item.defaultHeight / 2;
    if (targetWorld) {
      centerWorldX = targetWorld.x;
      centerWorldY = targetWorld.y;
    } else if (board) {
      const rect = board.getBoundingClientRect();
      centerWorldX = (rect.width / 2 - artboardPan.x) / zoom;
      centerWorldY = (rect.height / 2 - artboardPan.y) / zoom;
    }
    const rootsOnly = panels.filter((p) => !p.parentId);
    const hitBoard = findBoardContainerAtWorldPoint(panels, centerWorldX, centerWorldY);

    const spacing = 26;

    let parentId: string | undefined;
    let localX: number | undefined;
    let localY: number | undefined;
    let placeX = 0;
    let placeY = 0;

    if (hitBoard) {
      const origin = getBoardInnerOriginWorld(hitBoard, panels);
      const inner = getBoardInnerSize(hitBoard);
      const maxLX = Math.max(0, inner.width - panelWidth);
      const maxLY = Math.max(0, inner.height - panelHeight);
      const clampLX = (v: number) => Math.max(0, Math.min(maxLX, v));
      const clampLY = (v: number) => Math.max(0, Math.min(maxLY, v));
      const siblings = panels.filter((p) => p.parentId === hitBoard.id);
      const collisionLocal = (lx: number, ly: number) =>
        siblings.some((p) =>
          intersectsRect(
            { x: lx, y: ly, width: panelWidth, height: panelHeight },
            { x: p.localX ?? 0, y: p.localY ?? 0, width: p.width, height: p.height },
          ),
        );
      const startLX = clampLX(Math.round(centerWorldX - panelWidth / 2 - origin.x));
      const startLY = clampLY(Math.round(centerWorldY - panelHeight / 2 - origin.y));
      let placeLX = startLX;
      let placeLY = startLY;
      if (constructState.isCollisionAvoidanceEnabled && collisionLocal(placeLX, placeLY)) {
        let found = false;
        for (let r = 1; r <= 12 && !found; r += 1) {
          const ring = r * spacing;
          for (const [dx, dy] of [
            [ring, 0],
            [-ring, 0],
            [0, ring],
            [0, -ring],
            [ring, ring],
            [ring, -ring],
            [-ring, ring],
            [-ring, -ring],
          ]) {
            const lx = clampLX(startLX + dx);
            const ly = clampLY(startLY + dy);
            if (!collisionLocal(lx, ly)) {
              placeLX = lx;
              placeLY = ly;
              found = true;
              break;
            }
          }
        }
      }
      parentId = hitBoard.id;
      localX = placeLX;
      localY = placeLY;
      placeX = 0;
      placeY = 0;
    } else {
      const maxX = Math.max(0, ARTBOARD_INFINITE_PX - panelWidth);
      const maxY = Math.max(0, ARTBOARD_INFINITE_PX - panelHeight);
      const clampX = (v: number) => Math.max(0, Math.min(maxX, v));
      const clampY = (v: number) => Math.max(0, Math.min(maxY, v));
      const startX = clampX(Math.round(centerWorldX - panelWidth / 2));
      const startY = clampY(Math.round(centerWorldY - panelHeight / 2));

      placeX = startX;
      placeY = startY;
      const shouldAutoDock =
        !targetWorld &&
        constructState.constructEditMode === "main" &&
        constructState.isMainDockAutoSnapEnabled &&
        /(dock|playback)/i.test(`${item.id} ${item.title}`);
      if (shouldAutoDock && board) {
        const rect = board.getBoundingClientRect();
        const viewportCenterX = (rect.width / 2 - artboardPan.x) / zoom;
        const viewportBottomY = (rect.height - artboardPan.y) / zoom;
        placeX = clampX(Math.round(viewportCenterX - panelWidth / 2));
        placeY = clampY(Math.round(viewportBottomY - panelHeight - 28 / zoom));
      }
      const collisionWithExisting = (x: number, y: number) =>
        rootsOnly.some((p) =>
          intersectsRect(
            { x, y, width: panelWidth, height: panelHeight },
            { x: p.x, y: p.y, width: p.width, height: p.height },
          ),
        );
      if (constructState.isCollisionAvoidanceEnabled && collisionWithExisting(placeX, placeY)) {
        let found = false;
        for (let r = 1; r <= 12 && !found; r += 1) {
          const ring = r * spacing;
          for (const [dx, dy] of [
            [ring, 0],
            [-ring, 0],
            [0, ring],
            [0, -ring],
            [ring, ring],
            [ring, -ring],
            [-ring, ring],
            [-ring, -ring],
          ]) {
            const x = clampX(startX + dx);
            const y = clampY(startY + dy);
            if (!collisionWithExisting(x, y)) {
              placeX = x;
              placeY = y;
              found = true;
              break;
            }
          }
        }
      }
    }

    const addFromLibNorm = normalizeImportedTextForEditPalette(
      item.importedTextContent,
      item.importedVisualKind,
      item.importWarnings,
    );

    const newPanel: ArtboardPanel = {
      id: `${item.id}-${crypto.randomUUID().slice(0, 8)}`,
      title,
      x: placeX,
      y: placeY,
      width: panelWidth,
      height: panelHeight,
      zIndex: maxZ + 1,
      isVisible: true,
      isLocked: false,
      lockAspectRatio: !!item.lockAspectRatioByDefault,
      opacity: 1,
      blurPx: 0,
      borderRadiusPx: item.importedSourceKind ? 0 : 12,
      backgroundColor: item.importedSourceKind ? "transparent" : "rgba(255,255,255,0.08)",
      isNeonGlowEnabled: false,
      neonGlow: 0,
      neonGlowColor: "#60a5fa",
      isShadowEnabled: item.importedSourceKind ? false : true,
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
      importedSourceKind: item.importedSourceKind,
      importedVisualKind: item.importedVisualKind,
      importedMimeType: item.importedMimeType,
      importedTextContent: addFromLibNorm.text,
      importedDataUrl: item.importedDataUrl,
      importedSandboxHtmlDoc: item.importedSandboxHtmlDoc,
      importWarnings: addFromLibNorm.importWarnings,
      importedCssPreviewMarkup: item.importedCssPreviewMarkup,
      importedHtmlPreviewExtraCss: item.importedHtmlPreviewExtraCss,
      ...(parentId ? { parentId, localX, localY } : {}),
      ...(item.linkedScratchTabId?.trim()
        ? { linkedScratchTabId: item.linkedScratchTabId.trim().slice(0, 80) }
        : {}),
    };
    commitArtboardPanels(`Add ${item.title}`, normalizeArtboardPanelsHierarchy([...panels, newPanel]));
    setSelectedPanelId(newPanel.id);
  }

  handleAddLibraryPanelRef.current = handleAddLibraryPanel;

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

  const placeImportedItemsOnArtboard = useCallback(
    (importedItems: ConstructLibraryItem[], targetWorld?: { x: number; y: number }) => {
      if (importedItems.length === 0) return;
      const copies = importedItems.map((item) => cloneConstructLibraryItem(item));
      setUserLibraryItems((current) => [...copies, ...current].slice(0, USER_LIB_MAX_ITEMS));

      if (targetWorld) {
        importedItems.forEach((item, index) => {
          handleAddLibraryPanel(item, {
            x: targetWorld.x + index * 24,
            y: targetWorld.y + index * 24,
          });
        });
        return;
      }

      const board = artboardBoardRef.current;
      if (board) {
        const rect = board.getBoundingClientRect();
        const zoom = Math.max(artboardZoom, 1e-4);
        const centerWorldX = (rect.width / 2 - artboardPan.x) / zoom;
        const centerWorldY = (rect.height / 2 - artboardPan.y) / zoom;
        importedItems.forEach((item, index) => {
          handleAddLibraryPanel(item, {
            x: centerWorldX + index * 22,
            y: centerWorldY + index * 22,
          });
        });
      } else {
        importedItems.forEach((item) => handleAddLibraryPanel(item));
      }
    },
    [artboardPan.x, artboardPan.y, artboardZoom, handleAddLibraryPanel],
  );

  const importDroppedCodePayload = useCallback(
    (payload: { html?: string; plain?: string }, clientX: number, clientY: number): boolean => {
      const analysis = analyzeClipboardImport({
        html: payload.html?.trim() ? payload.html : undefined,
        plain: payload.plain?.trim() ? payload.plain : undefined,
      });
      if (!analysis.textContent.trim() && !analysis.sandboxHtmlDoc?.trim()) return false;

      const base = analyzedImportToLibraryItemBase(analysis);
      const item: ConstructLibraryItem = {
        ...base,
        id: `import-drop-${crypto.randomUUID().slice(0, 10)}`,
      };
      placeImportedItemsOnArtboard([item], getArtboardDropWorldPoint(clientX, clientY));
      return true;
    },
    [getArtboardDropWorldPoint, placeImportedItemsOnArtboard],
  );

  useEffect(() => {
    pasteImportedItemsToArtboardRef.current = placeImportedItemsOnArtboard;
  }, [placeImportedItemsOnArtboard]);

  useEffect(() => {
    if (!smartPaste) return;
    const id = window.requestAnimationFrame(() => {
      smartPasteTextareaRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(id);
  }, [smartPaste]);

  const handleArtboardDragOver = (event: ReactDragEvent<HTMLDivElement>) => {
    if (!isArtboardImportDrag(event.dataTransfer.types ?? [])) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    if (!isLibraryDragOverArtboard) setIsLibraryDragOverArtboard(true);
  };

  const handleArtboardDragEnter = (event: ReactDragEvent<HTMLDivElement>) => {
    if (!isArtboardImportDrag(event.dataTransfer.types ?? [])) return;
    event.preventDefault();
    if (!isLibraryDragOverArtboard) setIsLibraryDragOverArtboard(true);
  };

  const handleArtboardDragLeave = (event: ReactDragEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setIsLibraryDragOverArtboard(false);
    }
  };

  const handleArtboardDrop = async (event: ReactDragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const droppedFiles = Array.from(event.dataTransfer.files ?? []);
    if (droppedFiles.length > 0) {
      const importedItems = await createImportedLibraryItemsFromFiles(droppedFiles);
      if (importedItems.length > 0) {
        placeImportedItemsOnArtboard(importedItems, getArtboardDropWorldPoint(event.clientX, event.clientY));
      }
      setIsLibraryDragOverArtboard(false);
      return;
    }

    const rawItemId = event.dataTransfer.getData(CONSTRUCT_USER_LIB_DRAG_MIME).trim();
    if (rawItemId) {
      const item = userLibraryItems.find((entry) => entry.id === rawItemId);
      if (item) {
        handleAddLibraryPanel(item, getArtboardDropWorldPoint(event.clientX, event.clientY));
      }
      setIsLibraryDragOverArtboard(false);
      return;
    }

    const html = event.dataTransfer.getData("text/html");
    const plain = event.dataTransfer.getData("text/plain");
    if (importDroppedCodePayload({ html, plain }, event.clientX, event.clientY)) {
      setIsLibraryDragOverArtboard(false);
      return;
    }

    setIsLibraryDragOverArtboard(false);
  };

  const handleImportFiles = useCallback(
    async (files: File[]) => {
      if (!files.length) return;
      const importedItems = await createImportedLibraryItemsFromFiles(files);
      if (importedItems.length > 0) {
        setUserLibraryItems((current) =>
          [...importedItems.map((item) => cloneConstructLibraryItem(item)), ...current].slice(0, USER_LIB_MAX_ITEMS),
        );
      }
      for (const item of importedItems) {
        handleAddLibraryPanel(item);
      }
    },
    [userLibraryItems, artboardPanels, artboardZoom, artboardPan, constructState],
  );

  useEffect(() => {
    const handlePasteEvent = (event: ClipboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }
      const clipboardData = event.clipboardData;
      if (!clipboardData) return;
      const filesFromClipboard = Array.from(clipboardData.files ?? []);
      const html = clipboardData.getData("text/html");
      const text = clipboardData.getData("text/plain");

      if (filesFromClipboard.length > 0) {
        event.preventDefault();
        void (async () => {
          const importedItems = await createImportedLibraryItemsFromFiles(filesFromClipboard);
          if (importedItems.length > 0) pasteImportedItemsToArtboardRef.current(importedItems);
        })();
        return;
      }

      const analysis = analyzeClipboardImport({
        html: html?.trim() ? html : undefined,
        plain: text?.trim() ? text : undefined,
      });
      if (!analysis.textContent.trim() && !analysis.sandboxHtmlDoc?.trim()) return;

      if (analysis.visualKind === "css" && analysis.fidelity === "code") {
        event.preventDefault();
        setSmartPaste(analysis);
        setSmartPasteMarkupDraft("");
        return;
      }

      if (analysis.visualKind === "html") {
        event.preventDefault();
        setSmartPaste(analysis);
        setSmartPasteMarkupDraft("");
        return;
      }

      event.preventDefault();
      const base = analyzedImportToLibraryItemBase(analysis);
      const item: ConstructLibraryItem = {
        ...base,
        id: `import-clipboard-${crypto.randomUUID().slice(0, 10)}`,
      };
      pasteImportedItemsToArtboardRef.current([item]);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (smartPaste && event.key === "Escape") {
        event.preventDefault();
        setSmartPaste(null);
        setSmartPasteMarkupDraft("");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("paste", handlePasteEvent);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("paste", handlePasteEvent);
    };
  }, [smartPaste, setSmartPaste, setSmartPasteMarkupDraft]);

  return {
    isLibraryDragOverArtboard,
    userLibraryItems,
    setUserLibraryItems,
    smartPaste,
    setSmartPaste,
    smartPasteMarkupDraft,
    setSmartPasteMarkupDraft,
    smartPasteTextareaRef,
    pasteImportedItemsToArtboardRef,
    handleAddLibraryPanelRef,
    handleAddLibraryPanel,
    handleArtboardDragOver,
    handleArtboardDragEnter,
    handleArtboardDragLeave,
    handleArtboardDrop,
    handleImportFiles,
  };
}
