import {
  readCueApplyLog,
  type CueApplyLogEntry,
} from "@/features/lavashconstruct/cue/model/cueApplyLog";

export type CueApplyLogExportFilter = {
  /** Only entries where apply succeeded. */
  appliedOnly?: boolean;
  /** Only entries with validation ok. */
  validationOkOnly?: boolean;
  provider?: string;
  mode?: CueApplyLogEntry["mode"];
  limit?: number;
};

export function filterCueApplyLogEntries(
  entries: readonly CueApplyLogEntry[],
  filter?: CueApplyLogExportFilter,
): CueApplyLogEntry[] {
  let rows = [...entries];
  if (filter?.appliedOnly) rows = rows.filter((e) => e.applied);
  if (filter?.validationOkOnly) rows = rows.filter((e) => e.validationOk);
  if (filter?.provider) rows = rows.filter((e) => e.provider === filter.provider);
  if (filter?.mode) rows = rows.filter((e) => e.mode === filter.mode);
  if (filter?.limit != null && filter.limit > 0) rows = rows.slice(0, filter.limit);
  return rows;
}

/** JSONL blob for LoRA / fine-tune dataset pipelines (engine export, no UI). */
export function exportCueApplyLogJsonl(filter?: CueApplyLogExportFilter): string {
  const limit = filter?.limit ?? 400;
  const entries = filterCueApplyLogEntries(readCueApplyLog(limit), filter);
  return entries.map((entry) => JSON.stringify(entry)).join("\n");
}

export type CueApplyLogDatasetRow = {
  instruction: string;
  output: string;
  meta: Pick<
    CueApplyLogEntry,
    "provider" | "mode" | "attempts" | "applied" | "validationOk" | "issueCodes"
  >;
};

/** Flat instruction/output pairs for SFT-style datasets. */
export function buildCueApplyLogDataset(
  entries: readonly CueApplyLogEntry[],
  filter?: CueApplyLogExportFilter,
): CueApplyLogDatasetRow[] {
  return filterCueApplyLogEntries(entries, filter).map((entry) => ({
    instruction: entry.userExcerpt,
    output: entry.assistantExcerpt,
    meta: {
      provider: entry.provider,
      mode: entry.mode,
      attempts: entry.attempts,
      applied: entry.applied,
      validationOk: entry.validationOk,
      issueCodes: entry.issueCodes,
    },
  }));
}
