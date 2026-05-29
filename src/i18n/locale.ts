export type Locale = "en" | "uk" | "ru";

export const LOCALE_STORAGE_KEY = "lavash-locale";

export function readStoredLocale(): Locale {
  if (typeof localStorage === "undefined") return "en";
  const s = localStorage.getItem(LOCALE_STORAGE_KEY);
  if (s === "uk" || s === "ru") return s;
  return "en";
}
