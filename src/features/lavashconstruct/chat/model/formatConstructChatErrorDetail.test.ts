import { describe, expect, it } from "vitest";
import { formatConstructChatErrorDetail } from "./formatConstructChatErrorDetail";

const t = (key: string, vars?: Record<string, string | number>) => {
  if (key === "construct.chat.error.ollamaMemory" && vars) {
    return `memory:${vars.required}/${vars.available}`;
  }
  if (key === "construct.chat.error.ollamaModelNotFound" && vars) {
    return `missing:${vars.model}`;
  }
  return key;
};

describe("formatConstructChatErrorDetail", () => {
  it("parses Ollama memory HTTP 500 JSON", () => {
    const raw =
      'Ollama chat HTTP 500 Internal Server Error: {"error":"model requires more system memory (9.8 GiB) than is available (9.0 GiB)"}';
    expect(formatConstructChatErrorDetail(raw, t)).toBe("memory:9.8 GiB/9.0 GiB");
  });

  it("parses model not found", () => {
    const raw = '{"error":"model \\"llama3.2:3b\\" not found, try pulling it first"}';
    expect(formatConstructChatErrorDetail(raw, t)).toBe("missing:llama3.2:3b");
  });
});
