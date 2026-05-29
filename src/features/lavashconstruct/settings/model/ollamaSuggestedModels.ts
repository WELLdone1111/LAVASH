/** Популярні теги `ollama pull` — показуються в розділі «Моделі» (Ollama). */
export type OllamaSuggestedModel = {
  tag: string;
  shortName: string;
  /** Орієнтовний розмір завантаження (ГБ) до pull. */
  approxDownloadGb: number;
};

export const OLLAMA_SUGGESTED_MODELS: readonly OllamaSuggestedModel[] = [
  { tag: "llama4", shortName: "Llama 4", approxDownloadGb: 8 },
  { tag: "qwen3", shortName: "Qwen 3", approxDownloadGb: 5 },
  { tag: "deepseek-r1", shortName: "DeepSeek R1", approxDownloadGb: 5.2 },
  { tag: "mistral-large", shortName: "Mistral Large 2", approxDownloadGb: 26 },
  { tag: "llama3.2:3b", shortName: "Llama 3.2", approxDownloadGb: 2.0 },
  { tag: "llama3.1:8b", shortName: "Llama 3.1", approxDownloadGb: 4.7 },
  { tag: "gemma4:e4b", shortName: "Gemma 4 E4B", approxDownloadGb: 9.6 },
  { tag: "qwen2.5:7b", shortName: "Qwen 2.5", approxDownloadGb: 4.5 },
  { tag: "phi3:mini", shortName: "Phi-3 mini", approxDownloadGb: 2.2 },
] as const;
