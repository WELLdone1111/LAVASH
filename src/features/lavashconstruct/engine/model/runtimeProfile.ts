import { getConstructProviderDef, type ConstructChatProvider } from "@/features/lavashconstruct/chat/model/constructChatProviders";
import type { ModelRuntime, ModelRuntimeProfile } from "@/features/lavashconstruct/engine/model/engineTypes";

export function isLocalRuntime(provider: string): boolean {
  try {
    return getConstructProviderDef(provider as ConstructChatProvider).kind === "local";
  } catch {
    return provider.trim().toLowerCase() === "ollama";
  }
}

export function inferModelRuntime(provider: string): ModelRuntime {
  return isLocalRuntime(provider) ? "local" : "cloud";
}

/** Retry budget and runtime class by provider — not by model name. */
export function resolveRuntimeProfile(provider: string): ModelRuntimeProfile {
  if (inferModelRuntime(provider) === "local") {
    return { runtime: "local", maxRetryAttempts: 2 };
  }
  return { runtime: "cloud", maxRetryAttempts: 0 };
}

/** Total LLM streams allowed (first + retries). */
export function maxStreamAttempts(profile: ModelRuntimeProfile): number {
  return 1 + profile.maxRetryAttempts;
}
