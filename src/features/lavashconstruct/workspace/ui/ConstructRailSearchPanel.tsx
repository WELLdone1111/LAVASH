import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { useI18n } from "@/i18n/context";
import type { ArtboardPanel } from "@/features/lavashconstruct/artboard/ui/types";

type ConstructRailSearchPanelProps = {
  panels: ArtboardPanel[];
  onSelectPanel: (id: string) => void;
  onFocusPanel: (id: string) => void;
};

export default function ConstructRailSearchPanel({
  panels,
  onSelectPanel,
  onFocusPanel,
}: ConstructRailSearchPanelProps) {
  const { t } = useI18n();
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return panels.slice(0, 12);
    return panels.filter((panel) => panel.title.toLowerCase().includes(q)).slice(0, 24);
  }, [panels, query]);

  return (
    <div className="lc-rail-search">
      <label className="lc-rail-search__field">
        <Search size={15} strokeWidth={1.75} aria-hidden />
        <input
          type="search"
          className="lc-rail-search__input"
          placeholder={t("construct.rail.searchPlaceholder")}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          autoFocus
        />
      </label>
      <ul className="lc-rail-search__list" role="listbox" aria-label={t("construct.rail.searchResultsAria")}>
        {results.length === 0 ? (
          <li className="lc-rail-search__empty">{t("construct.rail.searchEmpty")}</li>
        ) : (
          results.map((panel) => (
            <li key={panel.id}>
              <button
                type="button"
                className="lc-rail-search__item"
                role="option"
                onClick={() => {
                  onSelectPanel(panel.id);
                  onFocusPanel(panel.id);
                }}
              >
                <span className="lc-rail-search__item-title">{panel.title}</span>
                <span className="lc-rail-search__item-meta">z:{panel.zIndex}</span>
              </button>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
