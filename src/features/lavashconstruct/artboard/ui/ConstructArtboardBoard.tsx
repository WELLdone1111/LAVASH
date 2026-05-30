import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type DragEvent as ReactDragEvent,
  type MouseEvent as ReactMouseEvent,
  type RefObject,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { isTauri } from "@tauri-apps/api/core";
import WindowDragSpacer from "@/components/WindowDragSpacer";
import { useI18n } from "@/i18n/context";
import { ARTBOARD_ZOOM_MAX, ARTBOARD_ZOOM_MIN } from "@/features/lavashconstruct/shared/model/constants";
import { buildImportedSandboxDocument } from "@/features/lavashconstruct/artboard/model/import";
import { panelUsesAltEditMode } from "@/features/lavashconstruct/artboard/model/artboardPanelHitTest";
import { BoardContainerChrome } from "@/features/lavashconstruct/workspace/lib-components/containers/BoardContainer";
import { getPanelWorldBounds, isBoardContainerPanel } from "@/features/lavashconstruct/artboard/model/panelHierarchy";
import type { ArtboardPanel, MainPanelDensity } from "@/features/lavashconstruct/artboard/ui/types";
import { renderConstructShadcnWidget } from "@/features/lavashconstruct/artboard/ui/constructShadcnWidgetRegistry";
import ConstructArtboardGridDots, { type ConstructArtboardGridPointer } from "@/features/lavashconstruct/artboard/ui/ConstructArtboardGridDots";
import {
  nestedPanelLocalTransform,
  panelShellSurfaceStyle,
  rootPanelWorldTransform,
  ROOT_PANEL_TRANSFORM_ORIGIN,
} from "@/features/lavashconstruct/artboard/ui/panelSlotChrome";

/**
 * Р„РґРёРЅРёР№ sandbox РґР»СЏ С‚РµРєСЃС‚РѕРІРёС… РїСЂРµРІКјСЋ РІ iframe: СЃРєСЂРёРїС‚Рё (JSX, HTML Р· Р»РѕРіС–РєРѕСЋ),
 * С„РѕСЂРјРё, РґС–Р°Р»РѕРіРё/alert, РїРѕРїР°РїРё. Р‘РµР· С‚РѕРї-РЅР°РІС–РіР°С†С–С— Р№ same-origin вЂ” С–Р·РѕР»СЏС†С–СЏ РІС–Рґ Р±Р°С‚СЊРєР°-Р°РїРєРё.
 */
const IMPORTED_PREVIEW_IFRAME_SANDBOX =
  "allow-scripts allow-forms allow-popups allow-modals" as const;
function importedIframeKey(panelId: string, doc: string): string {
  let h = 5381;
  for (let i = 0; i < doc.length; i++) {
    h = Math.imul(h, 33) ^ doc.charCodeAt(i);
  }
  return `${panelId}-${doc.length}-${(h >>> 0).toString(36)}`;
}

/**
 * РўР°Рє, РєРѕР»Рё С†С–Р»СЊ С–РІРµРЅС‚Р° РјР°С” Р»РёС€РёС‚РёСЃСЊ Р· РЅР°С‚РёРІРЅРѕСЋ РІР·Р°С”РјРѕРґС–С”СЋ (РґСЂР°Рі РїР°РЅРµР»С– вЂ” С‡РµСЂРµР· capture С‚С–Р»СЊРєРё РЅР° С…СЂРѕРј-РїР»Р°С€С†С– РїР°РЅРµР»С–).
 */
function isInteractivePointerDownTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return Boolean(
    target.closest(
      [
        "button",
        "input",
        "textarea",
        "select",
        "option",
        "a[href]",
        "label",
        "[role='slider']",
        "[role='tab']",
        "[role='tablist']",
        "[role='tabpanel']",
        "[role='dialog']",
        "[role='menuitem']",
        "[role='listbox']",
        "[role='option']",
        "[role='combobox']",
        "[role='switch']",
        "[role='spinbutton']",
        "[contenteditable='true']",
        "iframe",
        ".lc-imported-sandbox-frame",
        "canvas",
        "video",
        "audio",
        "summary",
        "meter",
        "progress",
      ].join(", "),
    ),
  );
}

/** Р РµСЃР°Р№Р·-С…РµРЅРґР» РјР°С” СЃРІС–Р№ pointer-handler вЂ” РЅРµ СЃС‚Р°СЂС‚СѓС”РјРѕ move РїР°РЅРµР»С–, РєРѕР»Рё С…Р°РїР°С”РјРѕ Р№РѕРіРѕ (РЅР°РІС–С‚СЊ Р· Alt). */
function isPanelResizeChromeTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return Boolean(target.closest(".lc-panel-resize-handle"));
}

