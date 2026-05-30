export type PythonProbeResult = {
  available: boolean;
  pythonVersion: string | null;
  pythonPath: string | null;
  uvVersion: string | null;
  updateAvailable: boolean;
};

export type PythonEnsureResult = {
  pythonPath: string;
  pythonVersion: string;
  uvVersion: string;
  pyrightPath: string | null;
};

export function formatPythonRuntimeError(error: unknown, fallback: string): string {
  if (typeof error === "string" && error.trim()) return error.trim();
  if (error instanceof Error && error.message.trim()) return error.message.trim();
  return fallback;
}

export function pythonRuntimeLabel(probe: PythonProbeResult): string {
  if (!probe.available) return "Python unavailable";
  const version = probe.pythonVersion?.replace(/^Python\s+/i, "") ?? probe.pythonPath ?? "ready";
  return probe.updateAvailable ? `Python ${version} (update available)` : `Python ${version}`;
}
