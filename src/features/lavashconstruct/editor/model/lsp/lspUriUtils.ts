/** file:///C:/path/to/file.ts → path string */
export function lspUriToRelativePath(uri: string): string | null {
  try {
    const parsed = new URL(uri);
    if (parsed.protocol !== "file:") return null;
    let path = decodeURIComponent(parsed.pathname);
    if (/^\/[A-Za-z]:\//.test(path)) {
      path = path.slice(1);
    }
    return path.replace(/\\/g, "/");
  } catch {
    return null;
  }
}
