import { readConstructChatApiKey } from "@/features/lavashconstruct/chat/model/constructChatSettings";

const IMPROVE_PROMPT_MODEL = "gemini-2.0-flash";

export async function improvePrompt(userInput: string): Promise<string> {
  const trimmed = userInput.trim();
  if (!trimmed) return userInput;

  const apiKey = readConstructChatApiKey("gemini");
  if (!apiKey?.trim()) {
    return userInput;
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${IMPROVE_PROMPT_MODEL}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey.trim(),
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `Rewrite the user's message to be clearer and more specific for LAVASH Construct chat. Output ONLY the improved prompt, nothing else. Match the user's language.\n\nUser message: ${trimmed}`,
              },
            ],
          },
        ],
      }),
    },
  );

  if (!res.ok) {
    throw new Error(`Gemini improve prompt failed (${res.status})`);
  }

  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const improved = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  return improved || userInput;
}
