import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useI18n } from "@/i18n/context";
import {
  isFileMenuActionEnabled,
  runFileMenuAction,
  type FileMenuActionId,
} from "@/features/file-menu/model/fileMenuBus";

type MenuItemDef = {
  id: FileMenuActionId;
  labelKey: string;
  shortcut?: string;
  separatorBefore?: boolean;
};

const MENU_ITEMS: MenuItemDef[] = [
  { id: "newTextFile", labelKey: "file.menu.newTextFile", shortcut: "Ctrl+N" },
  { id: "newLavashDocument", labelKey: "file.menu.newLavashDocument", shortcut: "Ctrl+Shift+N" },
  { id: "newWindow", labelKey: "file.menu.newWindow" },
  { id: "newAgentsWindow", labelKey: "file.menu.newAgentsWindow" },
  { id: "openLavashDocument", labelKey: "file.menu.openLavashDocument", shortcut: "Ctrl+O", separatorBefore: true },
  { id: "openFile", labelKey: "file.menu.openFile" },
  { id: "openFolder", labelKey: "file.menu.openFolder", shortcut: "Ctrl+M Ctrl+O" },
  { id: "import", labelKey: "file.menu.import", shortcut: "Ctrl+I", separatorBefore: true },
  { id: "export", labelKey: "file.menu.export", shortcut: "Ctrl+E" },
  { id: "save", labelKey: "file.menu.save", shortcut: "Ctrl+S", separatorBefore: true },
  { id: "saveAs", labelKey: "file.menu.saveAs", shortcut: "Ctrl+Shift+S" },
];

const SHORTCUT_ACTION: Record<string, FileMenuActionId> = {
  "ctrl+n": "newTextFile",
  "ctrl+shift+n": "newLavashDocument",
  "ctrl+o": "openLavashDocument",
  "ctrl+i": "import",
  "ctrl+e": "export",
  "ctrl+s": "save",
  "ctrl+shift+s": "saveAs",
};

function shortcutKey(event: KeyboardEvent): string {
  const parts: string[] = [];
  if (event.ctrlKey || event.metaKey) parts.push("ctrl");
  if (event.shiftKey) parts.push("shift");
  if (event.altKey) parts.push("alt");
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key.toLowerCase();
  if (!["control", "shift", "alt", "meta"].includes(key)) parts.push(key);
  return parts.join("+");
}

export default function WindowFileMenu() {
  const { t } = useI18n();
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);

  const close = useCallback(() => setOpen(false), []);

  const run = useCallback(
    (id: FileMenuActionId) => {
      if (!isFileMenuActionEnabled(id)) return;
      runFileMenuAction(id);
      close();
    },
    [close],
  );

  useEffect(() => {
    if (!open) return;
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

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const action = SHORTCUT_ACTION[shortcutKey(event)];
      if (!action) return;
      if (!isFileMenuActionEnabled(action)) return;
      event.preventDefault();
      runFileMenuAction(action);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div ref={rootRef} className="app-window-file-menu">
      <button
        type="button"
        className="app-window-file-menu__trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        data-tauri-drag-region="false"
        onClick={() => setOpen((value) => !value)}
      >
        {t("file.menu.label")}
      </button>
      {open ? (
        <div id={menuId} className="app-window-file-menu__dropdown" role="menu">
          {MENU_ITEMS.map((item) => {
            const enabled = isFileMenuActionEnabled(item.id);
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
