export const LAVASH_WELCOME_MESSAGE_ID = "lavash-welcome-v1";

export function isWelcomeConstructChatMessageId(id: string): boolean {
  return id.startsWith(LAVASH_WELCOME_MESSAGE_ID);
}

/** Прибирає старе welcome-повідомлення з збережених вкладок. */
export function stripWelcomeMessages<T extends { id: string }>(messages: T[]): T[] {
  return messages.filter((m) => !isWelcomeConstructChatMessageId(m.id));
}
