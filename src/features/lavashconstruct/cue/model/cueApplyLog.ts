import type { ConstructAssistantApplySummary } from "@/features/lavashconstruct/chat/model/constructAssistantApply";
import type { ConstructChatAgentMode } from "@/features/lavashconstruct/chat/model/constructChatAgentMode";
import type { CueValidationIssueCode } from "@/features/lavashconstruct/cue/model/cueTypes";

const CUE_APPLY_LOG_KEY = "lavash.cue.applyLog.v1";
const MAX_ENTRIES = 400;

export type CueApplyLogEntry = {
  id: string;
  atMs: number;
  provider: string;
  mode: ConstructChatAgentMode;
  attempts: number;
  applied: boolean;
  validationOk: boolean;
  issueCodes: CueValidationIssueCode[];
  summary: ConstructAssistantApplySummary;
  userExcerpt: string;
  assistantExcerpt: string;
};

function safeReadLog(): CueApplyLogEntry[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(CUE_APPLY_LOG_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as CueApplyLogEntry[]) : [];
  } catch {
    return [];
  }
}

function safeWriteLog(entries: CueApplyLogEntry[]) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(CUE_APPLY_LOG_KEY, JSON.stringify(entries.slice(-MAX_ENTRIES)));
  } catch {
    /* ignore quota */
  }
}

function excerpt(text: string, max = 240): string {
  const s = text.replace(/\s+/g, " ").trim();
  if (s.length <= max) return s;
  return `${s.slice(0, max)}…`;
}

export function readCueApplyLog(limit = 50): CueApplyLogEntry[] {
  const rows = safeReadLog();
  return rows.slice(-Math.max(1, limit)).reverse();
}

export function clearCueApplyLog() {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.removeItem(CUE_APPLY_LOG_KEY);
  } catch {
    /* ignore */
  }
}

export function appendCueApplyLog(input: {
  provider: string;
  mode: ConstructChatAgentMode;
  attempts: number;
  applied: boolean;
  validationOk: boolean;
  issueCodes: CueValidationIssueCode[];
  summary: ConstructAssistantApplySummary;
  userText: string;
  assistantText: string;
}): CueApplyLogEntry {
  const entry: CueApplyLogEntry = {
    id: crypto.randomUUID(),
    atMs: Date.now(),
    provider: input.provider,
    mode: input.mode,
    attempts: input.attempts,
    applied: input.applied,
    validationOk: input.validationOk,
    issueCodes: input.issueCodes,
    summary: input.summary,
    userExcerpt: excerpt(input.userText),
    assistantExcerpt: excerpt(input.assistantText),
  };
  safeWriteLog([...safeReadLog(), entry]);
  return entry;
}