type ConstructArtboardBoardProps = {
  isArtboardGridDotsVisible: boolean;
  artboardZoom: number;
  artboardPanX: number;
  artboardPanY: number;
  artboardMiddlePanHeld: boolean;
  onArtboardViewportPointerDownCapture: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onArtboardViewportLostPointerCapture: () => void;
  isLibraryDragOverArtboard: boolean;
  onArtboardDragOver: (event: ReactDragEvent<HTMLDivElement>) => void;
  onArtboardDragEnter: (event: ReactDragEvent<HTMLDivElement>) => void;
  onArtboardDragLeave: (event: ReactDragEvent<HTMLDivElement>) => void;
  onArtboardDrop: (event: ReactDragEvent<HTMLDivElement>) => void;
  artboardPanels: ArtboardPanel[];
  selectedPanelId: string | null;
  selectedPanelIds: string[];
  /** Панель, закріплена в чаті LAVASH (Mark). */
  markedPanelId?: string | null;
  /** Режим вибору об'єкта для Mark. */
  markMode?: boolean;
  activeInteractionPanelId: string | null;
  artboardBoardRef: RefObject<HTMLDivElement | null>;
  onReplaceSelection: (ids: string[]) => void;
  onPanelPointerDown: (
    event: ReactPointerEvent<HTMLElement>,
    panel: ArtboardPanel,
    meta?: { moveModifierHeld?: boolean },
  ) => void;
  onPanelResizePointerDown: (event: ReactPointerEvent<HTMLElement>, panel: ArtboardPanel) => void;
  /** Подвійний клік по панелі — відкрити редактор (не для AI-import; там Alt+СКМ). */
  onPanelRequestEdit?: (panel: ArtboardPanel) => void;
  /** Mark mode: клік по панелі без Alt. */
  onPanelMarkRequest?: (panel: ArtboardPanel) => void;
  /** Контекстне меню по ПКМ на панелі. */
  onPanelContextMenu?: (event: ReactMouseEvent, panel: ArtboardPanel) => void;
  /** Ctrl + ПКМ на порожньому артборді — меню полотна. */
  onArtboardCanvasContextMenu?: (clientX: number, clientY: number) => void;
  isMainMode: boolean;
  mainPanelDensity: MainPanelDensity;
  isMainAdaptiveLayoutEnabled: boolean;
  isMainCinematicBackdropEnabled: boolean;
  /** У unified shell drag-rail не потрібен — інакше сіра смуга перед чатом. */
  showWindowDragRail?: boolean;
};

