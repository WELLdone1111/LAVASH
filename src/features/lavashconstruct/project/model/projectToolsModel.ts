export type GitFileStatus = {
  path: string;
  status: string;
};

export type GitProbeResult = {
  available: boolean;
  version: string | null;
};

export type TerminalProbeResult = {
  available: boolean;
  shell: string;
};

export type DevToolsProbe = {
  terminal: TerminalProbeResult;
  git: GitProbeResult;
};

export function gitStatusMapFromList(rows: GitFileStatus[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const row of rows) {
    map[row.path] = row.status;
  }
  return map;
}

export function formatDevToolsError(error: unknown, fallback: string): string {
  if (typeof error === "string" && error.trim()) return error.trim();
  if (error instanceof Error && error.message.trim()) return error.message.trim();
  return fallback;
}

export function gitStatusLabel(status: string): string {
  const code = status.trim();
  if (code === "??") return "untracked";
  if (code.includes("M")) return "modified";
  if (code.includes("A")) return "added";
  if (code.includes("D")) return "deleted";
  if (code.includes("R")) return "renamed";
  return code || "changed";
}
