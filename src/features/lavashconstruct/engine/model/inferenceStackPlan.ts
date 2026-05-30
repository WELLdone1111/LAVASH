/** Planned self-hosted inference stack — reference only (see `.cursor/rules/lavash-inference-stack.mdc`). */

export type InferenceStackModelRole = "main" | "fallback-main" | "fast" | "plan-debug" | "vision";

export type InferenceStackModel = {
  role: InferenceStackModelRole;
  ollamaTag: string;
  vramGbQ4: string;
  notes: string;
};

export type InferenceStackHardwareTier = {
  id: string;
  gpu: string;
  ramGb: number;
  notes: string;
};

export const LAVASH_INFERENCE_STACK_PLAN = {
  version: 1 as const,
  hardware: {
    optimal: {
      id: "optimal-24gb",
      gpu: "RTX 3090 / 4090 24GB",
      ramGb: 32,
      notes: "Sweet spot for qwen3-coder:30b main agent",
    } satisfies InferenceStackHardwareTier,
    budget: {
      id: "budget-12gb",
      gpu: "RTX 3060 12GB / RTX 4070 12GB",
      ramGb: 32,
      notes: "14B models; engine may swap to repair tag on retry",
    } satisfies InferenceStackHardwareTier,
  },
  models: [
    {
      role: "main",
      ollamaTag: "qwen3-coder:30b",
      vramGbQ4: "17–24",
      notes: "Primary agent stream",
    },
    {
      role: "fallback-main",
      ollamaTag: "qwen2.5-coder:32b",
      vramGbQ4: "~22",
      notes: "Dense coding fallback if MoE unstable",
    },
    {
      role: "fast",
      ollamaTag: "qwen2.5-coder:7b",
      vramGbQ4: "~5",
      notes: "Repair / lightweight streams",
    },
    {
      role: "plan-debug",
      ollamaTag: "deepseek-r1:14b",
      vramGbQ4: "~8",
      notes: "Plan / Debug reasoning on server",
    },
    {
      role: "vision",
      ollamaTag: "qwen2.5vl:7b",
      vramGbQ4: "6–8",
      notes: "Screenshot artboard critique",
    },
  ] satisfies InferenceStackModel[],
  clientEnv: {
    ollamaHost: "OLLAMA_HOST=http://YOUR_SERVER:11434",
  },
} as const;

export function inferenceStackMainModelTag(): string {
  return LAVASH_INFERENCE_STACK_PLAN.models.find((m) => m.role === "main")?.ollamaTag ?? "qwen3-coder:30b";
}

export function inferenceStackFastModelTag(): string {
  return LAVASH_INFERENCE_STACK_PLAN.models.find((m) => m.role === "fast")?.ollamaTag ?? "qwen2.5-coder:7b";
}

export function inferenceStackModelForRole(role: InferenceStackModelRole): string | undefined {
  return LAVASH_INFERENCE_STACK_PLAN.models.find((m) => m.role === role)?.ollamaTag;
}
