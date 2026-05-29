import { invoke } from "@tauri-apps/api/core";
import { stripCodeFencesForChatDisplay } from "@/features/lavashconstruct/chat/model/constructAssistantDisplay";

/** Ollama UK-bridge: перекладає лише прозу (без ``` fences), щоб translate-модель не «переказувала» код. */
export async function translateOllamaEnReplyProseToUk(
  fullReplyEn: string,
  model: string | null,
  looksLikeUkrainian: (text: string) => boolean,
): Promise<string> {
  const prose = stripCodeFencesForChatDisplay(fullReplyEn).trim();
  if (!prose) return "";

  const run = () =>
    invoke<string>("ollama_translate", {
      text: prose,
      sourceLang: "en",
      targetLang: "uk",
      model: model?.trim() || null,
    });

  let outUk = (await run()).trim();
  if (outUk.length > 0 && !looksLikeUkrainian(outUk)) {
    try {
      const r2 = (await run()).trim();
      if (r2.length > 0 && (looksLikeUkrainian(r2) || r2.length >= outUk.length * 0.9)) {
        outUk = r2;
      }
    } catch {
      /* лишаємо перший переклад */
    }
  }
  return outUk.length > 0 ? outUk : prose;
}
