export type {
  ModelRuntime,
  ModelRuntimeProfile,
  ModelRouteInput,
  ModelEngineConfig,
} from "@/features/lavashconstruct/engine/model/engineTypes";

export {
  isLocalRuntime,
  inferModelRuntime,
  resolveRuntimeProfile,
  maxStreamAttempts,
} from "@/features/lavashconstruct/engine/model/runtimeProfile";

export {
  resolveModelForAttempt,
} from "@/features/lavashconstruct/engine/model/modelRouter";

export {
  readEngineOllamaRepairModel,
  writeEngineOllamaRepairModel,
} from "@/features/lavashconstruct/engine/model/modelSettings";

export {
  createModelStreamSession,
  bumpModelStreamAttempt,
  canRetryModelStream,
  type ModelStreamSession,
} from "@/features/lavashconstruct/engine/model/modelStreamSession";

export {
  LAVASH_INFERENCE_STACK_PLAN,
  inferenceStackMainModelTag,
  inferenceStackFastModelTag,
  inferenceStackModelForRole,
  type InferenceStackModelRole,
  type InferenceStackModel,
} from "@/features/lavashconstruct/engine/model/inferenceStackPlan";
