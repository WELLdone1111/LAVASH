import { useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import { useI18n } from "@/i18n/context";
import type { ConstructLibraryItem } from "@/features/lavashconstruct/shared/model/libraryItem";

export const CONSTRUCT_USER_LIB_DRAG_MIME = "application/x-lc-user-lib-item";

type ConstructUserLibPanelProps = {
  items: ConstructLibraryItem[];
  onRemove: (itemId: string) => void;
  onInsertToArtboard: (item: ConstructLibraryItem) => void;
  /** Якщо false — заголовок не показується (наприклад, зовнішній заголовок рамки ЛавашКонструкт). */
  showTitle?: boolean;
};

export default function ConstructUserLibPanel(props: ConstructUserLibPanelProps) {
  const { t } = useI18n();
  const showTitle = props.showTitle !== false;
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return props.items;
    return props.items.filter((item) => {
      const hay = `${item.title} ${item.keywords.join(" ")} ${item.category}`.toLowerCase();
      return hay.includes(q);
    });
  }, [props.items, query]);

  return (
    <div className="lc-left-panel lc-user-lib">
      {showTitle ? <h3>{t("construct.userLib.title")}</h3> : null}
      <input
        type="search"
        className="lc-user-lib__search"
        placeholder={t("construct.userLib.searchPh")}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        spellCheck={false}
      />
      <div className="lc-list-scroll-shell">
        {filtered.length === 0 ? (
          <p className="lc-user-lib__empty">
            {props.items.length === 0 ? t("construct.userLib.empty") : t("construct.userLib.noMatches")}
          </p>
        ) : (
          <div role="list" className="lc-list">
            {filtered.map((item) => (
              <div key={item.id} className="lc-library-item lc-library-item--user-row">
                <button
                  type="button"
                  draggable
                  className="lc-library-template-button"
                  onDoubleClick={() => props.onInsertToArtboard(item)}
                  onDragStart={(event) => {
                    event.dataTransfer.setData(CONSTRUCT_USER_LIB_DRAG_MIME, item.id);
                    event.dataTransfer.effectAllowed = "copy";
                  }}
                >
                  <span className="lc-library-template-title">{item.title}</span>
                  <span className="lc-library-template-meta">
                    {item.defaultWidth} × {item.defaultHeight}
                    {item.kind === "element" ? t("construct.userLib.metaElement") : ""}
                  </span>
                </button>
                <button
                  type="button"
                  className="lc-library-user-remove"
                  aria-label={t("construct.userLib.remove", { title: item.title })}
                  onClick={() => props.onRemove(item.id)}
                >
                  <Trash2 className="lc-library-user-remove-icon" size={18} strokeWidth={1.75} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
