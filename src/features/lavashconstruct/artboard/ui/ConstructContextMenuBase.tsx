import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import "./ConstructArtboardContextMenu.css";

export type ConstructContextMenuItemDef = {
  id: string;
  label: string;
  shortcut?: string;
  disabled?: boolean;
  danger?: boolean;
  accent?: boolean;
  onSelect?: () => void;
  children?: ConstructContextMenuItemDef[];
};

export type ConstructContextMenuSectionDef = {
  /** Uppercase section label, e.g. GENERATE */
  heading?: string;
  items: ConstructContextMenuItemDef[];
};

export type ConstructContextMenuBaseProps = {
  x: number;
  y: number;
  width?: number;
  estimatedHeight?: number;
  title?: ReactNode;
  sections: ConstructContextMenuSectionDef[];
  onClose: () => void;
};

function clampMenuPosition(x: number, y: number, width: number, height: number) {
  const adjustedX = x + width > window.innerWidth ? Math.max(8, x - width) : x;
  const adjustedY = y + height > window.innerHeight ? Math.max(8, y - height) : y;
  return { x: adjustedX, y: adjustedY };
}

function ContextMenuItemRow({
  item,
  onClose,
}: {
  item: ConstructContextMenuItemDef;
  onClose: () => void;
}) {
  const [subOpen, setSubOpen] = useState(false);
  const rowRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!subOpen) return;
    const onPointer = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (rowRef.current?.contains(target)) return;
      setSubOpen(false);
    };
    window.addEventListener("pointerdown", onPointer, true);
    return () => window.removeEventListener("pointerdown", onPointer, true);
  }, [subOpen]);

  const hasChildren = Boolean(item.children?.length);
  const className = [
    "lc-artboard-context-menu__item",
    item.danger ? "lc-artboard-context-menu__item--danger" : "",
    item.accent ? "lc-artboard-context-menu__item--lavash" : "",
    item.disabled ? "lc-artboard-context-menu__item--disabled" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const run = () => {
    if (item.disabled || hasChildren) return;
    item.onSelect?.();
    onClose();
  };

  return (
    <div className="lc-artboard-context-menu__row">
      <button
        ref={rowRef}
        type="button"
        className={className}
        role="menuitem"
        disabled={item.disabled && !hasChildren}
        aria-haspopup={hasChildren ? "menu" : undefined}
        aria-expanded={hasChildren ? subOpen : undefined}
        onClick={() => {
          if (hasChildren) {
            setSubOpen((open) => !open);
            return;
          }
          run();
        }}
        onMouseEnter={() => {
          if (hasChildren) setSubOpen(true);
        }}
      >
        <span className="lc-artboard-context-menu__label">{item.label}</span>
        {item.shortcut ? (
          <span className="lc-artboard-context-menu__shortcut">{item.shortcut}</span>
        ) : hasChildren ? (
          <ChevronRight size={14} className="lc-artboard-context-menu__chevron" aria-hidden />
        ) : null}
      </button>
      {hasChildren && subOpen ? (
        <div className="lc-artboard-context-menu__submenu" role="menu">
          {item.children!.map((child) => (
            <button
              key={child.id}
              type="button"
              className="lc-artboard-context-menu__item"
              role="menuitem"
              disabled={child.disabled}
              onClick={() => {
                if (child.disabled) return;
                child.onSelect?.();
                onClose();
              }}
            >
              <span className="lc-artboard-context-menu__label">{child.label}</span>
              {child.shortcut ? (
                <span className="lc-artboard-context-menu__shortcut">{child.shortcut}</span>
              ) : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default function ConstructContextMenuBase({
  x,
  y,
  width = 248,
  estimatedHeight = 320,
  title,
  sections,
  onClose,
}: ConstructContextMenuBaseProps) {
  const ref = useRef<HTMLDivElement>(null);
  const pos = clampMenuPosition(x, y, width, estimatedHeight);

  useEffect(() => {
    const onPointer = (event: PointerEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) onClose();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("pointerdown", onPointer, true);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer, true);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="lc-artboard-context-menu"
      style={{ left: pos.x, top: pos.y, width }}
      role="menu"
    >
      {title ? <div className="lc-artboard-context-menu__title">{title}</div> : null}
      {sections.map((section, sectionIndex) => (
        <div key={section.heading ?? `section-${sectionIndex}`}>
          {sectionIndex > 0 ? <div className="lc-artboard-context-menu__sep" aria-hidden /> : null}
          {section.heading ? (
            <div className="lc-artboard-context-menu__heading">{section.heading}</div>
          ) : null}
          {section.items.map((item) => (
            <ContextMenuItemRow key={item.id} item={item} onClose={onClose} />
          ))}
        </div>
      ))}
    </div>
  );
}
