const ENGINE_OLLAMA_REPAIR_MODEL_KEY = "lavash.engine.ollamaRepairModel.v1";
const LEGACY_CUE_REPAIR_MODEL_KEY = "lavash.cue.ollamaRepairModel.v1";

function safeRead(key: string): string {
  if (typeof localStorage === "undefined") return "";
  try {
    return localStorage.getItem(key) ?? "";
  } catch {
    return "";
  }
}

function safeWrite(key: string, value: string) {
  if (typeof localStorage === "undefined") return;
  try {
    if (value.trim()) localStorage.setItem(key, value);
    else localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

/** Optional Ollama tag for repair streams (empty = reuse primary). */
export function readEngineOllamaRepairModel(): string {
  const current = safeRead(ENGINE_OLLAMA_REPAIR_MODEL_KEY).trim();
  if (current) return current;
  return safeRead(LEGACY_CUE_REPAIR_MODEL_KEY).trim();
}

export function writeEngineOllamaRepairModel(value: string) {
  safeWrite(ENGINE_OLLAMA_REPAIR_MODEL_KEY, value.trim());
}
