import {
  writeConstructChatModel,
  writeConstructChatProvider,
} from "@/features/lavashconstruct/chat/model/constructChatSettings";
import { dispatchConstructChatPatchActiveTab } from "@/features/lavashconstruct/chat/model/constructChatModelBus";
import type { ConstructChatProvider } from "@/features/lavashconstruct/chat/model/constructChatProviders";

export type ConstructChatModelRef = {
  provider: ConstructChatProvider;
  modelId: string;
};

/**
 * Єдиний шлях: налаштування / picker / pull → global storage + активна вкладка чату.
 * Без цього writeConstructChatModel оновлює лише localStorage-key, а tab.models лишається старим.
 */
export function applyConstructChatModelSelection(
  ref: ConstructChatModelRef,
  options?: { switchProvider?: boolean },
): void {
  const modelId = ref.modelId.trim();
  if (!modelId) return;

  writeConstructChatModel(ref.provider, modelId);

  const switchProvider = options?.switchProvider !== false;
  if (switchProvider) {
    writeConstructChatProvider(ref.provider);
  }

  dispatchConstructChatPatchActiveTab({
    ...(switchProvider ? { provider: ref.provider } : {}),
    models: { [ref.provider]: modelId },
  });
}
