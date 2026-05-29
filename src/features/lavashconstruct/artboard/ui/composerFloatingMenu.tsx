import { createPortal } from "react-dom";
import {
  forwardRef,
  useEffect,
  useLayoutEffect,
  useState,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from "react";

export function useComposerMenuDismiss(
  containerRef: RefObject<HTMLElement | null>,
  open: boolean,
  onDismiss: () => void,
  /** Portaled menu root — clicks inside must not dismiss before option handlers run. */
  menuRef?: RefObject<HTMLElement | null>,
) {
  useEffect(() => {
    if (!open) return;
    let listening = false;
    const onDoc = (event: MouseEvent) => {
      if (!listening) return;
      const target = event.target as Node;
      if (containerRef.current?.contains(target)) return;
      if (menuRef?.current?.contains(target)) return;
      onDismiss();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onDismiss();
    };
    const id = window.setTimeout(() => {
      listening = true;
      document.addEventListener("mousedown", onDoc);
    }, 0);
    document.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(id);
      listening = false;
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [containerRef, menuRef, onDismiss, open]);
}

export function useFloatingMenuRect(open: boolean, anchorRef: RefObject<HTMLElement | null>) {
  const [rect, setRect] = useState<DOMRect | null>(null);

  useLayoutEffect(() => {
    if (!open) {
      setRect(null);
      return;
    }
    const el = anchorRef.current;
    if (!el) return;

    const sync = () => {
      if (anchorRef.current) setRect(anchorRef.current.getBoundingClientRect());
    };

    sync();
    window.addEventListener("resize", sync);
    window.addEventListener("scroll", sync, true);
    return () => {
      window.removeEventListener("resize", sync);
      window.removeEventListener("scroll", sync, true);
    };
  }, [anchorRef, open]);

  return rect;
}

export const ComposerFloatingMenu = forwardRef<
  HTMLUListElement,
  {
    open: boolean;
    anchorRef: RefObject<HTMLElement | null>;
    className?: string;
    role?: string;
    ariaLabel?: string;
    minWidth?: number;
    children: ReactNode;
  }
>(function ComposerFloatingMenu(props, ref) {
  const rect = useFloatingMenuRect(props.open, props.anchorRef);
  if (!props.open || !rect) return null;

  const style: CSSProperties = {
    position: "fixed",
    left: rect.left,
    bottom: window.innerHeight - rect.top + 6,
    minWidth: Math.max(rect.width, props.minWidth ?? 140),
    maxWidth: "min(320px, calc(100vw - 16px))",
  };

  return createPortal(
    <ul
      ref={ref}
      className={props.className}
      role={props.role}
      aria-label={props.ariaLabel}
      style={style}
    >
      {props.children}
    </ul>,
    document.body,
  );
});
