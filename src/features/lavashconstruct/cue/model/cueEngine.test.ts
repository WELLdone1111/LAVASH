import { beforeEach, describe, expect, it, vi } from "vitest";

import { validateCueAssistantOutput, formatCueValidationNote } from "@/features/lavashconstruct/cue/model/cueActionValidate";
import {
  normalizeCueAction,
  parseCueActionsPayload,
} from "@/features/lavashconstruct/cue/model/cueActionSchema";
import { parseCueActionsFromMarkdown } from "@/features/lavashconstruct/cue/model/cueActionParse";
import {
  isCueLocalRuntime,
  resolveCueCapabilityProfile,
} from "@/features/lavashconstruct/cue/model/cueCapabilityProfile";
import {
  buildCueRepairUserMessage,
  extendApiThreadForCueRetry,
  shouldCueRetry,
} from "@/features/lavashconstruct/cue/model/cueRetryPolicy";
import { resolveCueSendMode, CUE_APPLY_COMMAND } from "@/features/lavashconstruct/cue/model/cueSendMode";
import { buildCuePlanApplyInstruction } from "@/features/lavashconstruct/cue/model/cuePlanContext";
import {
  appendCueApplyLog,
  clearCueApplyLog,
  readCueApplyLog,
} from "@/features/lavashconstruct/cue/model/cueApplyLog";
import {
  createCueSession,
  recordCueAttempt,
  resolveCueSessionStreamModel,
  shouldContinueCueSession,
  summarizeCueSession,
  buildCueApplyLogPayload,
} from "@/features/lavashconstruct/cue/model/cueSession";
import {
  buildCueApplyLogDataset,
  exportCueApplyLogJsonl,
  filterCueApplyLogEntries,
} from "@/features/lavashconstruct/cue/model/cueApplyLogExport";
import { runCueApplyPipeline } from "@/features/lavashconstruct/cue/model/cueApplyPipeline";

function installLocalStorageMock() {
  const memory = new Map<string, string>();
  const storage = {
    getItem: (key: string) => (memory.has(key) ? memory.get(key)! : null),
    setItem: (key: string, value: string) => {
      memory.set(key, value);
    },
    removeItem: (key: string) => {
      memory.delete(key);
    },
    clear: () => memory.clear(),
  };
  vi.stubGlobal("localStorage", storage);
  return storage;
}

describe("cueCapabilityProfile", () => {
  it("treats any Ollama model as local runtime", () => {
    for (const tag of ["llama3.2:3b", "qwen3-coder:30b", "my-custom-model:latest", "mistral-nemo"]) {
      const profile = resolveCueCapabilityProfile("ollama");
      expect(profile.modelClass).toBe("local");
      expect(profile.simplifiedInstructions).toBe(true);
      expect(profile.maxApplyRetries).toBe(2);
      void tag;
    }
  });

  it("treats cloud providers as cloud runtime regardless of model name", () => {
    const profile = resolveCueCapabilityProfile("gemini");
    expect(profile.modelClass).toBe("cloud");
    expect(profile.maxApplyRetries).toBe(0);
    expect(profile.simplifiedInstructions).toBe(false);
  });

  it("local runtime gets more retries than cloud", () => {
    const local = resolveCueCapabilityProfile("ollama");
    const cloud = resolveCueCapabilityProfile("gemini");
    expect(local.maxApplyRetries).toBeGreaterThan(cloud.maxApplyRetries);
  });

  it("isCueLocalRuntime identifies ollama only", () => {
    expect(isCueLocalRuntime("ollama")).toBe(true);
    expect(isCueLocalRuntime("gemini")).toBe(false);
    expect(isCueLocalRuntime("groq")).toBe(false);
  });
});

describe("cueActionValidate", () => {
  it("flags unclosed fences in agent mode", () => {
    const result = validateCueAssistantOutput("```html lavash-panel Test\n<div>", "agent");
    expect(result.ok).toBe(false);
    expect(result.issues.some((i) => i.code === "unclosed_fence")).toBe(true);
  });

  it("flags manual IDE steps", () => {
    const result = validateCueAssistantOutput("Please open the code tab and paste this.", "agent");
    expect(result.issues.some((i) => i.code === "prose_manual_steps")).toBe(true);
  });

  it("passes valid lavash-panel fence", () => {
    const md = "```html lavash-panel Button\n<!DOCTYPE html><html><body><button>Go</button></body></html>\n```";
    const result = validateCueAssistantOutput(md, "agent");
    expect(result.issues.some((i) => i.code === "no_apply_fence")).toBe(false);
    expect(result.issues.some((i) => i.code === "empty_panel_fence")).toBe(false);
  });

  it("skips validation in ask mode", () => {
    const result = validateCueAssistantOutput("Just advice, no fences.", "ask");
    expect(result.ok).toBe(true);
  });

  it("formats validation note for API thread", () => {
    const note = formatCueValidationNote({
      ok: false,
      issues: [{ code: "unclosed_fence", message: "test" }],
    });
    expect(note).toContain("[LAVASH CUE validation]");
    expect(note).toContain("unclosed_fence");
  });
});

