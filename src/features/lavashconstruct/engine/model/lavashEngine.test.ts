import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  bumpModelStreamAttempt,
  canRetryModelStream,
  createModelStreamSession,
  inferModelRuntime,
  isLocalRuntime,
  maxStreamAttempts,
  readEngineOllamaRepairModel,
  resolveModelForAttempt,
  resolveRuntimeProfile,
  writeEngineOllamaRepairModel,
} from "@/features/lavashconstruct/engine/model/lavashEngine";
import {
  inferenceStackFastModelTag,
  inferenceStackMainModelTag,
  inferenceStackModelForRole,
  LAVASH_INFERENCE_STACK_PLAN,
} from "@/features/lavashconstruct/engine/model/inferenceStackPlan";

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

describe("runtimeProfile", () => {
  it("classifies Ollama as local regardless of model tag", () => {
    expect(isLocalRuntime("ollama")).toBe(true);
    expect(inferModelRuntime("ollama")).toBe("local");
    expect(resolveRuntimeProfile("ollama").maxRetryAttempts).toBe(2);
  });

  it("classifies cloud providers with zero retries", () => {
    expect(isLocalRuntime("gemini")).toBe(false);
    expect(resolveRuntimeProfile("gemini")).toEqual({ runtime: "cloud", maxRetryAttempts: 0 });
    expect(maxStreamAttempts(resolveRuntimeProfile("gemini"))).toBe(1);
  });
});

describe("modelRouter", () => {
  beforeEach(() => {
    installLocalStorageMock().clear();
    writeEngineOllamaRepairModel("");
  });

  it("uses primary on first attempt", () => {
    expect(
      resolveModelForAttempt({ provider: "ollama", primaryModel: "llama3.2:3b", attemptIndex: 0 }),
    ).toBe("llama3.2:3b");
  });

  it("uses repair tag on local retry", () => {
    writeEngineOllamaRepairModel("qwen2.5-coder:7b");
    expect(
      resolveModelForAttempt({ provider: "ollama", primaryModel: "llama3.2:3b", attemptIndex: 1 }),
    ).toBe("qwen2.5-coder:7b");
    expect(readEngineOllamaRepairModel()).toBe("qwen2.5-coder:7b");
  });

  it("accepts repairModel override", () => {
    expect(
      resolveModelForAttempt({
        provider: "ollama",
        primaryModel: "llama3.2:3b",
        attemptIndex: 1,
        repairModel: "custom:latest",
      }),
    ).toBe("custom:latest");
  });

  it("keeps cloud primary on retry", () => {
    writeEngineOllamaRepairModel("qwen2.5-coder:7b");
    expect(
      resolveModelForAttempt({ provider: "gemini", primaryModel: "gemini-2.0-flash", attemptIndex: 1 }),
    ).toBe("gemini-2.0-flash");
  });
});

describe("modelStreamSession", () => {
  it("tracks attempt budget for local runtime", () => {
    let session = createModelStreamSession({
      provider: "ollama",
      primaryModel: "llama3.2:3b",
      repairModel: "qwen2.5-coder:7b",
    });
    expect(canRetryModelStream(session)).toBe(true);
    session = bumpModelStreamAttempt(session);
    expect(session.attemptIndex).toBe(1);
    expect(canRetryModelStream(session)).toBe(true);
    session = bumpModelStreamAttempt(session);
    expect(canRetryModelStream(session)).toBe(false);
  });

  it("never retries cloud streams", () => {
    const session = createModelStreamSession({
      provider: "gemini",
      primaryModel: "gemini-2.0-flash",
    });
    expect(canRetryModelStream(session)).toBe(false);
  });
});

describe("inferenceStackPlan", () => {
  it("documents reference tags by role", () => {
    expect(LAVASH_INFERENCE_STACK_PLAN.models.length).toBeGreaterThanOrEqual(4);
    expect(inferenceStackMainModelTag()).toBe("qwen3-coder:30b");
    expect(inferenceStackFastModelTag()).toBe("qwen2.5-coder:7b");
    expect(inferenceStackModelForRole("vision")).toBe("qwen2.5vl:7b");
  });
});
