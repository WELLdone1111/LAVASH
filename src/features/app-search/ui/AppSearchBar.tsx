import { Search } from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
} from "react";
import { useI18n } from "@/i18n/context";
import { APP_SEARCH_FOCUS_INPUT_EVENT } from "@/features/app-search/model/appSearchBus";
import { useStaticAppSearchItems } from "@/features/app-search/model/useStaticAppSearchItems";
import { useAppSearchStore } from "@/features/app-search/model/appSearchStore";
import type { AppSearchItem } from "@/features/app-search/model/types";
import "./AppSearchBar.css";

type AppSearchBarProps = {
  className?: string;
};

function normalizeQuery(value: string): string {
  return value.trim().toLowerCase();
}

function itemMatches(item: AppSearchItem, query: string): boolean {
  if (!query) return true;
  const haystack = [item.title, item.subtitle, ...(item.keywords ?? [])]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(query);
}

function groupResults(items: AppSearchItem[]): { group: string; items: AppSearchItem[] }[] {
  const map = new Map<string, AppSearchItem[]>();
  for (const item of items) {
    const bucket = map.get(item.group);
    if (bucket) bucket.push(item);
    else map.set(item.group, [item]);
  }
  return [...map.entries()].map(([group, groupItems]) => ({ group, items: groupItems }));
}

export default function AppSearchBar({ className }: AppSearchBarProps) {
  const { t } = useI18n();
  const listId = useId();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const staticItems = useStaticAppSearchItems();
  const dynamicItems = useAppSearchStore((state) => state.dynamicItems);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const allItems = useMemo(() => [...dynamicItems, ...staticItems], [dynamicItems, staticItems]);

  const visibleItems = useMemo(() => {
    const q = normalizeQuery(query);
    return allItems.filter((item) => (item.enabled ? item.enabled() : true) && itemMatches(item, q)).slice(0, 24);
  }, [allItems, query]);

  const grouped = useMemo(() => groupResults(visibleItems), [visibleItems]);

  const flatVisible = visibleItems;

  const close = useCallback(() => {
    setOpen(false);
    setActiveIndex(0);
  }, []);

  const runItem = useCallback(
    (item: AppSearchItem) => {
      item.run();
      setQuery("");
      close();
      inputRef.current?.blur();
    },
    [close],
  );

  useEffect(() => {
    const onFocusInput = () => {
      inputRef.current?.focus();
      setOpen(true);
    };
    window.addEventListener(APP_SEARCH_FOCUS_INPUT_EVENT, onFocusInput);
    return () => window.removeEventListener(APP_SEARCH_FOCUS_INPUT_EVENT, onFocusInput);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      const mod = event.ctrlKey || event.metaKey;
      if (mod && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) close();
    };
    window.addEventListener("pointerdown", onPointerDown, true);
    return () => window.removeEventListener("pointerdown", onPointerDown, true);
  }, [open, close]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query, visibleItems.length]);

  const onInputKeyDown: NonNullable<ComponentProps<"input">["onKeyDown"]> = (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      setQuery("");
      close();
      inputRef.current?.blur();
      return;
    }
    if (!open || flatVisible.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % flatVisible.length);
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => (index - 1 + flatVisible.length) % flatVisible.length);
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      const item = flatVisible[activeIndex];
      if (item) runItem(item);
    }
  };

  let optionIndex = -1;

  return (
    <div
      ref={rootRef}
      className={`app-search-bar${className ? ` ${className}` : ""}`}
      data-open={open ? "true" : undefined}
      data-tauri-drag-region="false"
    >
      <label className="app-search-bar__field">
        <Search size={14} strokeWidth={1.75} aria-hidden />
        <input
          ref={inputRef}
          type="search"
          className="app-search-bar__input"
          value={query}
          placeholder={t("appSearch.placeholder")}
          aria-label={t("appSearch.aria")}
          aria-expanded={open}
          aria-controls={open ? listId : undefined}
          aria-autocomplete="list"
          role="combobox"
          data-tauri-drag-region="false"
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onInputKeyDown}
        />
        <kbd className="app-search-bar__hint" aria-hidden>
          {t("appSearch.shortcut")}
        </kbd>
      </label>

      {open ? (
        <div className="app-search-bar__dropdown" role="presentation">
          <ul id={listId} className="app-search-bar__list" role="listbox" aria-label={t("appSearch.resultsAria")}>
            {flatVisible.length === 0 ? (
              <li className="app-search-bar__empty">{t("appSearch.empty")}</li>
            ) : (
              grouped.map(({ group, items }) => (
                <li key={group} className="app-search-bar__group" role="presentation">
                  <div className="app-search-bar__group-label">{group}</div>
                  <ul className="app-search-bar__group-list" role="group" aria-label={group}>
                    {items.map((item) => {
                      optionIndex += 1;
                      const index = optionIndex;
                      const active = index === activeIndex;
                      return (
                        <li key={item.id} role="presentation">
                          <button
                            type="button"
                            className={`app-search-bar__item${active ? " app-search-bar__item--active" : ""}`}
                            role="option"
                            aria-selected={active}
                            onMouseEnter={() => setActiveIndex(index)}
                            onClick={() => runItem(item)}
                          >
                            <span className="app-search-bar__item-title">{item.title}</span>
                            {item.subtitle ? (
                              <span className="app-search-bar__item-meta">{item.subtitle}</span>
                            ) : null}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </li>
              ))
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
