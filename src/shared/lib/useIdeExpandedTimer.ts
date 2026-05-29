import { useEffect, useRef, useState } from "react";

function isTimerRunning(expanded: boolean): boolean {
  return expanded && typeof document !== "undefined" && !document.hidden;
}

/**
 * Час, коли IDE розгорнута (активна вкладка/вікно). Пауза при згортанні або прихованні вікна.
 */
export function useIdeExpandedTimer(expanded: boolean): { elapsedMs: number; running: boolean } {
  const [elapsedMs, setElapsedMs] = useState(0);
  const [running, setRunning] = useState(false);
  const accumulatedRef = useRef(0);
  const segmentStartRef = useRef<number | null>(null);

  useEffect(() => {
    const stopSegment = () => {
      if (segmentStartRef.current === null) return;
      accumulatedRef.current += Date.now() - segmentStartRef.current;
      segmentStartRef.current = null;
      setElapsedMs(accumulatedRef.current);
    };

    const startSegment = () => {
      if (segmentStartRef.current !== null) return;
      segmentStartRef.current = Date.now();
    };

    const sync = () => {
      const nextRunning = isTimerRunning(expanded);
      setRunning(nextRunning);
      if (nextRunning) startSegment();
      else stopSegment();
    };

    const tick = () => {
      if (!isTimerRunning(expanded) || segmentStartRef.current === null) return;
      setElapsedMs(accumulatedRef.current + (Date.now() - segmentStartRef.current));
    };

    sync();
    const interval = window.setInterval(tick, 1000);
    document.addEventListener("visibilitychange", sync);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", sync);
      stopSegment();
    };
  }, [expanded]);

  return { elapsedMs, running };
}
