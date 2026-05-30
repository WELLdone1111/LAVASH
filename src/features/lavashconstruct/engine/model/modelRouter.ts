import type { ModelRouteInput } from "@/features/lavashconstruct/engine/model/engineTypes";
import { readEngineOllamaRepairModel } from "@/features/lavashconstruct/engine/model/modelSettings";
import { isLocalRuntime } from "@/features/lavashconstruct/engine/model/runtimeProfile";

/**
 * Pick model tag for a stream attempt.
 * Local: optional repair tag on retries; cloud: always primary.
 */
export function resolveModelForAttempt(input: ModelRouteInput): string {
  const primary = input.primaryModel.trim();
  if (!primary) return primary;
  if (input.attemptIndex === 0) return primary;
  if (!isLocalRuntime(input.provider)) return primary;
  const repair = input.repairModel?.trim() || readEngineOllamaRepairModel();
  return repair || primary;
}
