import {
  buildAgentModeSystemInstruction,
  type ConstructChatAgentMode,
} from "@/features/lavashconstruct/chat/model/constructChatAgentMode";
import { buildConstructApplyFormatGuide } from "@/features/lavashconstruct/chat/model/constructChatApplyFormatGuide";
import { buildCueArtboardActionsGuide } from "@/features/lavashconstruct/cue/model/cueArtboardControlGuide";
import { buildConstructDebugContextForModel } from "@/features/lavashconstruct/chat/model/constructDebugContext";
import {
  buildConstructContextForModel,
  type ConstructContextInput,
} from "@/features/lavashconstruct/chat/model/constructContextForModel";
import { resolveCueCapabilityProfile } from "@/features/lavashconstruct/cue/model/cueCapabilityProfile";
import type { CueCapabilityProfile } from "@/features/lavashconstruct/cue/model/cueTypes";
import { buildAgentContextForModel } from "@/features/lavashconstruct/settings/model/constructAgentContext";

export type CueTurnInput = {
  mode: ConstructChatAgentMode;
  projectRoot: string | null;
  constructContext: ConstructContextInput;
  provider: string;
  /** Reserved for future router; CUE v1 ignores model id. */
  modelId?: string;
  /** When user sends `/apply` after Plan. */
  planApplyInstruction?: string;
};

export type CueTurnOutput = {
  constructSnapshot: string;
  capability: CueCapabilityProfile;
};

function buildCueHeader(capability: CueCapabilityProfile): string {
  return [
    "[LAVASH Context Understanding Engine — CUE v1]",
    "LAVASH orchestrates context and apply; follow mode rules, fences, or lavash-actions JSON.",
    `Model class: ${capability.modelClass}`,
  ].join("\n");
}

function buildLocalApplyAddon(capability: CueCapabilityProfile, mode: ConstructChatAgentMode): string {
  if (mode !== "agent" || capability.modelClass !== "local") return "";
  return [
    "[CUE — local runtime]",
    "- Prefer ```json lavash-actions``` (see artboard control guide).",
    "- Always close fences with a line containing only ```.",
    "- No manual IDE steps — LAVASH applies automatically.",
  ].join("\n");
}

function buildApplyFormatGuide(mode: ConstructChatAgentMode, capability: CueCapabilityProfile): string {
  const base = buildConstructApplyFormatGuide(mode);
  const artboardControl = buildCueArtboardActionsGuide(mode);
  const local = buildLocalApplyAddon(capability, mode);
  return [base, artboardControl, local].filter((block) => block.trim().length > 0).join("\n\n");
}

/**
 * Unified CUE turn builder — single entry for model context assembly.
 * Replaces scattered snapshot/mode/guide/agentContext wiring in chat send.
 */
export async function buildCueTurn(input: CueTurnInput): Promise<CueTurnOutput> {
  const capability = resolveCueCapabilityProfile(input.provider);

  const blocks = [
    buildCueHeader(capability),
    buildAgentModeSystemInstruction(input.mode),
    input.planApplyInstruction?.trim() ?? "",
    buildApplyFormatGuide(input.mode, capability),
  ];

  if (input.mode === "debug") {
    blocks.push(buildConstructDebugContextForModel());
  }

  const agentContext = await buildAgentContextForModel(input.projectRoot);
  if (agentContext.trim()) {
    blocks.push(agentContext.trim());
  }

  blocks.push(buildConstructContextForModel(input.constructContext));

  const constructSnapshot = blocks.filter((block) => block.trim().length > 0).join("\n\n");
  return { constructSnapshot, capability };
}
