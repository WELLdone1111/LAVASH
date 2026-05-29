export const IDE_BROWSER_HOME_PATH = "/ide-browser/google-search.html";

/** Повний URL для iframe (same-origin з головним WebView). */
export function getIdeBrowserHomeUrl(): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    return `${window.location.origin}${IDE_BROWSER_HOME_PATH}`;
  }
  return IDE_BROWSER_HOME_PATH;
}

export function isIdeBrowserHomeUrl(url: string): boolean {
  try {
    const parsed = new URL(url, typeof window !== "undefined" ? window.location.origin : "http://localhost");
    return parsed.pathname.endsWith(IDE_BROWSER_HOME_PATH);
  } catch {
    return url.includes(IDE_BROWSER_HOME_PATH);
  }
}

/** Child WebView лише для зовнішніх сайтів (Google results тощо). Home — iframe. */
export function needsIdeBrowserNativeWebview(url: string): boolean {
  if (!url.trim()) return false;
  return !isIdeBrowserHomeUrl(url);
}