describe("cueRetryPolicy", () => {
  const emptySummary = {
    codeFencesApplied: 0,
    artboardApplied: false,
    constructPanelsSpawned: 0,
    cueActionsApplied: 0,
  };

  it("retries when agent validation fails and nothing applied", () => {
    expect(
      shouldCueRetry({
        mode: "agent",
        applyEnabled: true,
        validation: { ok: false, issues: [{ code: "no_apply_fence", message: "x" }] },
        summary: emptySummary,
        attemptIndex: 0,
        maxRetries: 2,
      }),
    ).toBe(true);
  });

  it("does not retry after max attempts", () => {
    expect(
      shouldCueRetry({
        mode: "agent",
        applyEnabled: true,
        validation: { ok: false, issues: [{ code: "unclosed_fence", message: "x" }] },
        summary: emptySummary,
        attemptIndex: 2,
        maxRetries: 2,
      }),
    ).toBe(false);
  });

  it("does not retry when apply succeeded", () => {
    expect(
      shouldCueRetry({
        mode: "agent",
        applyEnabled: true,
        validation: { ok: false, issues: [{ code: "unclosed_fence", message: "x" }] },
        summary: { ...emptySummary, constructPanelsSpawned: 1 },
        attemptIndex: 0,
        maxRetries: 2,
      }),
    ).toBe(false);
  });

  it("builds repair thread extension", () => {
    const thread = extendApiThreadForCueRetry(
      [{ role: "user", content: "make button" }],
      "failed reply",
      { ok: false, issues: [{ code: "no_apply_fence", message: "missing fence" }] },
    );
    expect(thread).toHaveLength(3);
    expect(thread[2]?.content).toContain("CUE repair");
    expect(buildCueRepairUserMessage({ ok: false, issues: [{ code: "no_apply_fence", message: "missing fence" }] })).toContain(
      "no_apply_fence",
    );
  });
});

describe("cueActionSchema", () => {
  it("normalizes spawn_panel action", () => {
    const action = normalizeCueAction({
      type: "spawn_panel",
      title: "Button",
      html: "<button>Go</button>",
    });
    expect(action).toEqual({
      type: "spawn_panel",
      title: "Button",
      html: "<button>Go</button>",
      lang: undefined,
    });
  });

  it("parses lavash-actions payload array", () => {
    const actions = parseCueActionsPayload([
      { type: "spawn_panel", title: "A", html: "<div>A</div>" },
      { type: "patch_artboard", merge: true, artboardPanels: [{ id: "p1" }] },
    ]);
    expect(actions).toHaveLength(2);
    expect(actions[0]?.type).toBe("spawn_panel");
    expect(actions[1]?.type).toBe("patch_artboard");
  });

  it("parses actions from markdown fence", () => {
    const md = [
      "```json lavash-actions",
      '[{"type":"spawn_panel","title":"Card","html":"<!DOCTYPE html><html><body><div>Hi</div></body></html>"}]',
      "```",
    ].join("\n");
    const actions = parseCueActionsFromMarkdown(md);
    expect(actions).toHaveLength(1);
    expect(actions[0]?.type).toBe("spawn_panel");
  });

  it("validates lavash-actions fence in agent mode", () => {
    const md = "```json lavash-actions\n[{\"type\":\"spawn_panel\",\"title\":\"X\",\"html\":\"<div></div>\"}]\n```";
    const result = validateCueAssistantOutput(md, "agent");
    expect(result.issues.some((i) => i.code === "no_apply_fence")).toBe(false);
  });
});

describe("cueSendMode", () => {
  it("forces agent mode on /apply", () => {
    const r = resolveCueSendMode("plan", "/apply");
    expect(r.mode).toBe("agent");
    expect(r.forcedApply).toBe(true);
    expect(r.userText).toContain("Apply the planned design");
  });

  it("passes through normal text", () => {
    const r = resolveCueSendMode("ask", "hello");
    expect(r.mode).toBe("ask");
    expect(r.userText).toBe("hello");
    expect(r.forcedApply).toBe(false);
  });

  it("supports /apply with extra instruction", () => {
    const r = resolveCueSendMode("plan", `${CUE_APPLY_COMMAND} use blue theme`);
    expect(r.userText).toBe("use blue theme");
    expect(r.forcedApply).toBe(true);
  });
});

