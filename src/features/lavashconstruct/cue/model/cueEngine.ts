/** CUE apply path — validation, fences, actions. Model routing lives in `engine/`. */

export {
  resolveCueCapabilityProfile,
  inferCueModelClass,
  isCueLocalRuntime,
} from "@/features/lavashconstruct/cue/model/cueCapabilityProfile";
export { validateCueAssistantOutput, formatCueValidationNote } from "@/features/lavashconstruct/cue/model/cueActionValidate";
export { runCueApplyPipeline } from "@/features/lavashconstruct/cue/model/cueApplyPipeline";
export { buildCueTurn, type CueTurnInput, type CueTurnOutput } from "@/features/lavashconstruct/cue/model/cueTurnBuilder";
export {
  shouldCueRetry,
  buildCueRepairUserMessage,
  extendApiThreadForCueRetry,
  type CueRetryDecisionInput,
} from "@/features/lavashconstruct/cue/model/cueRetryPolicy";
export {
  parseCueActionsFromMarkdown,
  markdownHasCueActionsFence,
} from "@/features/lavashconstruct/cue/model/cueActionParse";
export { applyCueActions } from "@/features/lavashconstruct/cue/model/cueActionApply";
export {
  normalizeCueAction,
  parseCueActionsPayload,
  type CueAction,
  type CueSpawnPanelAction,
  type CuePatchArtboardAction,
  type CueReplaceArtboardAction,
  type CueRemovePanelsAction,
  type CueClearArtboardAction,
  type CueReorderPanelsAction,
  type CueSelectPanelAction,
} from "@/features/lavashconstruct/cue/model/cueActionSchema";
export {
  resolveCueSendMode,
  CUE_APPLY_COMMAND,
  type CueSendModeResolution,
} from "@/features/lavashconstruct/cue/model/cueSendMode";
export { buildCuePlanApplyInstruction } from "@/features/lavashconstruct/cue/model/cuePlanContext";
export {
  appendCueApplyLog,
  readCueApplyLog,
  clearCueApplyLog,
  type CueApplyLogEntry,
} from "@/features/lavashconstruct/cue/model/cueApplyLog";
export {
  exportCueApplyLogJsonl,
  filterCueApplyLogEntries,
  buildCueApplyLogDataset,
  type CueApplyLogExportFilter,
  type CueApplyLogDatasetRow,
} from "@/features/lavashconstruct/cue/model/cueApplyLogExport";
export {
  createCueSession,
  recordCueAttempt,
  resolveCueSessionStreamModel,
  shouldContinueCueSession,
  buildCueSessionRetryThread,
  summarizeCueSession,
  buildCueApplyLogPayload,
  type CueSessionConfig,
  type CueSessionState,
  type CueSessionSummary,
  type CueAttemptRecord,
} from "@/features/lavashconstruct/cue/model/cueSession";
export type {
  CueApplyResult,
  CueCapabilityProfile,
  CueModelClass,
  CueValidationIssue,
  CueValidationResult,
} from "@/features/lavashconstruct/cue/model/cueTypes";

/** @deprecated Import from `@/features/lavashconstruct/engine/model/lavashEngine` */
export {
  resolveModelForAttempt as resolveCueStreamModel,
  readEngineOllamaRepairModel as readCueOllamaRepairModel,
  writeEngineOllamaRepairModel as writeCueOllamaRepairModel,
} from "@/features/lavashconstruct/engine/model/lavashEngine";

/** @deprecated Import from `@/features/lavashconstruct/engine/model/lavashEngine` */
export {
  LAVASH_INFERENCE_STACK_PLAN,
  inferenceStackMainModelTag,
  inferenceStackFastModelTag,
} from "@/features/lavashconstruct/engine/model/lavashEngine";
