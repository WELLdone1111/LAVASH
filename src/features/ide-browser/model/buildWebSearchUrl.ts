import { getIdeBrowserHomeUrl } from "@/features/ide-browser/model/ideBrowserHomeUrl";

const URL_LIKE = /^(https?:\/\/|[a-z0-9-]+(\.[a-z0-9-]+)+([/?#]|$))/i;

/** Результати Google Search (темна тема підхоплюється WebView2 + cookies). */
export function buildGoogleSearchUrl(query: string): string {
  const q = query.trim();
  if (!q) return getIdeBrowserHomeUrl();
  return `https://www.google.com/search?q=${encodeURIComponent(q)}`;
}

/** Google search, прямий URL або домашня сторінка. */
export function buildWebSearchUrl(raw: string): string {
  const query = raw.trim();
  if (!query) return getIdeBrowserHomeUrl();
  if (/^https?:\/\//i.test(query)) return query;
  if (URL_LIKE.test(query) && !query.includes(" ")) {
    return query.startsWith("http") ? query : `https://${query}`;
  }
  return buildGoogleSearchUrl(query);
}