describe("cuePlanContext", () => {
  it("adds apply instruction only for forced plan apply", () => {
    expect(buildCuePlanApplyInstruction(true, "plan")).toContain("apply plan");
    expect(buildCuePlanApplyInstruction(false, "plan")).toBe("");
    expect(buildCuePlanApplyInstruction(true, "agent")).toBe("");
  });
});

describe("cueApplyLog", () => {
  beforeEach(() => {
    installLocalStorageMock().clear();
    clearCueApplyLog();
  });

  it("appends and reads apply log entries", () => {
    appendCueApplyLog({
      provider: "ollama",
      mode: "agent",
      attempts: 2,
      applied: true,
      validationOk: true,
      issueCodes: [],
      summary: {
        codeFencesApplied: 0,
        artboardApplied: false,
        constructPanelsSpawned: 1,
        cueActionsApplied: 0,
      },
      userText: "make a card panel",
      assistantText: "```json lavash-actions\n[]\n```",
    });
    const rows = readCueApplyLog(10);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.provider).toBe("ollama");
    expect(rows[0]?.attempts).toBe(2);
    expect(rows[0]?.userExcerpt).toContain("make a card");
  });
});

describe("cueSession", () => {
  const badMd = "Please open the panel and paste manually.";
  const goodMd =
    "```json lavash-actions\n[{\"type\":\"spawn_panel\",\"title\":\"Card\",\"html\":\"<!DOCTYPE html><html><body><div>Hi</div></body></html>\"}]\n```";

  it("retries local agent session when validation fails", () => {
    let session = createCueSession({
      provider: "ollama",
      primaryModel: "llama3.2:3b",
      mode: "agent",
      applyEnabled: true,
      maxRetries: 2,
      repairModel: "qwen2.5-coder:7b",
    });
    expect(resolveCueSessionStreamModel(session)).toBe("llama3.2:3b");

    const bad = runCueApplyPipeline(badMd, { mode: "agent", applyEnabled: true });
    session = recordCueAttempt(session, badMd, bad);
    expect(session.done).toBe(false);
    expect(shouldContinueCueSession(session)).toBe(true);
    expect(resolveCueSessionStreamModel(session)).toBe("qwen2.5-coder:7b");

    const good = runCueApplyPipeline(goodMd, { mode: "agent", applyEnabled: true, validate: false });
    session = recordCueAttempt(session, goodMd, good);
    expect(session.done).toBe(true);
    expect(shouldContinueCueSession(session)).toBe(false);

    const summary = summarizeCueSession(session);
    expect(summary?.attempts).toBe(2);
    expect(summary?.streamModels).toEqual(["llama3.2:3b", "qwen2.5-coder:7b"]);
  });

  it("builds apply log payload from finished session", () => {
    let session = createCueSession({
      provider: "ollama",
      primaryModel: "llama3.2:3b",
      mode: "agent",
      applyEnabled: true,
      maxRetries: 0,
    });
    const result = runCueApplyPipeline(badMd, { mode: "agent", applyEnabled: true });
    session = recordCueAttempt(session, badMd, result);
    const payload = buildCueApplyLogPayload(session, "make card");
    expect(payload?.attempts).toBe(1);
    expect(payload?.userText).toBe("make card");
    expect(payload?.applied).toBe(false);
  });
});

describe("cueApplyLogExport", () => {
  beforeEach(() => {
    installLocalStorageMock().clear();
    clearCueApplyLog();
  });

  it("exports JSONL and dataset rows", () => {
    appendCueApplyLog({
      provider: "ollama",
      mode: "agent",
      attempts: 1,
      applied: true,
      validationOk: true,
      issueCodes: [],
      summary: {
        codeFencesApplied: 0,
        artboardApplied: false,
        constructPanelsSpawned: 1,
        cueActionsApplied: 1,
      },
      userText: "spawn card",
      assistantText: "```json lavash-actions\n[]\n```",
    });
    appendCueApplyLog({
      provider: "gemini",
      mode: "agent",
      attempts: 1,
      applied: false,
      validationOk: false,
      issueCodes: ["no_apply_fence"],
      summary: {
        codeFencesApplied: 0,
        artboardApplied: false,
        constructPanelsSpawned: 0,
        cueActionsApplied: 0,
      },
      userText: "broken",
      assistantText: "no fences",
    });

    const jsonl = exportCueApplyLogJsonl({ appliedOnly: true });
    expect(jsonl.split("\n")).toHaveLength(1);
    expect(jsonl).toContain('"provider":"ollama"');

    const rows = buildCueApplyLogDataset(readCueApplyLog(10), { provider: "ollama" });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.instruction).toContain("spawn card");

    const filtered = filterCueApplyLogEntries(readCueApplyLog(10), { validationOkOnly: true });
    expect(filtered).toHaveLength(1);
  });
});
