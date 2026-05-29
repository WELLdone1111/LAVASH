import { invoke, isTauri } from "@tauri-apps/api/core";
import { readConstructChatApiKey } from "@/features/lavashconstruct/chat/model/constructChatSettings";

export type GeminiGeneratedImage = {
  mimeType: string;
  dataUrl: string;
  base64: string;
};

export async function generateConstructGeminiImage(prompt: string): Promise<GeminiGeneratedImage> {
  if (!isTauri()) {
    throw new Error("Gemini image generation requires LAVASH desktop.");
  }
  const apiKey = readConstructChatApiKey("gemini").trim();
  if (!apiKey) {
    throw new Error("Gemini API key is required for image generation.");
  }
  const result = await invoke<{
    mimeType: string;
    dataBase64: string;
  }>("lavash_construct_generate_gemini_image", {
    apiKey,
    prompt: prompt.trim(),
    model: "gemini-2.5-flash-image",
    aspectRatio: "1:1",
  });
  const mimeType = result.mimeType.trim() || "image/png";
  const base64 = result.dataBase64.trim();
  if (!base64) throw new Error("Gemini returned an empty image.");
  const dataUrl = `data:${mimeType};base64,${base64}`;
  return { mimeType, dataUrl, base64 };
}
