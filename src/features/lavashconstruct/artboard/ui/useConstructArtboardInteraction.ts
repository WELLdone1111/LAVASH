import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

import {
  ARTBOARD_INFINITE_PX,
  ARTBOARD_PAN_WHEEL_LINE_PX,
  ARTBOARD_ZOOM_MAX,
  ARTBOARD_ZOOM_MIN,
  ARTBOARD_ZOOM_WHEEL_FACTOR,
} from "@/features/lavashconstruct/shared/model/constants";
import { clampConstructArtboardPan, centeredConstructArtboardPan } from "@/features/lavashconstruct/artboard/model/artboardViewport";
import {
  findTopmostRootPanelAtClientPoint,
  panelUsesAltEditMode,
} from "@/features/lavashconstruct/artboard/model/artboardPanelHitTest";
import { resolvePanelOverlap } from "@/features/lavashconstruct/artboard/model/collisionResolve";
import {
  clampChildLocalPosition,
  findPlayerBoardAtWorldPoint,
  getBoardInnerOriginWorld,
  getBoardInnerSize,
  getPanelWorldBounds,
  isPanelDescendantOf,
  isPlayerBoardPanel,
  normalizeArtboardPanelsHierarchy,
} from "@/features/lavashconstruct/artboard/model/panelHierarchy";
import { WINDOW_RESIZE_END_EVENT } from "@/lib/windowResize";
import { useConstructStore } from "@/features/lavashconstruct/artboard/model/store";
import type { ArtboardPanel } from "@/features/lavashconstruct/artboard/ui/types";

type UseConstructArtboardInteractionParams = {
  animationState: "enter" | "exit";
  artboardPanels: ArtboardPanel[];
  moveArtboardPanel: (payload: { id: string; x: number; y: number; dragFreeChild?: boolean }) => void;
  resizeArtboardPanel: (payload: { id: string; width: number; height: number }) => void;
  commitArtboardPanels: (
    action: string,
    nextPanels: ArtboardPanel[],
    options?: { mergeKey?: string; mergeWindowMs?: number },
  ) => void;
  bringArtboardPanelToFront: (id: string) => void;
  setSelectedPanelId: (id: string | null) => void;
};

