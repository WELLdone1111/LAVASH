import { isTauri } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useEffect, useRef } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";
import { beginNativeWindowResize, endNativeWindowResize } from "@/lib/windowResizeSession";

type ResizeDirection =
  | "East"
  | "North"
  | "NorthEast"
  | "NorthWest"
  | "South"
  | "SouthEast"
  | "SouthWest"
  | "West";

const RESIZE_END_DEBOUNCE_MS = 120;

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

/**
 * Frameless resize через Tauri startResizeDragging (OS-native).
 * data-window-resizing — пауза важких layout/observers під час drag.
 */
export default function WindowResizeEdges() {
  const resizingRef = useRef(false);
  const endTimerRef = useRef(0);

  useEffect(() => {
    if (!isTauri()) return undefined;

    const scheduleEnd = () => {
      if (!resizingRef.current) return;
      window.clearTimeout(endTimerRef.current);
      endTimerRef.current = window.setTimeout(() => {
        if (!resizingRef.current) return;
        resizingRef.current = false;
        endNativeWindowResize();
      }, RESIZE_END_DEBOUNCE_MS);
    };

    const onMouseUp = () => scheduleEnd();
    window.addEventListener("mouseup", onMouseUp);

    let disposed = false;
    const unlistenPromise = getCurrentWindow()
      .onResized(() => {
        if (!disposed && resizingRef.current) scheduleEnd();
      })
      .catch(() => undefined);

    return () => {
      disposed = true;
      window.removeEventListener("mouseup", onMouseUp);
      window.clearTimeout(endTimerRef.current);
      void unlistenPromise.then((unlisten) => unlisten?.());
      if (resizingRef.current) {
        resizingRef.current = false;
        endNativeWindowResize();
      }
    };
  }, []);

  if (!isTauri()) return null;

  function onEdgeMouseDown(event: ReactMouseEvent<HTMLDivElement>, direction: ResizeDirection) {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    beginNativeWindowResize();
    resizingRef.current = true;
    void getCurrentWindow().startResizeDragging(direction);
  }

  return (
    <div className="app-window-resize-edges" aria-hidden>
      {RESIZE_EDGES.map(({ direction, className }) => (
        <div
          key={direction}
          className={`app-window-resize-edge ${className}`}
          data-tauri-drag-region="false"
          onMouseDown={(e) => onEdgeMouseDown(e, direction)}
        />
      ))}
    </div>
  );
}
