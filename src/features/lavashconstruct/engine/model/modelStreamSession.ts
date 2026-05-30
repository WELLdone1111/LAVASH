import type { ModelEngineConfig, ModelRuntimeProfile } from "@/features/lavashconstruct/engine/model/engineTypes";
import { resolveRuntimeProfile } from "@/features/lavashconstruct/engine/model/runtimeProfile";

export type ModelStreamSession = {
  config: ModelEngineConfig;
  profile: ModelRuntimeProfile;
  /** Zero-based stream attempt index. */
  attemptIndex: number;
};

export function createModelStreamSession(config: ModelEngineConfig): ModelStreamSession {
  return {
    config,
    profile: resolveRuntimeProfile(config.provider),
    attemptIndex: 0,
  };
}

/** Whether another model stream is allowed (caller decides if retry is warranted). */
export function canRetryModelStream(session: ModelStreamSession): boolean {
  return session.profile.runtime === "local" && session.attemptIndex < session.profile.maxRetryAttempts;
}

export function bumpModelStreamAttempt(session: ModelStreamSession): ModelStreamSession {
  return { ...session, attemptIndex: session.attemptIndex + 1 };
}
