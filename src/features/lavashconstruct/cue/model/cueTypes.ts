import type { ConstructAssistantApplySummary } from "@/features/lavashconstruct/chat/model/constructAssistantApply";

/** Engine-side model capability — drives prompts, validation strictness, retry budget. */
/** Engine runtime class — local Ollama vs cloud APIs. Not tied to a specific model name. */
export type CueModelClass = "local" | "cloud";

export type CueCapabilityProfile = {
  modelClass: CueModelClass;
  maxApplyRetries: number;
  strictFenceProtocol: boolean;
  allowMultiPanelApply: boolean;
  simplifiedInstructions: boolean;
};

export type CueValidationIssueCode =
  | "unclosed_fence"
  | "invalid_artboard_json"
  | "unknown_panel_id"
  | "empty_panel_fence"
  | "no_apply_fence"
  | "invalid_actions_json"
  | "empty_action"
  | "prose_manual_steps";

export type CueValidationIssue = {
  code: CueValidationIssueCode;
  message: string;
};

export type CueValidationResult = {
  ok: boolean;
  issues: CueValidationIssue[];
};

export type CueApplyResult = {
  summary: ConstructAssistantApplySummary;
  validation: CueValidationResult;
  /** True when at least one apply path succeeded. */
  applied: boolean;
};
