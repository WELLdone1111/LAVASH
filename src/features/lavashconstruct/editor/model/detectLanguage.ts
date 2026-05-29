import type { ImportedVisualKind } from "@/features/lavashconstruct/artboard/model/import";

/** Monaco language id by file extension. */
const EXTENSION_LANGUAGE_MAP: Record<string, string> = {
  ts: "typescript",
  tsx: "typescript",
  mts: "typescript",
  cts: "typescript",
  js: "javascript",
  jsx: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  css: "css",
  scss: "scss",
  sass: "scss",
  less: "less",
  html: "html",
  htm: "html",
  xhtml: "html",
  vue: "html",
  svelte: "html",
  json: "json",
  jsonc: "json",
  md: "markdown",
  mdx: "markdown",
  py: "python",
  pyw: "python",
  pyi: "python",
  rs: "rust",
  go: "go",
  cs: "csharp",
  cpp: "cpp",
  cc: "cpp",
  cxx: "cpp",
  hpp: "cpp",
  h: "cpp",
  c: "c",
  java: "java",
  kt: "kotlin",
  kts: "kotlin",
  php: "php",
  rb: "ruby",
  sh: "shell",
  bash: "shell",
  zsh: "shell",
  fish: "shell",
  ps1: "powershell",
  yaml: "yaml",
  yml: "yaml",
  toml: "ini",
  ini: "ini",
  sql: "sql",
  swift: "swift",
  dart: "dart",
  lua: "lua",
  r: "r",
  ex: "elixir",
  exs: "elixir",
  erl: "erl",
  hs: "haskell",
  ml: "fsharp",
  fs: "fsharp",
  fsx: "fsharp",
  clj: "clojure",
  cljs: "clojure",
  coffee: "coffeescript",
  graphql: "graphql",
  gql: "graphql",
  dockerfile: "dockerfile",
  tf: "hcl",
  hcl: "hcl",
  xml: "xml",
  svg: "xml",
  tex: "latex",
  latex: "latex",
  bib: "bibtex",
  zig: "zig",
  v: "verilog",
  sv: "verilog",
  asm: "asm",
  s: "asm",
  diff: "diff",
  patch: "diff",
  log: "log",
};

export function detectLanguageFromFilename(filename: string): string {
  const base = filename.split(/[/\\]/).pop() ?? filename;
  const lower = base.toLowerCase();

  if (lower === "dockerfile") return "dockerfile";
  if (lower === "makefile") return "makefile";
  if (lower.startsWith(".env")) return "ini";

  const dot = lower.lastIndexOf(".");
  if (dot <= 0) return "plaintext";

  const ext = lower.slice(dot + 1);
  return EXTENSION_LANGUAGE_MAP[ext] ?? "plaintext";
}

export function monacoLanguageFromVisualKind(kind: ImportedVisualKind): string {
  switch (kind) {
    case "jsx":
      return "typescript";
    case "html":
      return "html";
    case "css":
      return "css";
    case "plain-text":
    default:
      return "plaintext";
  }
}

export type ResolveMonacoLanguageInput = {
  filename?: string | null;
  visualKind?: ImportedVisualKind | null;
  /** Optional hint from markdown fence (` ```tsx `). */
  fenceLang?: string | null;
};

export function resolveMonacoLanguage(input: ResolveMonacoLanguageInput): string {
  if (input.filename?.trim()) {
    const fromFile = detectLanguageFromFilename(input.filename.trim());
    if (fromFile !== "plaintext") return fromFile;
  }

  if (input.fenceLang?.trim()) {
    const fence = input.fenceLang.trim().toLowerCase();
    const fromFence = EXTENSION_LANGUAGE_MAP[fence] ?? (fence === "tsx" ? "typescript" : fence === "jsx" ? "javascript" : null);
    if (fromFence) return fromFence;
  }

  if (input.visualKind) {
    return monacoLanguageFromVisualKind(input.visualKind);
  }

  return "plaintext";
}
