/** Показуємо в `importWarnings`, якщо сніпет переписали під привʼязку до Edit-палітри. */
export const CONSTRUCT_EDIT_AUTOWIRE_WARNING =
  "LAVASH: tied common colors to the Edit palette (--accent-color / --bg-color / --text-color via var fallbacks).";

export type AutowireVisualKind = "jsx" | "html" | "css" | "plain-text";

function looksLikeLiteralColor(v: string): boolean {
  const t = v.trim();
  if (/^#[\da-f]{3,8}$/i.test(t)) return true;
  if (/^rgba?\(/i.test(t)) return true;
  if (/^hsla?\(/i.test(t)) return true;
  return /^(white|black|silver|gray|grey|red|green|blue|yellow|orange|purple|pink|navy|teal|aqua|lime|cyan|magenta|brown|gold|ivory|snow)$/i.test(
    t,
  );
}

/**
 * Переписує вставлений JSX/HTML/CSS так, щоб інжектнутий з Edit-панелі `:root { --accent-color; … }`
 * крутив превʼю. Ідемпотентно для рядків, де вже `var(--accent-color`, тощо.
 */
export function autowireImportedTextForEditPalette(
  text: string,
  visualKind: AutowireVisualKind,
): { text: string; changed: boolean } {
  if (visualKind !== "jsx" && visualKind !== "html" && visualKind !== "css") {
    return { text, changed: false };
  }

  let out = text;
  let changed = false;

  out = out.replace(/--color\s*:\s*([^;]+);/gi, (full, val: string) => {
    const v = val.trim();
    if (/var\s*\(\s*--accent-color\b/i.test(v)) return full;
    changed = true;
    return `--color: var(--accent-color, ${v});`;
  });

  out = out.replace(/fill\s*:\s*(?!var\s*\()([^;]+);/gi, (full, val: string) => {
    const v = val.trim();
    if (/^none$/i.test(v) || /^currentColor$/i.test(v) || /^transparent$/i.test(v) || /^url\s*\(/i.test(v)) {
      return full;
    }
    if (/var\s*\(\s*--accent-color\b/i.test(v)) return full;
    if (!looksLikeLiteralColor(v)) return full;
    changed = true;
    return `fill: var(--accent-color, ${v});`;
  });

  out = out.replace(/\bcolor\s*:\s*(?!var\s*\()([^;]+);/gi, (full, val: string) => {
    const v = val.trim();
    if (/var\s*\(\s*--text-color\b/i.test(v)) return full;
    if (!looksLikeLiteralColor(v)) return full;
    changed = true;
    return `color: var(--text-color, ${v});`;
  });

  out = out.replace(/\bbackground(?:-color)?\s*:\s*(?!var\s*\()([^;]+);/gi, (full, val: string) => {
    const v = val.trim();
    if (/var\s*\(\s*--bg-color\b/i.test(v)) return full;
    if (/gradient|url\s*\(/i.test(v)) return full;
    if (!looksLikeLiteralColor(v)) return full;
    changed = true;
    return `background-color: var(--bg-color, ${v});`;
  });

  return { text: out, changed };
}
