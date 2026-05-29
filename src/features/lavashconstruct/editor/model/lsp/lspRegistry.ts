/** Maps Monaco language id → LSP server registry key (Rust `lsp_start`). */
const MONACO_TO_LSP: Record<string, string> = {
  typescript: "typescript",
  javascript: "javascript",
  html: "html",
  css: "css",
  scss: "css",
  less: "css",
  json: "json",
  python: "python",
  rust: "rust",
  go: "go",
  csharp: "csharp",
  cpp: "cpp",
  c: "cpp",
  java: "java",
  php: "php",
  ruby: "ruby",
};

export function lspServerKeyForMonacoLanguage(language: string): string | null {
  return MONACO_TO_LSP[language] ?? null;
}

export function lspSupportsLanguage(language: string): boolean {
  return lspServerKeyForMonacoLanguage(language) !== null;
}

export function workspaceRelativePath(documentId: string, language: string): string {
  const safeId = documentId.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 120);
  const ext = extensionForLanguage(language);
  return `documents/${safeId}${ext}`;
}

function extensionForLanguage(language: string): string {
  switch (language) {
    case "typescript":
      return ".tsx";
    case "javascript":
      return ".jsx";
    case "html":
      return ".html";
    case "css":
    case "scss":
    case "less":
      return ".css";
    case "json":
      return ".json";
    case "python":
      return ".py";
    case "rust":
      return ".rs";
    case "go":
      return ".go";
    case "csharp":
      return ".cs";
    case "cpp":
    case "c":
      return ".cpp";
    case "java":
      return ".java";
    case "php":
      return ".php";
    case "ruby":
      return ".rb";
    default:
      return ".txt";
  }
}
