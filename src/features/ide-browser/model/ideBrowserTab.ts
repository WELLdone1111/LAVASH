import { buildWebSearchUrl } from "@/features/ide-browser/model/buildWebSearchUrl";
import { getIdeBrowserHomeUrl, isIdeBrowserHomeUrl } from "@/features/ide-browser/model/ideBrowserHomeUrl";

export type IdeBrowserTab = {
  id: string;
  url: string;
  query: string;
  history: string[];
  historyIndex: number;
};

export function createIdeBrowserTab(overrides?: Partial<Pick<IdeBrowserTab, "url" | "query">>): IdeBrowserTab {
  const home = getIdeBrowserHomeUrl();
  const url = overrides?.url ?? home;
  return {
    id: crypto.randomUUID(),
    url,
    query: overrides?.query ?? "",
    history: [url],
    historyIndex: 0,
  };
}

export function queryFromSearchUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("google.") && parsed.pathname === "/search") {
      return parsed.searchParams.get("q") ?? "";
    }
  } catch {
    /* invalid url */
  }
  return "";
}

export function getIdeBrowserTabLabel(tab: IdeBrowserTab, defaultLabel: string): string {
  const q = tab.query.trim() || queryFromSearchUrl(tab.url).trim();
  if (q) return q;
  if (isIdeBrowserHomeUrl(tab.url)) return defaultLabel;
  try {
    return new URL(tab.url).hostname;
  } catch {
    return defaultLabel;
  }
}

export function canIdeBrowserGoBack(tab: IdeBrowserTab): boolean {
  return tab.historyIndex > 0;
}

export function canIdeBrowserGoForward(tab: IdeBrowserTab): boolean {
  return tab.historyIndex < tab.history.length - 1;
}

export function pushIdeBrowserHistory(tab: IdeBrowserTab, url: string, query = ""): IdeBrowserTab {
  const nextUrl = url.trim() || getIdeBrowserHomeUrl();
  const truncated = tab.history.slice(0, tab.historyIndex + 1);
  const last = truncated[truncated.length - 1];
  const history = last === nextUrl ? truncated : [...truncated, nextUrl];
  return {
    ...tab,
    url: nextUrl,
    query,
    history,
    historyIndex: history.length - 1,
  };
}

export function ideBrowserGoBack(tab: IdeBrowserTab): IdeBrowserTab | null {
  if (!canIdeBrowserGoBack(tab)) return null;
  const historyIndex = tab.historyIndex - 1;
  const url = tab.history[historyIndex] ?? getIdeBrowserHomeUrl();
  return {
    ...tab,
    historyIndex,
    url,
    query: queryFromSearchUrl(url),
  };
}

export function ideBrowserGoForward(tab: IdeBrowserTab): IdeBrowserTab | null {
  if (!canIdeBrowserGoForward(tab)) return null;
  const historyIndex = tab.historyIndex + 1;
  const url = tab.history[historyIndex] ?? getIdeBrowserHomeUrl();
  return {
    ...tab,
    historyIndex,
    url,
    query: queryFromSearchUrl(url),
  };
}

export function navigateIdeBrowserTab(tab: IdeBrowserTab, raw: string): IdeBrowserTab {
  const next = buildWebSearchUrl(raw);
  return pushIdeBrowserHistory(tab, next, "");
}

export function searchIdeBrowserTab(tab: IdeBrowserTab, rawQuery: string): IdeBrowserTab {
  const trimmed = rawQuery.trim();
  const url = buildWebSearchUrl(trimmed);
  return pushIdeBrowserHistory(tab, url, trimmed);
}

export function goIdeBrowserHome(tab: IdeBrowserTab): IdeBrowserTab {
  return pushIdeBrowserHistory({ ...tab, query: "" }, getIdeBrowserHomeUrl());
}

export function ideBrowserGoToHistoryIndex(tab: IdeBrowserTab, index: number): IdeBrowserTab | null {
  if (index < 0 || index >= tab.history.length) return null;
  const url = tab.history[index] ?? getIdeBrowserHomeUrl();
  return {
    ...tab,
    historyIndex: index,
    url,
    query: queryFromSearchUrl(url),
  };
}

export type IdeBrowserHistoryEntry = {
  index: number;
  url: string;
  label: string;
  isCurrent: boolean;
};

export function getIdeBrowserHistoryEntries(tab: IdeBrowserTab, defaultLabel: string): IdeBrowserHistoryEntry[] {
  return tab.history.map((entryUrl, index) => ({
    index,
    url: entryUrl,
    label: getIdeBrowserHistoryEntryLabel(entryUrl, defaultLabel),
    isCurrent: index === tab.historyIndex,
  }));
}

export function getIdeBrowserHistoryEntryLabel(url: string, defaultLabel: string): string {
  const q = queryFromSearchUrl(url).trim();
  if (q) return q;
  if (isIdeBrowserHomeUrl(url)) return defaultLabel;
  try {
    const parsed = new URL(url);
    const path = parsed.pathname === "/" ? "" : parsed.pathname;
    return `${parsed.hostname}${path}`;
  } catch {
    return url;
  }
}
