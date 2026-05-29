import { invoke, isTauri } from "@tauri-apps/api/core";
import { useRef } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import {
  beginWindowResize,
  endWindowResize,
  updateWindowResizePreview,
  WINDOW_EXPANDED_MIN_H,
  WINDOW_EXPANDED_MIN_W,
} from "@/lib/windowResize";
import { getCurrentWindow, LogicalPosition, LogicalSize } from "@tauri-apps/api/window";

type ResizeDirection =
  | "East"
  | "North"
  | "NorthEast"
  | "NorthWest"
  | "South"
  | "SouthEast"
  | "SouthWest"
  | "West";

type DragState = {
  direction: ResizeDirection;
  w0: number;
  h0: number;
  x0: number;
  y0: number;
  accDx: number;
  accDy: number;
};

type PendingBounds = {
  w: number;
  h: number;
  x: number;
  y: number;
  movePosition: boolean;
};

const SET_SIZE_MIN_MS = 32;

const RESIZE_EDGES: { direction: ResizeDirection; className: string }[] = [
  { direction: "North", className: "app-window-resize-edge--n" },
  { direction: "South", className: "app-window-resize-edge--s" },
  { direction: "West", className: "app-window-resize-edge--w" },
  { direction: "East", className: "app-window-resize-edge--e" },
  { direction: "NorthWest", className: "app-window-resize-edge--nw" },
  { direction: "NorthEast", className: "app-window-resize-edge--ne" },
  { direction: "SouthWest", className: "app-window-resize-edge--sw" },
  { direction: "SouthEast", className: "app-window-resize-edge--se" },
];

/** setSize тримає верхній-лівий кут — для West/North треба зсунути outer position. */
function targetBounds(d: DragState): PendingBounds {
  let w = d.w0;
  let h = d.h0;

  if (d.direction.includes("East")) w = d.w0 + d.accDx;
  else if (d.direction.includes("West")) w = d.w0 - d.accDx;

  if (d.direction.includes("South")) h = d.h0 + d.accDy;
  else if (d.direction.includes("North")) h = d.h0 - d.accDy;

  const nextW = Math.max(WINDOW_EXPANDED_MIN_W, Math.round(w));
  const nextH = Math.max(WINDOW_EXPANDED_MIN_H, Math.round(h));

  const movePosition = d.direction.includes("West") || d.direction.includes("North");
  let x = d.x0;
  let y = d.y0;
  if (d.direction.includes("West")) x = d.x0 + (d.w0 - nextW);
  if (d.direction.includes("North")) y = d.y0 + (d.h0 - nextH);

  return {
    w: nextW,
    h: nextH,
    x: Math.round(x),
    y: Math.round(y),
    movePosition,
  };
}

function applyBounds(
  win: ReturnType<typeof getCurrentWindow>,
  bounds: PendingBounds,
): Promise<void> {
  const sizePromise = win.setSize(new LogicalSize(bounds.w, bounds.h));
  if (!bounds.movePosition) return sizePromise;
  return Promise.all([
    sizePromise,
    win.setPosition(new LogicalPosition(bounds.x, bounds.y)),
  ]).then(() => undefined);
}

/**
 * Невидимі зони по периметру + setSize/setPosition (без startResizeDragging → без Win11 tooltip).
 */
