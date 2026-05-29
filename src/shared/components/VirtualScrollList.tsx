import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

export type VirtualScrollListProps<T> = {
  items: T[];
  estimateItemHeight: number;
  overscan?: number;
  className?: string;
  role?: string;
  "aria-live"?: "off" | "polite" | "assertive";
  getItemKey: (item: T, index: number) => string;
  renderItem: (item: T, index: number) => ReactNode;
  footer?: ReactNode;
  onScrollContainerRef?: (el: HTMLDivElement | null) => void;
};

/**
 * Lightweight windowed list (fixed estimate + measured heights). O(visible) DOM nodes.
 */
export function VirtualScrollList<T>({
  items,
  estimateItemHeight,
  overscan = 6,
  className,
  role,
  "aria-live": ariaLive,
  getItemKey,
  renderItem,
  footer,
  onScrollContainerRef,
}: VirtualScrollListProps<T>) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const heightsRef = useRef<Map<string, number>>(new Map());
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportH, setViewportH] = useState(0);

  const setScrollRef = useCallback(
    (el: HTMLDivElement | null) => {
      scrollRef.current = el;
      onScrollContainerRef?.(el);
    },
    [onScrollContainerRef],
  );

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setViewportH(el.clientHeight));
    ro.observe(el);
    setViewportH(el.clientHeight);
    return () => ro.disconnect();
  }, [items.length]);

  const offsets: number[] = [];
  let total = 0;
  for (let i = 0; i < items.length; i++) {
    offsets[i] = total;
    const key = getItemKey(items[i]!, i);
    total += heightsRef.current.get(key) ?? estimateItemHeight;
  }

  let start = 0;
  while (start < items.length && offsets[start]! + (heightsRef.current.get(getItemKey(items[start]!, start)) ?? estimateItemHeight) < scrollTop) {
    start++;
  }
  start = Math.max(0, start - overscan);

  let end = start;
  const bottom = scrollTop + viewportH;
  while (end < items.length && offsets[end]! < bottom) {
    end++;
  }
  end = Math.min(items.length, end + overscan);

  const measureRef = useCallback(
    (key: string, node: HTMLDivElement | null) => {
      if (!node) return;
      const h = node.getBoundingClientRect().height;
      if (h > 0 && heightsRef.current.get(key) !== h) {
        heightsRef.current.set(key, h);
      }
    },
    [],
  );

  const paddingTop = offsets[start] ?? 0;
  const lastVisible = end > 0 ? end - 1 : 0;
  const lastKey = items[lastVisible] ? getItemKey(items[lastVisible]!, lastVisible) : "";
  const paddingBottom = Math.max(0, total - (offsets[lastVisible] ?? 0) - (heightsRef.current.get(lastKey) ?? estimateItemHeight));

  return (
    <div
      ref={setScrollRef}
      className={className}
      role={role}
      aria-live={ariaLive}
      onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
    >
      <div style={{ height: paddingTop }} aria-hidden />
      {items.slice(start, end).map((item, i) => {
        const index = start + i;
        const key = getItemKey(item, index);
        return (
          <div key={key} ref={(node) => measureRef(key, node)}>
            {renderItem(item, index)}
          </div>
        );
      })}
      <div style={{ height: paddingBottom }} aria-hidden />
      {footer}
    </div>
  );
}
