/** Local = Ollama (any tag, including remote OLLAMA_HOST). Cloud = hosted APIs. */
export type ModelRuntime = "local" | "cloud";

/** How many extra model streams are allowed after the first (local only). */
export type ModelRuntimeProfile = {
  runtime: ModelRuntime;
  maxRetryAttempts: number;
};

export type ModelRouteInput = {
  provider: string;
  primaryModel: string;
  /** Zero-based stream attempt (0 = first). */
  attemptIndex: number;
  /** Optional repair tag; falls back to engine settings. */
  repairModel?: string;
};

export type ModelEngineConfig = {
  provider: string;
  primaryModel: string;
  repairModel?: string;
};