export default function WindowResizeEdges() {
  const dragRef = useRef<DragState | null>(null);
  const boundsRef = useRef<PendingBounds | null>(null);
  const lastAppliedRef = useRef<PendingBounds | null>(null);
  const rafRef = useRef(0);
  const lastSetSizeAtRef = useRef(0);

  if (!isTauri()) return null;

  function flushBounds(win: ReturnType<typeof getCurrentWindow>) {
    const pending = boundsRef.current;
    if (!pending || !dragRef.current) return;

    const last = lastAppliedRef.current;
    if (
      last &&
      last.w === pending.w &&
      last.h === pending.h &&
      last.x === pending.x &&
      last.y === pending.y &&
      last.movePosition === pending.movePosition
    ) {
      return;
    }

    const now = performance.now();
    if (now - lastSetSizeAtRef.current < SET_SIZE_MIN_MS) return;
    lastSetSizeAtRef.current = now;

    lastAppliedRef.current = { ...pending };
    void applyBounds(win, pending);
  }

  function startResizeLoop(win: ReturnType<typeof getCurrentWindow>) {
    if (rafRef.current !== 0) return;
    const tick = () => {
      if (!dragRef.current) {
        rafRef.current = 0;
        return;
      }
      flushBounds(win);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }

  function stopResizeLoop() {
    if (rafRef.current !== 0) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }
  }

  async function onPointerDown(
    event: ReactPointerEvent<HTMLDivElement>,
    direction: ResizeDirection,
  ) {
    if (event.button !== 0) return;
    event.preventDefault();
    void invoke("lavash_reclaim_window_input").catch(() => {});
    const el = event.currentTarget;
    const pid = event.pointerId;
    el.setPointerCapture(pid);

    const win = getCurrentWindow();
    const [inner, outer, sf] = await Promise.all([
      win.innerSize(),
      win.outerPosition(),
      win.scaleFactor(),
    ]);

    if (!el.hasPointerCapture(pid) || (event.buttons & 1) === 0) {
      try {
        el.releasePointerCapture(pid);
      } catch {
        /* ignore */
      }
      return;
    }

    beginWindowResize();
    lastAppliedRef.current = null;
    dragRef.current = {
      direction,
      w0: inner.width / sf,
      h0: inner.height / sf,
      x0: outer.x / sf,
      y0: outer.y / sf,
      accDx: 0,
      accDy: 0,
    };
    boundsRef.current = {
      w: dragRef.current.w0,
      h: dragRef.current.h0,
      x: dragRef.current.x0,
      y: dragRef.current.y0,
      movePosition: false,
    };
    lastSetSizeAtRef.current = 0;
    updateWindowResizePreview(dragRef.current.w0, dragRef.current.h0, {
      w0: dragRef.current.w0,
      h0: dragRef.current.h0,
      direction,
    });
    startResizeLoop(win);
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if ((event.buttons & 1) === 0) {
      finishDrag(event);
      return;
    }
    const d = dragRef.current;
    if (!d) return;
    event.preventDefault();

    d.accDx += event.movementX;
    d.accDy += event.movementY;
    const bounds = targetBounds(d);
    boundsRef.current = bounds;
    updateWindowResizePreview(bounds.w, bounds.h, {
      w0: d.w0,
      h0: d.h0,
      direction: d.direction,
    });
  }

  function releaseCapture(el: HTMLDivElement, pid: number) {
    if (el.hasPointerCapture(pid)) {
      try {
        el.releasePointerCapture(pid);
      } catch {
        /* ignore */
      }
    }
  }

  function finishDrag(event: ReactPointerEvent<HTMLDivElement>) {
    const el = event.currentTarget;
    const pid = event.pointerId;
    const win = getCurrentWindow();
    const pending = boundsRef.current;
    dragRef.current = null;
    boundsRef.current = null;
    stopResizeLoop();
    releaseCapture(el, pid);

    if (pending) {
      void applyBounds(win, pending).finally(() => endWindowResize());
    } else {
      endWindowResize();
    }
  }

  function onLostPointerCapture() {
    const win = getCurrentWindow();
    const pending = boundsRef.current;
    dragRef.current = null;
    boundsRef.current = null;
    stopResizeLoop();
    if (pending) {
      void applyBounds(win, pending).finally(() => endWindowResize());
    } else {
      endWindowResize();
    }
  }

  return (
    <div className="app-window-resize-edges" aria-hidden>
      {RESIZE_EDGES.map(({ direction, className }) => (
        <div
          key={direction}
          className={`app-window-resize-edge ${className}`}
          data-tauri-drag-region="false"
          onPointerDown={(e) => void onPointerDown(e, direction)}
          onPointerMove={onPointerMove}
          onPointerUp={finishDrag}
          onPointerCancel={finishDrag}
          onLostPointerCapture={onLostPointerCapture}
        />
      ))}
    </div>
  );
}
