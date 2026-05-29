import type { Locale } from "./locale";
import { readStoredLocale } from "./locale";
import { STRINGS_EN } from "./strings.en";
import { STRINGS_RU } from "./strings.ru";
import { STRINGS_UK } from "./strings.uk";

const bundles: Record<Locale, Record<string, string>> = {
  en: STRINGS_EN,
  uk: STRINGS_UK,
  ru: STRINGS_RU,
};

function applyVars(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  let out = template;
  for (const [k, v] of Object.entries(vars)) {
    out = out.split(`{{${k}}}`).join(String(v));
  }
  return out;
}

/** Без React: iframe/bootstrap — locale з localStorage якщо не передали */
export function translateBare(
  key: string,
  locale?: Locale,
  vars?: Record<string, string | number>,
): string {
  const lng = locale ?? readStoredLocale();
  const raw = bundles[lng][key] ?? bundles.en[key] ?? key;
  return applyVars(raw, vars);
}