export default function ConstructArtboardBoard({
  isArtboardGridDotsVisible,
  artboardZoom,
  artboardPanX,
  artboardPanY,
  artboardMiddlePanHeld,
  onArtboardViewportPointerDownCapture,
  onArtboardViewportLostPointerCapture,
  isLibraryDragOverArtboard,
  onArtboardDragOver,
  onArtboardDragEnter,
  onArtboardDragLeave,
  onArtboardDrop,
  artboardPanels,
  selectedPanelId,
  selectedPanelIds,
  markedPanelId = null,
  markMode = false,
  activeInteractionPanelId,
  artboardBoardRef,
  onReplaceSelection,
  onPanelPointerDown,
  onPanelResizePointerDown,
  onPanelRequestEdit,
  onPanelMarkRequest,
  onPanelContextMenu,
  onArtboardCanvasContextMenu,
  isMainMode,
  mainPanelDensity,
  isMainAdaptiveLayoutEnabled,
  isMainCinematicBackdropEnabled,
  showWindowDragRail = true,
}: ConstructArtboardBoardProps) {
  const { t } = useI18n();
  const [marquee, setMarquee] = useState<{
    pointerId: number;
    startX: number;
    startY: number;
    x: number;
    y: number;
  } | null>(null);
  /** РўС–Р»СЊРєРё Alt: РѕРІРµСЂР»РµР№ РґСЂР°РіСѓ/РјСѓРІСѓ РїР°РЅРµР»РµР№ + pointer capture (Shift РІС–Р»СЊРЅРёР№ РїС–Рґ РјР°Р№Р±СѓС‚РЅС– С€РѕСЂС‚РєР°С‚Рё Р»Р°Р±Рё). */
  const [isMovePanelModifierHeld, setIsMovePanelModifierHeld] = useState(false);
  /** РЇРє СЃС‚Р°РЅ Alt Р· РєР»Р°РІРё/РїРѕР№РЅС‚РµСЂР°, СЃРёРЅС…СЂРѕРЅРЅРѕ РІ window-listeners (WebView С–РЅРєРѕР»Рё РіСѓР±РёС‚СЊ `altKey` РЅР° `pointerdown`). */
  const altModifierSyncRef = useRef(false);

  const selectedIdSet = new Set(selectedPanelIds);
  const panelMarkedClass = (panelId: string) =>
    markedPanelId === panelId ? " lc-draggable-panel--marked" : "";
  const importedBaseSizeRef = useRef<Record<string, { width: number; height: number }>>({});
  /** Р¦С–Р»РѕС‡РёСЃРµР»СЊРЅРёР№ pan РґР»СЏ РїРµР№РЅС‚Сѓ + hit-test вЂ” Р·Р±С–РіР°С”С‚СЊСЃСЏ Р· translate3d РЅР° С€Р°СЂС– Р°СЂС‚Р±РѕСЂРґСѓ. */
  const pxPanX = Math.round(artboardPanX);
  const pxPanY = Math.round(artboardPanY);

  const handlePanelSurfaceDoubleClick = (event: ReactMouseEvent, panel: ArtboardPanel) => {
    if (panelUsesAltEditMode(panel)) return;
    if (!onPanelRequestEdit) return;
    const el = event.target as Element | null;
    if (el?.closest("button")) return;
    onPanelRequestEdit(panel);
  };

  const handlePanelContextMenu = (event: ReactMouseEvent, panel: ArtboardPanel) => {
    event.preventDefault();
    event.stopPropagation();
    onPanelContextMenu?.(event, panel);
  };

  /** Р©РѕР± РїСЂРµРґРєРѕРІРёР№ PlayerBoard РЅРµ Р·вЂ™С—РґР°РІ pointerdrag Сѓ РІРєР»Р°РґРµРЅРёС… РґРѕС€РєР°С… / composition-СЃР»РѕС‚Р°С…. */
  const shouldDeferBoardContainerDragToDescendant = (event: ReactPointerEvent<HTMLElement>) => {
    if (!(event.target instanceof Element)) return false;
    const nestedBoardRoot = event.target.closest(".lc-board-nested-container");
    if (nestedBoardRoot && nestedBoardRoot !== event.currentTarget) return true;
    return Boolean(event.target.closest(".lc-board-child-slot"));
  };

  const handlePanelPointerDownCapture = (
    event: ReactPointerEvent<HTMLElement>,
    panel: ArtboardPanel,
    options?: { deferBoardContainerDrag?: boolean },
  ) => {
    const altHeld = event.altKey || altModifierSyncRef.current;
    const altEditPanel = panelUsesAltEditMode(panel);

    if (event.button === 2) {
      event.preventDefault();
      event.stopPropagation();
      if (altHeld && altEditPanel) {
        onPanelResizePointerDown(event, panel);
        return;
      }
      handlePanelContextMenu(event, panel);
      return;
    }

    if (event.button === 1) {
      if (altHeld && altEditPanel && onPanelRequestEdit) {
        event.preventDefault();
        event.stopPropagation();
        onPanelRequestEdit(panel);
      }
      return;
    }

    if (event.button !== 0) return;
    if (options?.deferBoardContainerDrag && shouldDeferBoardContainerDragToDescendant(event)) return;

    if (altEditPanel && !altHeld) {
      if (markMode && onPanelMarkRequest) {
        onPanelMarkRequest(panel);
      }
      return;
    }

    if (altHeld) {
      if (isPanelResizeChromeTarget(event.target)) return;
    } else if (isInteractivePointerDownTarget(event.target)) {
      return;
    }
    onPanelPointerDown(event, panel, { moveModifierHeld: altHeld });
  };

  useEffect(() => {
    /** РџС–РґРіР°РЅСЏС”РјРѕ Alt РїС–Рґ hit-test РґСЂР°Рі-СЃРµСЂС„РµР№СЃСѓ вЂ” Сѓ РїРѕР№РЅС‚РµСЂ-С–РІРµРЅС‚Р°С… С” Р¶РёРІРёР№ altKey, РєРѕР»Рё РєР»Р°РІР° РіР»СЋС‡РёС‚СЊ Сѓ WebView. */
    let held = false;
    const setHeld = (next: boolean) => {
      altModifierSyncRef.current = next;
      if (held === next) return;
      held = next;
      setIsMovePanelModifierHeld(next);
    };
    const syncFromKey = (event: KeyboardEvent) => setHeld(event.altKey);
    const syncFromPointer = (event: PointerEvent | MouseEvent) => setHeld(event.altKey);
    const handleVisibility = () => {
      if (document.visibilityState === "hidden") setHeld(false);
    };
    window.addEventListener("keydown", syncFromKey);
    window.addEventListener("keyup", syncFromKey);
    window.addEventListener("pointerdown", syncFromPointer, true);
    window.addEventListener("pointermove", syncFromPointer, true);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.removeEventListener("keydown", syncFromKey);
      window.removeEventListener("keyup", syncFromKey);
      window.removeEventListener("pointerdown", syncFromPointer, true);
      window.removeEventListener("pointermove", syncFromPointer, true);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  const gridPointerRef = useRef<ConstructArtboardGridPointer>({ x: 0, y: 0, active: false });

  const updateGridPointerFromClient = useCallback((clientX: number, clientY: number) => {
    const board = artboardBoardRef.current;
    if (!board) return;
    const r = board.getBoundingClientRect();
    gridPointerRef.current = {
      x: clientX - r.left,
      y: clientY - r.top,
      active: true,
    };
  }, [artboardBoardRef]);

  const hideGridPointer = useCallback(() => {
    gridPointerRef.current.active = false;
  }, []);

  useEffect(() => {
    const board = artboardBoardRef.current;
    if (!board) return;
    const onMove = (event: PointerEvent) => {
      updateGridPointerFromClient(event.clientX, event.clientY);
    };
    const onEnter = (event: PointerEvent) => {
      updateGridPointerFromClient(event.clientX, event.clientY);
    };
    const onLeave = () => {
      hideGridPointer();
    };
    board.addEventListener("pointerenter", onEnter);
    board.addEventListener("pointerleave", onLeave);
    board.addEventListener("pointermove", onMove, true);
    return () => {
      board.removeEventListener("pointerenter", onEnter);
      board.removeEventListener("pointerleave", onLeave);
      board.removeEventListener("pointermove", onMove, true);
    };
  }, [artboardBoardRef, updateGridPointerFromClient, hideGridPointer]);

  useEffect(() => {
    const root = artboardBoardRef.current;
    if (!root) return;
    const blockNativeTextSelection =
      isMovePanelModifierHeld || activeInteractionPanelId !== null;
    if (!blockNativeTextSelection) return;
    const onSelectStart = (event: Event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest(".lc-imported-text")) return;
      event.preventDefault();
    };
    root.addEventListener("selectstart", onSelectStart);
    return () => root.removeEventListener("selectstart", onSelectStart);
  }, [isMovePanelModifierHeld, activeInteractionPanelId]);

  useEffect(() => {
    if (!marquee) return;
    const board = artboardBoardRef.current;
    if (!board) return;

    const updateSelectionFromRect = (currentX: number, currentY: number) => {
      const leftPx = Math.min(marquee.startX, currentX);
      const topPx = Math.min(marquee.startY, currentY);
      const rightPx = Math.max(marquee.startX, currentX);
      const bottomPx = Math.max(marquee.startY, currentY);
      const zoom = Math.max(ARTBOARD_ZOOM_MIN, Math.min(ARTBOARD_ZOOM_MAX, artboardZoom));
      const worldLeft = (leftPx - pxPanX) / zoom;
      const worldTop = (topPx - pxPanY) / zoom;
      const worldRight = (rightPx - pxPanX) / zoom;
      const worldBottom = (bottomPx - pxPanY) / zoom;
      const ids = artboardPanels
        .filter((panel) => panel.isVisible)
        .filter((panel) => {
          const b = getPanelWorldBounds(panel, artboardPanels);
          return (
            b.x < worldRight &&
            b.x + b.width > worldLeft &&
            b.y < worldBottom &&
            b.y + b.height > worldTop
          );
        })
        .sort((a, b) => a.zIndex - b.zIndex)
        .map((panel) => panel.id);
      onReplaceSelection(ids);
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (event.pointerId !== marquee.pointerId) return;
      const rect = board.getBoundingClientRect();
      const nextX = event.clientX - rect.left;
      const nextY = event.clientY - rect.top;
      setMarquee((current) => (current ? { ...current, x: nextX, y: nextY } : current));
      updateSelectionFromRect(nextX, nextY);
    };

    const handlePointerUp = (event: PointerEvent) => {
      if (event.pointerId !== marquee.pointerId) return;
      const rect = board.getBoundingClientRect();
      const nextX = event.clientX - rect.left;
      const nextY = event.clientY - rect.top;
      updateSelectionFromRect(nextX, nextY);
      setMarquee(null);
      try {
        board.releasePointerCapture(event.pointerId);
      } catch {
        /* РїРѕС„С–Рі */
      }
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [marquee, artboardPanels, pxPanX, pxPanY, artboardZoom, artboardBoardRef, onReplaceSelection]);

  const buildImportedHtmlPreviewDoc = (panel: ArtboardPanel): string | null =>
    buildImportedSandboxDocument(panel);

  const renderPanelBody = (panel: ArtboardPanel) => {
    if (panel.constructWidgetId) {
      const accent = panel.constructWidgetAccentColor?.trim();
      return (
        <div
          className="lc-real-component-wrap lc-real-component-wrap--fill lc-shadcn-widget-wrap"
          data-lc-accent={accent ? "on" : undefined}
          style={
            accent ? ({ ["--lc-widget-accent" as string]: accent } as CSSProperties) : undefined
          }
        >
          {renderConstructShadcnWidget(panel.constructWidgetId, panel.id)}
        </div>
      );
    }
    if (panel.importedSourceKind === "image" && panel.importedDataUrl) {
      return (
        <div className="lc-real-component-wrap lc-imported-content-wrap" onPointerDown={(event) => event.stopPropagation()}>
          <img className="lc-imported-image" src={panel.importedDataUrl} alt={panel.title} draggable={false} />
        </div>
      );
    }
    if (panel.importedSourceKind === "text") {
      const importedDoc = buildImportedHtmlPreviewDoc(panel);
      if (importedDoc) {
        return (
          <div className="lc-real-component-wrap lc-imported-content-wrap" onPointerDown={(event) => event.stopPropagation()}>
            <iframe
              key={importedIframeKey(panel.id, importedDoc)}
              className="lc-imported-sandbox-frame"
              data-panel-id={panel.id}
              aria-label={t("construct.artboard.preview", { title: panel.title })}
              referrerPolicy="no-referrer"
              sandbox={IMPORTED_PREVIEW_IFRAME_SANDBOX}
              srcDoc={importedDoc}
            />
          </div>
        );
      }
      return (
        <div className="lc-real-component-wrap lc-imported-content-wrap" onPointerDown={(event) => event.stopPropagation()}>
          <pre className="lc-imported-text">
            {panel.importedTextContent?.trim() || "вЂ”"}
          </pre>
        </div>
      );
    }
    if (panel.importedSourceKind === "file") {
      return (
        <div className="lc-real-component-wrap lc-imported-content-wrap" onPointerDown={(event) => event.stopPropagation()}>
          <p className="lc-real-component-note">
            {panel.importedMimeType
              ? t("construct.artboard.fileMime", { mime: panel.importedMimeType })
              : t("construct.artboard.filePlain")}
          </p>
        </div>
      );
    }

    return (
      <p className="lc-real-component-note">{panel.isLocked ? t("construct.artboard.locked") : "\u00a0"}</p>
    );
  };

  const renderBoardChildPanel = (child: ArtboardPanel) => {
    if (isBoardContainerPanel(child)) {
      const nestedBoardChildren = artboardPanels
        .filter((c) => c.parentId === child.id && c.isVisible)
        .sort((a, b) => a.zIndex - b.zIndex);
      const isPanelSelected = selectedPanelId === child.id || selectedIdSet.has(child.id);
      return (
        <div
          key={child.id}
          data-lc-panel-id={child.id}
          className={`lc-board-nested-container lc-draggable-panel lc-draggable-panel--board-container${isPanelSelected ? " lc-draggable-panel--active" : ""}${panelMarkedClass(child.id)}${child.isLocked ? " lc-draggable-panel--locked" : ""}${activeInteractionPanelId === child.id ? " lc-draggable-panel--dragging" : ""}`}
          style={{
            position: "absolute",
            left: `${child.localX ?? 0}px`,
            top: `${child.localY ?? 0}px`,
            width: `${child.width}px`,
            height: `${child.height}px`,
            ...nestedPanelLocalTransform(child),
            zIndex: child.zIndex,
            opacity: child.opacity ?? 1,
            borderRadius: `${child.borderRadiusPx ?? 12}px`,
            ...panelShellSurfaceStyle(child, false),
            transitionDuration: `${child.transitionMs ?? 180}ms`,
            transitionTimingFunction: child.transitionCurve ?? "ease-in-out",
            "--lc-panel-hover-scale": String(child.hoverScale ?? 1.02),
          } as CSSProperties}
          onDragOver={onArtboardDragOver}
          onDragEnter={onArtboardDragEnter}
          onPointerDownCapture={(event) =>
            handlePanelPointerDownCapture(event, child, { deferBoardContainerDrag: true })
          }
          onContextMenu={(event) => handlePanelContextMenu(event, child)}
          onDoubleClick={(event) => handlePanelSurfaceDoubleClick(event, child)}
        >
          <header>{child.title}</header>
          <div
            className={`lc-board-container-body${child.clipChildren !== false ? " lc-board-container-body--clip" : ""}`}
            onDragOver={onArtboardDragOver}
            onDragEnter={onArtboardDragEnter}
            onDrop={(event) => {
              event.preventDefault();
              event.stopPropagation();
              void onArtboardDrop(event);
            }}
          >
            <BoardContainerChrome />
            {nestedBoardChildren.map((ch) => renderBoardChildPanel(ch))}
          </div>
          <div
            className={`lc-panel-drag-surface${isMovePanelModifierHeld ? " lc-panel-drag-surface--active" : ""}`}
            aria-hidden
          />
          <button
            type="button"
            className="lc-panel-resize-handle"
            aria-label={t("construct.artboard.resize", { title: child.title })}
            onPointerDown={(event) => onPanelResizePointerDown(event, child)}
          />
        </div>
      );
    }

    const isElementTemplate = Boolean(child.constructWidgetId);
    const isImportedPanel = Boolean(child.importedSourceKind);
    const isFramelessPanel = isElementTemplate || isImportedPanel;
    const isPanelSelected = selectedPanelId === child.id || selectedIdSet.has(child.id);
    let importedScale = 1;
    if (isImportedPanel) {
      const base = importedBaseSizeRef.current[child.id];
      if (!base) {
        importedBaseSizeRef.current[child.id] = {
          width: Math.max(1, child.width),
          height: Math.max(1, child.height),
        };
      }
      const safeBase = importedBaseSizeRef.current[child.id];
      importedScale = Math.max(
        0.35,
        Math.min(4, Math.min(child.width / safeBase.width, child.height / safeBase.height)),
      );
    }
    return (
      <div
        key={child.id}
        data-lc-panel-id={child.id}
        className={`lc-board-child-slot lc-draggable-panel${isPanelSelected ? " lc-draggable-panel--active" : ""}${panelMarkedClass(child.id)}${child.isLocked ? " lc-draggable-panel--locked" : ""}${isImportedPanel ? " lc-draggable-panel--imported" : ""}${activeInteractionPanelId === child.id ? " lc-draggable-panel--dragging" : ""}${isElementTemplate ? " lc-draggable-panel--element" : ""}${isFramelessPanel ? " lc-draggable-panel--frameless" : ""}`}
        style={{
          position: "absolute",
          left: `${child.localX ?? 0}px`,
          top: `${child.localY ?? 0}px`,
          width: `${child.width}px`,
          height: `${child.height}px`,
          ...nestedPanelLocalTransform(child),
          zIndex: child.zIndex,
          opacity: child.opacity ?? 1,
          borderRadius: `${child.borderRadiusPx ?? 12}px`,
          ...panelShellSurfaceStyle(child, isFramelessPanel),
          transitionDuration: `${child.transitionMs ?? 180}ms`,
          transitionTimingFunction: child.transitionCurve ?? "ease-in-out",
          "--lc-panel-hover-scale": String(child.hoverScale ?? 1.02),
          "--lc-imported-scale": String(importedScale),
        } as CSSProperties}
        onDragOver={onArtboardDragOver}
        onDragEnter={onArtboardDragEnter}
        onPointerDownCapture={(event) => handlePanelPointerDownCapture(event, child)}
        onContextMenu={(event) => handlePanelContextMenu(event, child)}
        onDoubleClick={(event) => handlePanelSurfaceDoubleClick(event, child)}
      >
        {child.importedSourceKind === "text" && buildImportedHtmlPreviewDoc(child) ? (
          <div className="lc-imported-drag-strip" aria-hidden />
        ) : null}
        {!isFramelessPanel ? (
          <header>{child.title}</header>
        ) : null}
        {renderPanelBody(child)}
        <div
          className={`lc-panel-drag-surface${isMovePanelModifierHeld ? " lc-panel-drag-surface--active" : ""}`}
            aria-label={t("construct.artboard.holdAltMove", { title: child.title })}
        />
        {!isFramelessPanel || isPanelSelected || isImportedPanel ? (
          <button
            type="button"
            className="lc-panel-resize-handle"
            aria-label={t(
              isImportedPanel ? "construct.artboard.holdAltResize" : "construct.artboard.resize",
              { title: child.title },
            )}
            onPointerDown={(event) => onPanelResizePointerDown(event, child)}
          />
        ) : null}
      </div>
    );
  };

  const z = Math.max(ARTBOARD_ZOOM_MIN, Math.min(ARTBOARD_ZOOM_MAX, artboardZoom));
  /** ~20% denser grid than pitch 14 (pitch ∝ 1/√density). */
  const basePitchWorld = 14 / Math.sqrt(1.2);
  const rawPitchScreen = basePitchWorld * z;
  const normalizePow2 = Math.round(Math.log2(24 / rawPitchScreen));
  const screenPitch = rawPitchScreen * Math.pow(2, normalizePow2);
  const majorPitch = screenPitch * 5;
  const gridOffsetX = ((pxPanX % screenPitch) + screenPitch) % screenPitch;
  const gridOffsetY = ((pxPanY % screenPitch) + screenPitch) % screenPitch;
  const majorOffsetX = ((pxPanX % majorPitch) + majorPitch) % majorPitch;
  const majorOffsetY = ((pxPanY % majorPitch) + majorPitch) % majorPitch;

  const roundPx = (n: number) => Math.round(n * 1000) / 1000;

  const boardContentStyle = {
    transform: `translate3d(${pxPanX}px, ${pxPanY}px, 0) scale(${z})`,
    transformOrigin: "0 0",
  } as CSSProperties;

  const densityClass = isMainMode
    ? mainPanelDensity === "compact"
      ? " lavash-artboard-board-content--density-compact"
      : mainPanelDensity === "spacious"
        ? " lavash-artboard-board-content--density-spacious"
        : " lavash-artboard-board-content--density-balanced"
    : "";

  return (
    <section className="lavash-artboard">
      <div className="lavash-artboard-main">
      <div
        className={`lavash-artboard-board${artboardMiddlePanHeld ? " lavash-artboard-board--pan-mid" : ""}${isLibraryDragOverArtboard ? " lavash-artboard-board--drop-active" : ""}${markMode ? " lavash-artboard-board--mark-mode" : ""}`}
        data-lc-mark-mode={markMode ? "true" : undefined}
        data-lc-alt-held={isMovePanelModifierHeld ? "true" : undefined}
        data-lc-panel-dragging={activeInteractionPanelId ? "true" : undefined}
        ref={artboardBoardRef}
        onPointerDownCapture={(event) => {
          if (
            event.button === 2 &&
            (event.ctrlKey || event.metaKey) &&
            !(event.target instanceof Element && event.target.closest(".lc-draggable-panel"))
          ) {
            event.preventDefault();
            event.stopPropagation();
            onArtboardCanvasContextMenu?.(event.clientX, event.clientY);
            return;
          }
          onArtboardViewportPointerDownCapture(event);
        }}
        onLostPointerCapture={onArtboardViewportLostPointerCapture}
        onDragOver={onArtboardDragOver}
        onDragEnter={onArtboardDragEnter}
        onDragLeave={onArtboardDragLeave}
        onContextMenu={(event) => {
          // СЂС–Р¶РµРјРѕ РЅР°С‚РёРІРЅРµ РєРѕРЅС‚РµРєСЃС‚РЅРµ РјРµРЅСЋ webview РЅР° Р°СЂС‚Р±РѕСЂРґС–
          event.preventDefault();
        }}
        aria-label={t("construct.artboard.aria")}
        onAuxClickCapture={(e) => {
          if (e.button === 1) e.preventDefault();
        }}
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          if (!(event.ctrlKey || event.metaKey)) return;
          if (
            event.target instanceof Element &&
            event.target.closest(".lc-draggable-panel")
          ) {
            return;
          }
          const board = artboardBoardRef.current;
          if (!board) return;
          const rect = board.getBoundingClientRect();
          const startX = event.clientX - rect.left;
          const startY = event.clientY - rect.top;
          setMarquee({
            pointerId: event.pointerId,
            startX,
            startY,
            x: startX,
            y: startY,
          });
          onReplaceSelection([]);
          try {
            board.setPointerCapture(event.pointerId);
          } catch {
            /* РїРѕС„С–Рі */
          }
          event.preventDefault();
          event.stopPropagation();
        }}
      >
        {isMainMode && isMainCinematicBackdropEnabled ? <div className="lavash-artboard-cinematic-overlay" aria-hidden /> : null}
        {isArtboardGridDotsVisible ? (
          <div className="lavash-artboard-grid-overlay" aria-hidden>
            <ConstructArtboardGridDots
              pitch={roundPx(screenPitch)}
              majorPitch={roundPx(majorPitch)}
              offsetX={roundPx(gridOffsetX)}
              offsetY={roundPx(gridOffsetY)}
              majorOffsetX={roundPx(majorOffsetX)}
              majorOffsetY={roundPx(majorOffsetY)}
              pointerRef={gridPointerRef}
              themeRootRef={artboardBoardRef}
            />
          </div>
        ) : null}
        <div
          className={`lavash-artboard-board-content${isArtboardGridDotsVisible ? "" : " lavash-artboard-board-content--no-grid"}${densityClass}`}
          style={boardContentStyle}
          onDragOver={onArtboardDragOver}
          onDragEnter={onArtboardDragEnter}
          onDragLeave={onArtboardDragLeave}
          onDrop={(event) => {
            event.preventDefault();
            event.stopPropagation();
            void onArtboardDrop(event);
          }}
        >
          {artboardPanels
            .filter((panel) => panel.isVisible && !panel.parentId)
            .sort((a, b) => a.zIndex - b.zIndex)
            .map((panel) => {
              const rootAdaptiveScale =
                isMainMode && isMainAdaptiveLayoutEnabled
                  ? Math.max(0.9, Math.min(1.08, 1 + (1 - artboardZoom) * 0.16))
                  : 1;
              if (isBoardContainerPanel(panel)) {
                const boardChildren = artboardPanels
                  .filter((c) => c.parentId === panel.id && c.isVisible)
                  .sort((a, b) => a.zIndex - b.zIndex);
                const isPanelSelected = selectedPanelId === panel.id || selectedIdSet.has(panel.id);
                return (
                  <div
                    key={panel.id}
                    data-lc-panel-id={panel.id}
                    className={`lc-draggable-panel lc-draggable-panel--board-container${isPanelSelected ? " lc-draggable-panel--active" : ""}${panelMarkedClass(panel.id)}${panel.isLocked ? " lc-draggable-panel--locked" : ""}${activeInteractionPanelId === panel.id ? " lc-draggable-panel--dragging" : ""}`}
                    style={{
                      width: `${panel.width}px`,
                      height: `${panel.height}px`,
                      transform: rootPanelWorldTransform(panel, rootAdaptiveScale),
                      transformOrigin: ROOT_PANEL_TRANSFORM_ORIGIN,
                      zIndex: panel.zIndex,
                      opacity: panel.opacity ?? 1,
                      borderRadius: `${panel.borderRadiusPx ?? 12}px`,
                      ...panelShellSurfaceStyle(panel, false),
                      transitionDuration: `${panel.transitionMs ?? 180}ms`,
                      transitionTimingFunction: panel.transitionCurve ?? "ease-in-out",
                      "--lc-panel-hover-scale": String(panel.hoverScale ?? 1.02),
                    } as CSSProperties}
                    onDragOver={onArtboardDragOver}
                    onDragEnter={onArtboardDragEnter}
                    onPointerDownCapture={(event) =>
                      handlePanelPointerDownCapture(event, panel, { deferBoardContainerDrag: true })
                    }
                    onContextMenu={(event) => handlePanelContextMenu(event, panel)}
                    onDoubleClick={(event) => handlePanelSurfaceDoubleClick(event, panel)}
                  >
                    <header>{panel.title}</header>
                    <div
                      className={`lc-board-container-body${panel.clipChildren !== false ? " lc-board-container-body--clip" : ""}`}
                      onDragOver={onArtboardDragOver}
                      onDragEnter={onArtboardDragEnter}
                      onDrop={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        void onArtboardDrop(event);
                      }}
                    >
                      <BoardContainerChrome />
                      {boardChildren.map((ch) => renderBoardChildPanel(ch))}
                    </div>
                    <div
                      className={`lc-panel-drag-surface${isMovePanelModifierHeld ? " lc-panel-drag-surface--active" : ""}`}
                      aria-hidden
                    />
                    <button
                      type="button"
                      className="lc-panel-resize-handle"
                      aria-label={t("construct.artboard.resize", { title: panel.title })}
                      onPointerDown={(event) => onPanelResizePointerDown(event, panel)}
                    />
                  </div>
                );
              }

              const isElementTemplate = Boolean(panel.constructWidgetId);
              const isImportedPanel = Boolean(panel.importedSourceKind);
              const isFramelessPanel = isElementTemplate || isImportedPanel;
              const isPanelSelected = selectedPanelId === panel.id || selectedIdSet.has(panel.id);
              let importedScale = 1;
              if (isImportedPanel) {
                const base = importedBaseSizeRef.current[panel.id];
                if (!base) {
                  importedBaseSizeRef.current[panel.id] = {
                    width: Math.max(1, panel.width),
                    height: Math.max(1, panel.height),
                  };
                }
                const safeBase = importedBaseSizeRef.current[panel.id];
                importedScale = Math.max(
                  0.35,
                  Math.min(4, Math.min(panel.width / safeBase.width, panel.height / safeBase.height)),
                );
              }
              return (
                <div
                  key={panel.id}
                  data-lc-panel-id={panel.id}
                  className={`lc-draggable-panel${isPanelSelected ? " lc-draggable-panel--active" : ""}${panelMarkedClass(panel.id)}${panel.isLocked ? " lc-draggable-panel--locked" : ""}${isImportedPanel ? " lc-draggable-panel--imported" : ""}${activeInteractionPanelId === panel.id ? " lc-draggable-panel--dragging" : ""}${isElementTemplate ? " lc-draggable-panel--element" : ""}${isFramelessPanel ? " lc-draggable-panel--frameless" : ""}`}
                  style={{
                    width: `${panel.width}px`,
                    height: `${panel.height}px`,
                    transform: rootPanelWorldTransform(panel, rootAdaptiveScale),
                    transformOrigin: ROOT_PANEL_TRANSFORM_ORIGIN,
                    zIndex: panel.zIndex,
                    opacity: panel.opacity ?? 1,
                    borderRadius: `${panel.borderRadiusPx ?? 12}px`,
                    ...panelShellSurfaceStyle(panel, isFramelessPanel),
                    transitionDuration: `${panel.transitionMs ?? 180}ms`,
                    transitionTimingFunction: panel.transitionCurve ?? "ease-in-out",
                    "--lc-panel-hover-scale": String(panel.hoverScale ?? 1.02),
                    "--lc-imported-scale": String(importedScale),
                  } as CSSProperties}
                  onDragOver={onArtboardDragOver}
                  onDragEnter={onArtboardDragEnter}
                  onPointerDownCapture={(event) => handlePanelPointerDownCapture(event, panel)}
                  onContextMenu={(event) => handlePanelContextMenu(event, panel)}
                  onDoubleClick={(event) => handlePanelSurfaceDoubleClick(event, panel)}
                >
                  {panel.importedSourceKind === "text" && buildImportedHtmlPreviewDoc(panel) ? (
                    <div className="lc-imported-drag-strip" aria-hidden />
                  ) : null}
                  {!isFramelessPanel ? (
                    <header>{panel.title}</header>
                  ) : null}
                  {renderPanelBody(panel)}
                  <div
                    className={`lc-panel-drag-surface${isMovePanelModifierHeld ? " lc-panel-drag-surface--active" : ""}`}
                    aria-label={t("construct.artboard.holdAltMove", { title: panel.title })}
                  />
                  {!isFramelessPanel || isPanelSelected || isImportedPanel ? (
                    <button
                      type="button"
                      className="lc-panel-resize-handle"
                      aria-label={t(
                        isImportedPanel ? "construct.artboard.holdAltResize" : "construct.artboard.resize",
                        { title: panel.title },
                      )}
                      onPointerDown={(event) => onPanelResizePointerDown(event, panel)}
                    />
                  ) : null}
                </div>
              );
            })}
        </div>
        {marquee ? (
          <div
            className="lavash-artboard-marquee"
            style={{
              left: `${Math.min(marquee.startX, marquee.x)}px`,
              top: `${Math.min(marquee.startY, marquee.y)}px`,
              width: `${Math.abs(marquee.x - marquee.startX)}px`,
              height: `${Math.abs(marquee.y - marquee.startY)}px`,
            }}
          />
        ) : null}
      </div>
      {isTauri() && showWindowDragRail ? (
        <WindowDragSpacer className="lavash-artboard-window-drag-rail" />
      ) : null}
      </div>
    </section>
  );
}