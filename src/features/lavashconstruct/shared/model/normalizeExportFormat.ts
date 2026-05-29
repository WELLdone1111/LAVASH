import type { ExportFormat } from "@/features/lavashconstruct/shared/model/types";

export function normalizeExportFormat(raw: unknown): ExportFormat | null {
  if (typeof raw !== "string") return null;
  if (raw === ".lavash-theme" || raw === ".json" || raw === "Chrome Extension (.zip)") {
    return raw;
  }
  return null;
}
