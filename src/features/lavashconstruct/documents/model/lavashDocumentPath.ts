export function isLavashDocumentPath(pathOrName: string): boolean {
  const lower = pathOrName.toLowerCase().replace(/\\/g, "/");
  return lower.endsWith(".lavash.json") || lower.endsWith(".lavash");
}

export function lavashDocumentDisplayName(absolutePath: string): string {
  const base = absolutePath.replace(/\\/g, "/").split("/").pop() ?? absolutePath;
  return base.replace(/\.lavash\.json$/i, "").replace(/\.lavash$/i, "") || "LAVASH";
}
