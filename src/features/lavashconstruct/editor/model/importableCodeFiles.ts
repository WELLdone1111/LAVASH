/** Розширення, для яких артборд вміє iframe-превью (HTML/CSS/JSX). */
export const ARTBOARD_PREVIEW_FILE_EXTENSIONS = new Set([
  "html",
  "htm",
  "xhtml",
  "css",
  "scss",
  "sass",
  "less",
  "js",
  "jsx",
  "mjs",
  "cjs",
  "ts",
  "tsx",
  "mts",
  "cts",
  "vue",
  "svelte",
]);

/** Усі текстові / кодові розширення для drag-drop і open dialog (синхрон з Monaco map). */
export const IMPORTABLE_TEXT_FILE_EXTENSIONS = new Set([
  ...ARTBOARD_PREVIEW_FILE_EXTENSIONS,
  "json",
  "jsonc",
  "md",
  "mdx",
  "py",
  "pyw",
  "pyi",
  "rs",
  "go",
  "cs",
  "cpp",
  "cc",
  "cxx",
  "hpp",
  "h",
  "c",
  "java",
  "kt",
  "kts",
  "php",
  "rb",
  "sh",
  "bash",
  "zsh",
  "fish",
  "ps1",
  "yaml",
  "yml",
  "toml",
  "ini",
  "sql",
  "swift",
  "dart",
  "lua",
  "r",
  "ex",
  "exs",
  "erl",
  "hs",
  "ml",
  "fs",
  "fsx",
  "clj",
  "cljs",
  "coffee",
  "graphql",
  "gql",
  "dockerfile",
  "tf",
  "hcl",
  "xml",
  "svg",
  "tex",
  "latex",
  "bib",
  "zig",
  "v",
  "sv",
  "asm",
  "s",
  "diff",
  "patch",
  "log",
  "txt",
  "csv",
  "env",
  "properties",
  "gradle",
  "cmake",
  "makefile",
]);

export function normalizeFileExtension(ext: string): string {
  const trimmed = ext.trim().toLowerCase().replace(/^\./, "");
  if (trimmed === "c++") return "cpp";
  return trimmed;
}

export function isImportableTextFileExtension(ext: string): boolean {
  const normalized = normalizeFileExtension(ext);
  if (!normalized) return false;
  if (IMPORTABLE_TEXT_FILE_EXTENSIONS.has(normalized)) return true;
  if (normalized === "dockerfile" || normalized === "makefile") return true;
  return false;
}

export function isImportableTextFileName(filename: string): boolean {
  const base = filename.split(/[/\\]/).pop() ?? filename;
  const lower = base.toLowerCase();
  if (lower === "dockerfile" || lower === "makefile") return true;
  const dot = lower.lastIndexOf(".");
  if (dot <= 0) return false;
  return isImportableTextFileExtension(lower.slice(dot + 1));
}

/** Розширення з імені файлу (включно з Dockerfile / Makefile без крапки). */
export function extractImportableFileExtension(fileName: string): string {
  const base = fileName.split(/[/\\]/).pop() ?? fileName;
  const lower = base.toLowerCase();
  if (lower === "dockerfile") return "dockerfile";
  if (lower === "makefile") return "makefile";
  const dot = lower.lastIndexOf(".");
  if (dot <= 0) return "asset";
  return lower.slice(dot + 1);
}

/** `accept` для `<input type="file">` — усі підтримувані кодові розширення. */
export function buildImportFileAcceptAttribute(): string {
  const dotted = [...IMPORTABLE_TEXT_FILE_EXTENSIONS].map((ext) => `.${ext}`);
  return [...dotted, "application/json", "text/*", "image/*", ".lavash"].join(",");
}

/** Ім'я файлу з розширенням для Monaco (`detectLanguageFromFilename`). */
export function displayFilenameForImportedTextFile(fileName: string, ext: string): string {
  const base = fileName.trim() || "snippet";
  const normalized = normalizeFileExtension(ext);
  if (!normalized || normalized === "asset") return base;
  if (normalized === "dockerfile") {
    if (base.toLowerCase() === "dockerfile") return "Dockerfile";
    if (base.toLowerCase().endsWith(".dockerfile")) return base;
    return `${base}.dockerfile`;
  }
  if (normalized === "makefile") {
    if (base.toLowerCase() === "makefile") return "Makefile";
    if (base.toLowerCase().endsWith(".makefile")) return base;
    return `${base}.makefile`;
  }
  if (base.toLowerCase().endsWith(`.${normalized}`)) return base;
  return `${base}.${normalized}`;
}
