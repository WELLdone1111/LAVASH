import { isAssistantArtboardFence, isAssistantPanelFence } from "@/features/lavashconstruct/chat/model/assistantFenceHints";
import { parseTrailingOpenPanelFence } from "@/features/lavashconstruct/chat/model/assistantFenceParse";
import { parseCodeFencesFromMarkdown } from "@/features/lavashconstruct/editor/model/codeScratchStore";
import type { ConstructChatAgentMode } from "@/features/lavashconstruct/chat/model/constructChatAgentMode";
import {
  isCueActionsFenceHint,
  parseCueActionsPayload,
} from "@/features/lavashconstruct/cue/model/cueActionSchema";
import type { CueValidationIssue, CueValidationResult } from "@/features/lavashconstruct/cue/model/cueTypes";

const MANUAL_STEP_RE =
  /\b(open (the )?code tab|switch to (the )?code|press ctrl\+s|type `tab`|use the console manually)\b/i;

function countFenceDelimiters(markdown: string): number {
  const matches = markdown.match(/```/g);
  return matches?.length ?? 0;
}

function hasUnclosedFence(markdown: string): boolean {
  return countFenceDelimiters(markdown) % 2 !== 0 || parseTrailingOpenPanelFence(markdown) != null;
}

function validateArtboardFences(markdown: string): CueValidationIssue[] {
  const issues: CueValidationIssue[] = [];
  for (const fence of parseCodeFencesFromMarkdown(markdown)) {
    if (fence.lang.toLowerCase() !== "json") continue;
    if (!isAssistantArtboardFence(fence.tabHint.trim().toLowerCase())) continue;
    try {
      JSON.parse(fence.body);
    } catch {
      issues.push({
        code: "invalid_artboard_json",
        message: "lavash-artboard fence contains invalid JSON",
      });
    }
  }
  return issues;
}

function validatePanelFences(markdown: string): CueValidationIssue[] {
  const issues: CueValidationIssue[] = [];
  for (const fence of parseCodeFencesFromMarkdown(markdown)) {
    if (!isAssistantPanelFence(fence.tabHint)) continue;
    if (!fence.body.trim()) {
      issues.push({
        code: "empty_panel_fence",
        message: "lavash-panel fence is empty",
      });
    }
  }
  return issues;
}

function validateCueActionFences(markdown: string): CueValidationIssue[] {
  const issues: CueValidationIssue[] = [];
  for (const fence of parseCodeFencesFromMarkdown(markdown)) {
    if (fence.lang.toLowerCase() !== "json") continue;
    if (!isCueActionsFenceHint(fence.tabHint)) continue;
    let parsed: unknown;
    try {
      parsed = JSON.parse(fence.body);
    } catch {
      issues.push({
        code: "invalid_actions_json",
        message: "lavash-actions fence contains invalid JSON",
      });
      continue;
    }
    const actions = parseCueActionsPayload(parsed);
    if (actions.length === 0) {
      issues.push({
        code: "empty_action",
        message: "lavash-actions fence has no valid spawn_panel or patch_artboard actions",
      });
    }
  }
  return issues;
}

function hasApplyOutput(markdown: string): boolean {
  if (parseCodeFencesFromMarkdown(markdown).some(
    (fence) => fence.lang.toLowerCase() === "json" && isCueActionsFenceHint(fence.tabHint),
  )) {
    return true;
  }
  return parseCodeFencesFromMarkdown(markdown).some((fence) => {
    if (isAssistantPanelFence(fence.tabHint)) return true;
    if (fence.lang.toLowerCase() === "json" && isAssistantArtboardFence(fence.tabHint.trim().toLowerCase())) {
      return true;
    }
    return false;
  });
}

/** Validates assistant markdown before/after apply (Agent mode). */
export function validateCueAssistantOutput(
  markdown: string,
  mode: ConstructChatAgentMode,
  _artboardPanelIds: readonly string[] = [],
): CueValidationResult {
  if (mode !== "agent") {
    return { ok: true, issues: [] };
  }

  const issues: CueValidationIssue[] = [];

  if (hasUnclosedFence(markdown)) {
    issues.push({
      code: "unclosed_fence",
      message: "Assistant output has an unclosed ``` fence — apply may be incomplete",
    });
  }

  if (MANUAL_STEP_RE.test(markdown)) {
    issues.push({
      code: "prose_manual_steps",
      message: "Assistant told the user manual IDE steps instead of apply fences",
    });
  }

  issues.push(...validateArtboardFences(markdown));
  issues.push(...validatePanelFences(markdown));
  issues.push(...validateCueActionFences(markdown));

  const trimmed = markdown.trim();
  if (trimmed.length > 0 && !hasApplyOutput(trimmed) && !issues.some((i) => i.code === "prose_manual_steps")) {
    issues.push({
      code: "no_apply_fence",
      message: "Agent reply has no lavash-actions, lavash-panel, or lavash-artboard output",
    });
  }

  return { ok: issues.length === 0, issues };
}

export function formatCueValidationNote(validation: CueValidationResult): string {
  if (validation.ok || validation.issues.length === 0) return "";
  const lines = validation.issues.map((issue) => `- ${issue.code}: ${issue.message}`);
  return `\n\n[LAVASH CUE validation]\n${lines.join("\n")}`;
}
