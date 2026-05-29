import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useI18n } from "@/i18n/context";
import {
  isEditMenuActionEnabled,
  runEditMenuAction,
  type EditMenuActionId,
} from "@/features/edit-menu/model/editMenuBus";

type MenuItemDef = {
  id: EditMenuActionId;
  labelKey: string;
  shortcut?: string;
  separatorBefore?: boolean;
};

const MENU_ITEMS: MenuItemDef[] = [
  { id: "undo", labelKey: "edit.menu.undo", shortcut: "Ctrl+Z" },
  { id: "redo", labelKey: "edit.menu.redo", shortcut: "Ctrl+Y" },
  { id: "cut", labelKey: "edit.menu.cut", shortcut: "Ctrl+X", separatorBefore: true },
  { id: "copy", labelKey: "edit.menu.copy", shortcut: "Ctrl+C" },
  { id: "paste", labelKey: "edit.menu.paste", shortcut: "Ctrl+V" },
];

export default function WindowEditMenu() {
  const { t } = useI18n();
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [, tick] = useState(0);

  const close = useCallback(() => setOpen(false), []);

  const run = useCallback(
    (id: EditMenuActionId) => {
      if (!isEditMenuActionEnabled(id)) return;
      runEditMenuAction(id);
      close();
    },
    [close],
  );

  useEffect(() => {
    if (!open) return;
    tick((n) => n + 1);
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) close();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("pointerdown", onPointerDown, true);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown, true);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [close, open]);

  return (
    <div ref={rootRef} className="app-window-file-menu app-window-edit-menu">
      <button
        type="button"
        className="app-window-file-menu__trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        data-tauri-drag-region="false"
        onClick={() => setOpen((value) => !value)}
      >
        {t("edit.menu.label")}
      </button>
      {open ? (
        <div id={menuId} className="app-window-file-menu__dropdown" role="menu">
          {MENU_ITEMS.map((item) => {
            const enabled = isEditMenuActionEnabled(item.id);
            return (
              <div key={item.id}>
                {item.separatorBefore ? <div className="app-window-file-menu__sep" role="separator" /> : null}
                <button
                  type="button"
                  role="menuitem"
                  className="app-window-file-menu__item"
                  disabled={!enabled}
                  onClick={() => run(item.id)}
                >
                  <span className="app-window-file-menu__item-label">{t(item.labelKey)}</span>
                  {item.shortcut ? (
                    <span className="app-window-file-menu__item-shortcut" aria-hidden>
                      {item.shortcut}
                    </span>
                  ) : null}
                </button>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
