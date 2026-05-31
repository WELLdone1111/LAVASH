import type { ModelRuntime } from "@/features/lavashconstruct/engine/model/engineTypes";
import {
  inferModelRuntime,
  isLocalRuntime,
  resolveRuntimeProfile,
} from "@/features/lavashconstruct/engine/model/runtimeProfile";
import type { CueCapabilityProfile, CueModelClass } from "@/features/lavashconstruct/cue/model/cueTypes";

function promptBehavior(runtime: ModelRuntime): Pick<
  CueCapabilityProfile,
  "strictFenceProtocol" | "allowMultiPanelApply" | "simplifiedInstructions"
> {
  if (runtime === "local") {
    return {
      strictFenceProtocol: true,
      allowMultiPanelApply: true,
      simplifiedInstructions: true,
    };
  }
  return {
    strictFenceProtocol: false,
    allowMultiPanelApply: true,
    simplifiedInstructions: false,
  };
}

/** CUE apply prompts — derived from engine runtime, not model name. */
export function resolveCueCapabilityProfile(provider: string): CueCapabilityProfile {
  const profile = resolveRuntimeProfile(provider);
  return {
    modelClass: profile.runtime as CueModelClass,
    maxApplyRetries: profile.maxRetryAttempts,
    ...promptBehavior(profile.runtime),
  };
}

export function inferCueModelClass(provider: string): CueModelClass {
  return inferModelRuntime(provider) as CueModelClass;
}

export function isCueLocalRuntime(provider: string): boolean {
  return isLocalRuntime(provider);
}
