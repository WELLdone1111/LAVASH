import type { ConstructAssistantApplySummary } from "@/features/lavashconstruct/chat/model/constructAssistantApply";
import type { ConstructChatAgentMode } from "@/features/lavashconstruct/chat/model/constructChatAgentMode";
import type { ConstructChatThreadTurn } from "@/features/lavashconstruct/chat/model/constructChatThread";
import { resolveModelForAttempt } from "@/features/lavashconstruct/engine/model/modelRouter";
import {
  extendApiThreadForCueRetry,
  shouldCueRetry,
} from "@/features/lavashconstruct/cue/model/cueRetryPolicy";
import type { CueApplyResult, CueValidationResult } from "@/features/lavashconstruct/cue/model/cueTypes";

export type CueSessionConfig = {
  provider: string;
  primaryModel: string;
  mode: ConstructChatAgentMode;
  applyEnabled: boolean;
  maxRetries: number;
  /** Optional Ollama repair tag for retry streams (engine config, not UI). */
  repairModel?: string;
};

export type CueAttemptRecord = {
  attemptIndex: number;
  streamModel: string;
  assistantMarkdown: string;
  applyResult: CueApplyResult;
};

export type CueSessionState = {
  config: CueSessionConfig;
  attempts: CueAttemptRecord[];
  done: boolean;
};

export type CueSessionSummary = {
  attempts: number;
  applied: boolean;
  validation: CueValidationResult;
  summary: ConstructAssistantApplySummary;
  assistantMarkdown: string;
  streamModels: string[];
};

export function createCueSession(config: CueSessionConfig): CueSessionState {
  return { config, attempts: [], done: false };
}

/** Model tag for the next stream attempt (0-based index = completed attempts). */
export function resolveCueSessionStreamModel(session: CueSessionState): string {
  const { provider, primaryModel, repairModel } = session.config;
  return resolveModelForAttempt({
    provider,
    primaryModel,
    attemptIndex: session.attempts.length,
    repairModel,
  });
}

export function shouldContinueCueSession(session: CueSessionState): boolean {
  if (session.done) return false;
  const last = session.attempts.at(-1);
  if (!last) return true;
  return shouldCueRetry({
    mode: session.config.mode,
    applyEnabled: session.config.applyEnabled,
    validation: last.applyResult.validation,
    summary: last.applyResult.summary,
    attemptIndex: last.attemptIndex,
    maxRetries: session.config.maxRetries,
  });
}

export function recordCueAttempt(
  session: CueSessionState,
  assistantMarkdown: string,
  applyResult: CueApplyResult,
): CueSessionState {
  const attemptIndex = session.attempts.length;
  const streamModel = resolveModelForAttempt({
    provider: session.config.provider,
    primaryModel: session.config.primaryModel,
    attemptIndex,
    repairModel: session.config.repairModel,
  });
  const attempts: CueAttemptRecord[] = [
    ...session.attempts,
    { attemptIndex, streamModel, assistantMarkdown, applyResult },
  ];
  const next: CueSessionState = { ...session, attempts };
  const last = attempts.at(-1)!;
  const done = !shouldCueRetry({
    mode: session.config.mode,
    applyEnabled: session.config.applyEnabled,
    validation: last.applyResult.validation,
    summary: last.applyResult.summary,
    attemptIndex: last.attemptIndex,
    maxRetries: session.config.maxRetries,
  });
  return { ...next, done };
}

export function buildCueSessionRetryThread(
  prior: readonly ConstructChatThreadTurn[],
  session: CueSessionState,
  formatSyncNote: (summary: ConstructAssistantApplySummary) => string,
): ConstructChatThreadTurn[] | null {
  const last = session.attempts.at(-1);
  if (!last || session.done) return null;
  const failedAssistant =
    last.assistantMarkdown.trim() +
    formatSyncNote(last.applyResult.summary);
  return extendApiThreadForCueRetry(prior, failedAssistant, last.applyResult.validation);
}

export function summarizeCueSession(session: CueSessionState): CueSessionSummary | null {
  const last = session.attempts.at(-1);
  if (!last) return null;
  return {
    attempts: session.attempts.length,
    applied: last.applyResult.applied,
    validation: last.applyResult.validation,
    summary: last.applyResult.summary,
    assistantMarkdown: last.assistantMarkdown,
    streamModels: session.attempts.map((a) => a.streamModel),
  };
}

export function buildCueApplyLogPayload(
  session: CueSessionState,
  userText: string,
): {
  provider: string;
  mode: ConstructChatAgentMode;
  attempts: number;
  applied: boolean;
  validationOk: boolean;
  issueCodes: CueValidationResult["issues"][number]["code"][];
  summary: ConstructAssistantApplySummary;
  userText: string;
  assistantText: string;
} | null {
  if (!session.config.applyEnabled) return null;
  const summary = summarizeCueSession(session);
  if (!summary) return null;
  return {
    provider: session.config.provider,
    mode: session.config.mode,
    attempts: summary.attempts,
    applied: summary.applied,
    validationOk: summary.validation.ok,
    issueCodes: summary.validation.issues.map((i) => i.code),
    summary: summary.summary,
    userText,
    assistantText: summary.assistantMarkdown,
  };
}