export function useConstructArtboardInteraction(params: UseConstructArtboardInteractionParams) {
  const {
    animationState,
    artboardPanels,
    moveArtboardPanel,
    resizeArtboardPanel,
    commitArtboardPanels,
    bringArtboardPanelToFront,
    setSelectedPanelId,
  } = params;

  const [artboardZoom, setArtboardZoom] = useState(1);
  const [artboardPan, setArtboardPan] = useState({ x: 0, y: 0 });
  const [middlePanHeld, setMiddlePanHeld] = useState(false);
  const [activeInteractionPanelId, setActiveInteractionPanelId] = useState<string | null>(null);

  const artboardBoardRef = useRef<HTMLDivElement | null>(null);
  const labViewportInitialCenterRef = useRef(false);
  const dragStateRef = useRef<{ id: string; offsetX: number; offsetY: number; pointerId: number } | null>(null);
  const dragStartPanelsRef = useRef<ArtboardPanel[] | null>(null);
  const resizeStateRef = useRef<{ id: string; startWidth: number; startHeight: number; startX: number; startY: number } | null>(
    null,
  );
  const artboardViewRef = useRef<{ zoom: number; pan: { x: number; y: number } }>({
    zoom: 1,
    pan: { x: 0, y: 0 },
  });
  const middlePanRef = useRef<{
    startClientX: number;
    startClientY: number;
    startPanX: number;
    startPanY: number;
    pointerId: number;
    ctrlHeld: boolean;
    moved: boolean;
  } | null>(null);
  const focusAnimRef = useRef<number | null>(null);
  /** WebView інколи не шле `ctrlKey`/`metaKey` на `wheel`; тримаємо синк з клавою (як з Alt на панелях). */
  const ctrlOrMetaModifierSyncRef = useRef(false);

  artboardViewRef.current.zoom = artboardZoom;
  artboardViewRef.current.pan = artboardPan;

  const resetArtboardZoomAtPoint = (clientX: number, clientY: number) => {
    const board = artboardBoardRef.current;
    if (!board) return;
    const rect = board.getBoundingClientRect();
    const z0 = Math.min(ARTBOARD_ZOOM_MAX, Math.max(ARTBOARD_ZOOM_MIN, artboardViewRef.current.zoom || 1));
    const p0 = artboardViewRef.current.pan;
    const px = clientX - rect.left;
    const py = clientY - rect.top;
    const lx = (px - p0.x) / z0;
    const ly = (py - p0.y) / z0;
    const z1 = 1;
    setArtboardPan(clampConstructArtboardPan({ x: px - lx * z1, y: py - ly * z1 }, z1, rect.width, rect.height));
    setArtboardZoom(z1);
  };

  useEffect(() => {
    const sync = (event: KeyboardEvent) => {
      ctrlOrMetaModifierSyncRef.current =
        event.ctrlKey ||
        event.metaKey ||
        (typeof event.getModifierState === "function" &&
          (event.getModifierState("Control") || event.getModifierState("Meta")));
    };
    const clear = () => {
      ctrlOrMetaModifierSyncRef.current = false;
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") clear();
    };
    window.addEventListener("keydown", sync, true);
    window.addEventListener("keyup", sync, true);
    window.addEventListener("blur", clear);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("keydown", sync, true);
      window.removeEventListener("keyup", sync, true);
      window.removeEventListener("blur", clear);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  useLayoutEffect(() => {
    const board = artboardBoardRef.current;
    if (!board) return undefined;

    const wheelOptions: AddEventListenerOptions = { passive: false, capture: true };

    const onWheel = (e: WheelEvent) => {
      const ctrlMetaFromEvent =
        e.ctrlKey ||
        e.metaKey ||
        (typeof e.getModifierState === "function" &&
          (e.getModifierState("Control") || e.getModifierState("Meta")));
      const zoomChord = ctrlMetaFromEvent || ctrlOrMetaModifierSyncRef.current;
      if (ctrlMetaFromEvent) {
        ctrlOrMetaModifierSyncRef.current = true;
      }
      if (zoomChord) {
        e.preventDefault();
        e.stopPropagation();
        const rect = board.getBoundingClientRect();
        const z0 = Math.min(ARTBOARD_ZOOM_MAX, Math.max(ARTBOARD_ZOOM_MIN, artboardViewRef.current.zoom || 1));
        const p0 = artboardViewRef.current.pan;
        const px = e.clientX - rect.left;
        const py = e.clientY - rect.top;
        const lx = (px - p0.x) / z0;
        const ly = (py - p0.y) / z0;
        const factor = Math.exp(-e.deltaY * ARTBOARD_ZOOM_WHEEL_FACTOR);
        const z1 = Math.min(ARTBOARD_ZOOM_MAX, Math.max(ARTBOARD_ZOOM_MIN, factor * z0));
        const panNext = { x: px - lx * z1, y: py - ly * z1 };
        setArtboardPan(clampConstructArtboardPan(panNext, z1, rect.width, rect.height));
        setArtboardZoom(z1);
        return;
      }

      if (e.altKey) {
        const rect = board.getBoundingClientRect();
        const panel = findTopmostRootPanelAtClientPoint(
          e.clientX,
          e.clientY,
          rect,
          artboardViewRef.current.pan,
          artboardViewRef.current.zoom,
          artboardPanels,
        );
        if (panel && panelUsesAltEditMode(panel) && !panel.isLocked) {
          e.preventDefault();
          e.stopPropagation();
          const step = e.deltaY > 0 ? -0.06 : 0.06;
          const nextW = Math.max(48, Math.round(panel.width * (1 + step)));
          const nextH = Math.max(48, Math.round(panel.height * (1 + step)));
          resizeArtboardPanel({ id: panel.id, width: nextW, height: nextH });
          setSelectedPanelId(panel.id);
          return;
        }
      }

      e.preventDefault();
      let dx = e.deltaX;
      let dy = e.deltaY;
      if (e.deltaMode === WheelEvent.DOM_DELTA_LINE) {
        dx *= ARTBOARD_PAN_WHEEL_LINE_PX;
        dy *= ARTBOARD_PAN_WHEEL_LINE_PX;
      } else if (e.deltaMode === WheelEvent.DOM_DELTA_PAGE) {
        dx *= board.clientWidth;
        dy *= board.clientHeight;
      }
      const p0 = artboardViewRef.current.pan;
      const zUi = artboardViewRef.current.zoom;
      const panNext = { x: p0.x - dx, y: p0.y - dy };
      setArtboardPan(clampConstructArtboardPan(panNext, zUi, board.clientWidth, board.clientHeight));
    };

    board.addEventListener("wheel", onWheel, wheelOptions);
    return () => board.removeEventListener("wheel", onWheel, wheelOptions);
  }, [animationState, artboardPanels, resizeArtboardPanel, setSelectedPanelId]);

  useLayoutEffect(() => {
    const board = artboardBoardRef.current;
    if (!board) return undefined;

    let clampRaf = 0;
    const applyClampOrInitialCenter = () => {
      if (clampRaf !== 0) return;
      clampRaf = requestAnimationFrame(() => {
        clampRaf = 0;
        const r = board.getBoundingClientRect();
        const z = artboardViewRef.current.zoom;
        if (!labViewportInitialCenterRef.current) {
          if (r.width >= 8 && r.height >= 8) {
            labViewportInitialCenterRef.current = true;
            setArtboardPan(centeredConstructArtboardPan(z, r.width, r.height));
          }
          return;
        }
        setArtboardPan((p) => clampConstructArtboardPan(p, z, r.width, r.height));
      });
    };

    const ro = new ResizeObserver(applyClampOrInitialCenter);
    ro.observe(board);
    applyClampOrInitialCenter();
    window.addEventListener(WINDOW_RESIZE_END_EVENT, applyClampOrInitialCenter);
    return () => {
      if (clampRaf !== 0) cancelAnimationFrame(clampRaf);
      ro.disconnect();
      window.removeEventListener(WINDOW_RESIZE_END_EVENT, applyClampOrInitialCenter);
    };
  }, [animationState, artboardZoom]);

  useEffect(() => {
    const snapToTargets = (value: number, targets: number[], threshold: number) => {
      let best = value;
      let bestDelta = Number.POSITIVE_INFINITY;
      for (const target of targets) {
        const delta = Math.abs(target - value);
        if (delta <= threshold && delta < bestDelta) {
          bestDelta = delta;
          best = target;
        }
      }
      return best;
    };

    const handlePointerMove = (event: PointerEvent) => {
      const boardElement = artboardBoardRef.current;
      if (!boardElement) return;

      const midPan = middlePanRef.current;
      if (midPan) {
        if (event.pointerId !== midPan.pointerId) return;
        event.preventDefault();
        const moved =
          Math.abs(event.clientX - midPan.startClientX) > 4 ||
          Math.abs(event.clientY - midPan.startClientY) > 4;
        if (moved) midPan.moved = true;
        const r = boardElement.getBoundingClientRect();
        const zoomUi = artboardViewRef.current.zoom;
        setArtboardPan(
          clampConstructArtboardPan(
            {
              x: midPan.startPanX + (event.clientX - midPan.startClientX),
              y: midPan.startPanY + (event.clientY - midPan.startClientY),
            },
            zoomUi,
            r.width,
            r.height,
          ),
        );
        return;
      }

      const dragState = dragStateRef.current;
      const resizeState = resizeStateRef.current;
      const boardRect = boardElement.getBoundingClientRect();
      const { zoom: zRaw, pan } = artboardViewRef.current;
      const zoom = Math.max(zRaw || 1, 1e-4);

      if (dragState) {
        const storeState = useConstructStore.getState();
        const moving = storeState.artboardPanels.find((panel) => panel.id === dragState.id);
        if (!moving) return;
        const ls = storeState.constructState;
        const threshold = ls.magneticThreshold;
        const alignSnap = ls.isPanelAlignmentSnapEnabled;
        const collisionAv = ls.isCollisionAvoidanceEnabled;
        const vx = event.clientX - boardRect.left;
        const vy = event.clientY - boardRect.top;
        const rawWorldX = (vx - pan.x) / zoom - dragState.offsetX;
        const rawWorldY = (vy - pan.y) / zoom - dragState.offsetY;

        if (moving.parentId) {
          const parent = storeState.artboardPanels.find((p) => p.id === moving.parentId);
          if (!parent) return;
          const innerOrigin = getBoardInnerOriginWorld(parent, storeState.artboardPanels);
          const inner = getBoardInnerSize(parent);
          let rawLX = rawWorldX - innerOrigin.x;
          let rawLY = rawWorldY - innerOrigin.y;
          const siblings = storeState.artboardPanels.filter(
            (p) => p.parentId === moving.parentId && p.id !== moving.id && p.isVisible,
          );
          const targetsLX = siblings.flatMap((s) => {
            const lx = s.localX ?? 0;
            return [lx, lx + s.width / 2 - moving.width / 2, lx + s.width - moving.width];
          });
          targetsLX.push(0, Math.max(0, inner.width - moving.width), inner.width / 2 - moving.width / 2);
          const targetsLY = siblings.flatMap((s) => {
            const ly = s.localY ?? 0;
            return [ly, ly + s.height / 2 - moving.height / 2, ly + s.height - moving.height];
          });
          targetsLY.push(0, Math.max(0, inner.height - moving.height), inner.height / 2 - moving.height / 2);
          let nextLX = rawLX;
          let nextLY = rawLY;
          if (alignSnap) {
            nextLX = snapToTargets(rawLX, targetsLX, threshold);
            nextLY = snapToTargets(rawLY, targetsLY, threshold);
          }
          moveArtboardPanel({
            id: dragState.id,
            x: nextLX,
            y: nextLY,
            dragFreeChild: true,
          });
          return;
        }

        const rootsOnlyOthers = storeState.artboardPanels.filter(
          (panel) =>
            !panel.parentId &&
            panel.id !== moving.id &&
            panel.isVisible &&
            !isPlayerBoardPanel(panel),
        );
        const targetsX = rootsOnlyOthers.flatMap((panel) => [
          panel.x,
          panel.x + panel.width / 2,
          panel.x + panel.width,
        ]);
        const targetsY = rootsOnlyOthers.flatMap((panel) => [
          panel.y,
          panel.y + panel.height / 2,
          panel.y + panel.height,
        ]);

        let nextX = rawWorldX;
        let nextY = rawWorldY;
        if (alignSnap) {
          nextX = snapToTargets(rawWorldX, targetsX, threshold);
          nextY = snapToTargets(rawWorldY, targetsY, threshold);
        }

        if (collisionAv) {
          const resolved = resolvePanelOverlap(moving, nextX, nextY, rootsOnlyOthers);
          nextX = resolved.x;
          nextY = resolved.y;
        }

        moveArtboardPanel({
          id: dragState.id,
          x: nextX,
          y: nextY,
        });
      }
      if (resizeState) {
        const deltaX = (event.clientX - resizeState.startX) / zoom;
        const deltaY = (event.clientY - resizeState.startY) / zoom;
        resizeArtboardPanel({
          id: resizeState.id,
          width: resizeState.startWidth + deltaX,
          height: resizeState.startHeight + deltaY,
        });
      }
    };

    const finalizeInteraction = (pointerId?: number, release?: { clientX: number; clientY: number }) => {
      const midPan = middlePanRef.current;
      if (midPan && (pointerId === undefined || pointerId === midPan.pointerId)) {
        if (!midPan.moved && midPan.ctrlHeld) {
          resetArtboardZoomAtPoint(midPan.startClientX, midPan.startClientY);
        }
        middlePanRef.current = null;
        setMiddlePanHeld(false);
        if (pointerId !== undefined) {
          try {
            artboardBoardRef.current?.releasePointerCapture(pointerId);
          } catch {
            /* release інколи падає, якщо capture вже зняли */
          }
        }
      }
      const dragPointerId = dragStateRef.current?.pointerId;
      if (
        dragPointerId !== undefined &&
        (pointerId === undefined || pointerId === dragPointerId) &&
        artboardBoardRef.current
      ) {
        try {
          artboardBoardRef.current.releasePointerCapture(dragPointerId);
        } catch {
          /* пофіг */
        }
      }
      const startedPanels = dragStartPanelsRef.current;
      if (startedPanels) {
        let currentPanels = useConstructStore.getState().artboardPanels;
        const resizeEnded = resizeStateRef.current !== null;
        const dragEnded = dragStateRef.current !== null;
        const dockDragId = dragStateRef.current?.id;

        let action: string = resizeEnded ? "Resize artboard panel" : "Move artboard panel";
        let mergeKey: string = resizeEnded ? "resize-panel" : "move-panel";

        const boardEl = artboardBoardRef.current;
        let releaseProbeWx: number | undefined;
        let releaseProbeWy: number | undefined;
        if (release && boardEl) {
          const boardRect = boardEl.getBoundingClientRect();
          const { zoom: zRel, pan: panRel } = artboardViewRef.current;
          const zoomRel = Math.max(zRel || 1, 1e-4);
          const vxr = release.clientX - boardRect.left;
          const vyr = release.clientY - boardRect.top;
          releaseProbeWx = (vxr - panRel.x) / zoomRel;
          releaseProbeWy = (vyr - panRel.y) / zoomRel;
        }

        if (dragEnded && !resizeEnded && dockDragId) {
          const moving = currentPanels.find((p) => p.id === dockDragId);
          if (moving && !moving.parentId) {
            const wb = getPanelWorldBounds(moving, currentPanels);
            const cx = wb.x + wb.width / 2;
            const cy = wb.y + wb.height / 2;
            const hit = findPlayerBoardAtWorldPoint(
              currentPanels,
              releaseProbeWx ?? cx,
              releaseProbeWy ?? cy,
            );
            if (
              hit &&
              hit.id !== moving.id &&
              !isPanelDescendantOf(currentPanels, hit.id, moving.id)
            ) {
              const origin = getBoardInnerOriginWorld(hit, currentPanels);
              const lx = wb.x - origin.x;
              const ly = wb.y - origin.y;
              const docked = clampChildLocalPosition(
                { ...moving, parentId: hit.id, localX: lx, localY: ly, x: 0, y: 0 },
                hit,
              );
              currentPanels = normalizeArtboardPanelsHierarchy(
                currentPanels.map((p) => (p.id === moving.id ? docked : p)),
              );
              action = "Dock panel to PlayerBoard";
              mergeKey = "dock-to-player-board";
            }
          } else if (moving?.parentId) {
            const wb = getPanelWorldBounds(moving, currentPanels);
            const cx = wb.x + wb.width / 2;
            const cy = wb.y + wb.height / 2;
            const hit = findPlayerBoardAtWorldPoint(
              currentPanels,
              releaseProbeWx ?? cx,
              releaseProbeWy ?? cy,
            );
            if (
              hit &&
              hit.id !== moving.parentId &&
              hit.id !== moving.id &&
              !isPanelDescendantOf(currentPanels, hit.id, moving.id)
            ) {
              const origin = getBoardInnerOriginWorld(hit, currentPanels);
              const lx = wb.x - origin.x;
              const ly = wb.y - origin.y;
              const docked = clampChildLocalPosition(
                { ...moving, parentId: hit.id, localX: lx, localY: ly, x: 0, y: 0 },
                hit,
              );
              currentPanels = normalizeArtboardPanelsHierarchy(
                currentPanels.map((p) => (p.id === moving.id ? docked : p)),
              );
              action = "Move panel to nested PlayerBoard";
              mergeKey = "reparent-composition-panel";
            } else if (!hit) {
              const ls = useConstructStore.getState().constructState;
              const grid = Math.max(4, Math.round(ls.magneticThreshold));
              const ART = ARTBOARD_INFINITE_PX;
              const clampRoot = (value: number, max: number) => Math.max(0, Math.min(value, max));
              const snapUndock = (value: number, max: number) => {
                let raw = clampRoot(value, max);
                if (ls.isPanelAlignmentSnapEnabled) {
                  raw = clampRoot(Math.round(raw / grid) * grid, max);
                }
                return raw;
              };
              const maxX = Math.max(0, ART - moving.width);
              const maxY = Math.max(0, ART - moving.height);
              const undocked = {
                ...moving,
                parentId: undefined,
                localX: undefined,
                localY: undefined,
                x: snapUndock(Math.round(wb.x), maxX),
                y: snapUndock(Math.round(wb.y), maxY),
              };
              currentPanels = normalizeArtboardPanelsHierarchy(
                currentPanels.map((p) => (p.id === moving.id ? undocked : p)),
              );
              action = "Undock panel to artboard";
              mergeKey = "undock-to-artboard";
            } else {
              currentPanels = normalizeArtboardPanelsHierarchy(currentPanels);
              action = "Move artboard panel";
              mergeKey = "move-panel";
            }
          }
        }

        if (JSON.stringify(startedPanels) !== JSON.stringify(currentPanels)) {
          commitArtboardPanels(action, currentPanels, { mergeKey, mergeWindowMs: 420 });
        }
      }
      resizeStateRef.current = null;
      dragStartPanelsRef.current = null;
      dragStateRef.current = null;
      setActiveInteractionPanelId(null);
    };

    const handlePointerUp = (event: PointerEvent) => {
      finalizeInteraction(event.pointerId, { clientX: event.clientX, clientY: event.clientY });
    };

    const handlePointerCancel = (event: PointerEvent) => {
      finalizeInteraction(event.pointerId, { clientX: event.clientX, clientY: event.clientY });
    };

    const handleWindowBlur = () => {
      finalizeInteraction();
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerCancel);
    window.addEventListener("blur", handleWindowBlur);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerCancel);
      window.removeEventListener("blur", handleWindowBlur);
    };
  }, [moveArtboardPanel, resizeArtboardPanel, commitArtboardPanels]);

  function onArtboardViewportPointerDownCapture(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 1) return;
    event.preventDefault();
    event.stopPropagation();
    const p = artboardViewRef.current.pan;
    middlePanRef.current = {
      startClientX: event.clientX,
      startClientY: event.clientY,
      startPanX: p.x,
      startPanY: p.y,
      pointerId: event.pointerId,
      ctrlHeld: event.ctrlKey || event.metaKey,
      moved: false,
    };
    setMiddlePanHeld(true);
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      /* пофіг, якщо capture не підтримали */
    }
  }

  function onArtboardViewportLostPointerCapture() {
    if (middlePanRef.current !== null) {
      middlePanRef.current = null;
      setMiddlePanHeld(false);
    }
  }

  function onPanelPointerDown(
    event: ReactPointerEvent<HTMLElement>,
    panel: ArtboardPanel,
    meta?: { moveModifierHeld?: boolean },
  ) {
    if (event.button !== 0) return;
    if (panel.isLocked || !panel.isVisible) return;
    /** драг панелей — Alt + ЛКМ (Shift зайнятий під інше). */
    const moveModifierHeld = meta?.moveModifierHeld ?? event.altKey;
    if (!moveModifierHeld) return;

    const boardElement = artboardBoardRef.current;
    if (!boardElement) return;
    const boardRect = boardElement.getBoundingClientRect();
    const { zoom: zRaw, pan } = artboardViewRef.current;
    const zoom = Math.max(zRaw || 1, 1e-4);
    const vx = event.clientX - boardRect.left;
    const vy = event.clientY - boardRect.top;
    const currentPanels = useConstructStore.getState().artboardPanels;
    const world = getPanelWorldBounds(panel, currentPanels);
    dragStartPanelsRef.current = currentPanels;
    setSelectedPanelId(panel.id);
    bringArtboardPanelToFront(panel.id);
    dragStateRef.current = {
      id: panel.id,
      offsetX: (vx - pan.x) / zoom - world.x,
      offsetY: (vy - pan.y) / zoom - world.y,
      pointerId: event.pointerId,
    };
    setActiveInteractionPanelId(panel.id);
    try {
      boardElement.setPointerCapture(event.pointerId);
    } catch {
      /* iframe-превʼю / деякі хости не дають capture */
    }
  }

  function onPanelResizePointerDown(event: ReactPointerEvent<HTMLElement>, panel: ArtboardPanel) {
    event.stopPropagation();
    event.preventDefault();
    if (event.button !== 2) return;
    if (!(event.altKey || event.getModifierState?.("Alt"))) return;
    if (panel.isLocked || !panel.isVisible) return;
    setSelectedPanelId(panel.id);
    dragStartPanelsRef.current = useConstructStore.getState().artboardPanels;
    resizeStateRef.current = {
      id: panel.id,
      startWidth: panel.width,
      startHeight: panel.height,
      startX: event.clientX,
      startY: event.clientY,
    };
    setActiveInteractionPanelId(panel.id);
  }

  function focusPanelInView(panelId: string) {
    const board = artboardBoardRef.current;
    if (!board) return;
    const panel = artboardPanels.find((item) => item.id === panelId);
    if (!panel) return;
    const rect = board.getBoundingClientRect();
    const zoom = Math.max(artboardViewRef.current.zoom || 1, 1e-4);
    const wb = getPanelWorldBounds(panel, artboardPanels);
    const centerX = wb.x + wb.width / 2;
    const centerY = wb.y + wb.height / 2;
    const targetPan = clampConstructArtboardPan(
      {
        x: rect.width / 2 - centerX * zoom,
        y: rect.height / 2 - centerY * zoom,
      },
      zoom,
      rect.width,
      rect.height,
    );
    const startPan = artboardViewRef.current.pan;
    const startAt = performance.now();
    const durationMs = 280;

    if (focusAnimRef.current !== null) {
      cancelAnimationFrame(focusAnimRef.current);
      focusAnimRef.current = null;
    }

    const tick = (now: number) => {
      const t = Math.min(1, (now - startAt) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      const next = {
        x: startPan.x + (targetPan.x - startPan.x) * eased,
        y: startPan.y + (targetPan.y - startPan.y) * eased,
      };
      setArtboardPan(next);
      if (t < 1) {
        focusAnimRef.current = requestAnimationFrame(tick);
      } else {
        focusAnimRef.current = null;
      }
    };

    focusAnimRef.current = requestAnimationFrame(tick);
  }

  return {
    artboardZoom,
    artboardPan,
    middlePanHeld,
    activeInteractionPanelId,
    artboardBoardRef,
    onArtboardViewportPointerDownCapture,
    onArtboardViewportLostPointerCapture,
    onPanelPointerDown,
    onPanelResizePointerDown,
    focusPanelInView,
  };
}
