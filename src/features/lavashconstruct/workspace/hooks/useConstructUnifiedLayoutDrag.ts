import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import {
  readConstructUnifiedLayout,
  writeConstructUnifiedLayout,
  CONSTRUCT_CHAT_PANEL_MIN_WIDTH_PX,
  CONSTRUCT_RAIL_WIDTH_PX,
  type ConstructUnifiedLayout,
} from "@/features/lavashconstruct/workspace/model/constructUnifiedLayoutStorage";
import { paintConstructShellGrid } from "@/features/lavashconstruct/workspace/model/constructShellLayoutDom";

function clampConstructSplit(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n));
}

export function useConstructUnifiedLayoutDrag(shellRef: RefObject<HTMLDivElement | null>) {
  const [constructLayout, setConstructLayout] = useState<ConstructUnifiedLayout>(() => readConstructUnifiedLayout());
  const constructLayoutRef = useRef(constructLayout);
  const splitPaintRafRef = useRef(0);
  const splitDragPendingRef = useRef<{ ev: PointerEvent; onMove: (ev: PointerEvent) => void } | null>(null);

  useEffect(() => {
    constructLayoutRef.current = constructLayout;
  }, [constructLayout]);

  useEffect(() => {
    const shell = shellRef.current;
    if (!shell) return;
    paintConstructShellGrid(shell, constructLayout);
  }, [constructLayout, shellRef]);

  const scheduleConstructSplitPaint = useCallback(() => {
    if (splitPaintRafRef.current !== 0) return;
    splitPaintRafRef.current = requestAnimationFrame(() => {
      splitPaintRafRef.current = 0;
      const pending = splitDragPendingRef.current;
      if (pending) {
        pending.onMove(pending.ev);
        splitDragPendingRef.current = null;
      }
      const layout = constructLayoutRef.current;
      const shell = shellRef.current;
      if (shell) paintConstructShellGrid(shell, layout);
    });
  }, [shellRef]);

  const attachUnifiedPointerDrag = useCallback(
    (startEvent: ReactPointerEvent<HTMLElement>, onMove: (ev: PointerEvent) => void) => {
      if (startEvent.button !== 0) return;
      startEvent.preventDefault();
      const target = startEvent.currentTarget;
      target.setPointerCapture(startEvent.pointerId);
      const move = (ev: PointerEvent) => {
        splitDragPendingRef.current = { ev, onMove };
        scheduleConstructSplitPaint();
      };
      const up = () => {
        splitDragPendingRef.current = null;
        if (splitPaintRafRef.current !== 0) {
          cancelAnimationFrame(splitPaintRafRef.current);
          splitPaintRafRef.current = 0;
        }
        document.documentElement.removeAttribute("data-lc-split-dragging");
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        window.removeEventListener("pointercancel", up);
        try {
          target.releasePointerCapture(startEvent.pointerId);
        } catch {
          /* пофіг */
        }
        const shell = shellRef.current;
        if (shell) paintConstructShellGrid(shell, constructLayoutRef.current);
        setConstructLayout({ ...constructLayoutRef.current });
        writeConstructUnifiedLayout(constructLayoutRef.current);
      };
      document.documentElement.setAttribute("data-lc-split-dragging", "1");
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
      window.addEventListener("pointercancel", up);
    },
    [scheduleConstructSplitPaint, shellRef],
  );

  const onChatSplitPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLElement>) => {
      const shell = shellRef.current;
      if (!shell) return;

      if (constructLayoutRef.current.chatCollapsed) {
        const expanded = { ...constructLayoutRef.current, chatCollapsed: false };
        constructLayoutRef.current = expanded;
        paintConstructShellGrid(shell, expanded);
        setConstructLayout(expanded);
      }

      const startX = e.clientX;
      const startW = constructLayoutRef.current.chatW;
      const available = shell.clientWidth - CONSTRUCT_RAIL_WIDTH_PX;
      const maxW = Math.min(620, Math.max(CONSTRUCT_CHAT_PANEL_MIN_WIDTH_PX, available - 280));

      attachUnifiedPointerDrag(e, (ev) => {
        const dx = ev.clientX - startX;
        constructLayoutRef.current = {
          ...constructLayoutRef.current,
          chatCollapsed: false,
          chatW: clampConstructSplit(startW - dx, CONSTRUCT_CHAT_PANEL_MIN_WIDTH_PX, maxW),
        };
      });
    },
    [attachUnifiedPointerDrag, shellRef],
  );

  const expandChatPanel = useCallback(() => {
    if (!constructLayoutRef.current.chatCollapsed) return;
    const next = { ...constructLayoutRef.current, chatCollapsed: false };
    constructLayoutRef.current = next;
    setConstructLayout(next);
    writeConstructUnifiedLayout(next);
    const shell = shellRef.current;
    if (shell) paintConstructShellGrid(shell, next);
  }, [shellRef]);

  return {
    constructLayout,
    constructLayoutRef,
    setConstructLayout,
    onChatSplitPointerDown,
    expandChatPanel,
  };
}
