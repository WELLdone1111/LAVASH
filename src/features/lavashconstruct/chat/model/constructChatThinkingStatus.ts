import type { Locale } from "@/i18n/locale";

/** Кадри «блимаючих» рисок після фрази (thinkI|I|I|I|). */
export const LAVASH_THINKING_PIPE_FRAMES = [
  "I|",
  "I|I|",
  "I|I|I|",
  "I|I|I|I|",
  "|I|",
  "|I|I|",
  "i|",
  "i||",
  "I||",
  "i||I||",
  "I||I||",
  "|i|I|",
  "I|i|",
  "||I||",
  "I|||",
] as const;

const PHRASES_EN = [
  "Think",
  "Wait bro",
  "One moment",
  "Hold on",
  "Hmm",
  "Cooking answer",
  "Brain loading",
  "Almost there",
  "Let me see",
  "Working on it",
  "Typing",
  "Just a sec",
  "Pampushka mode",
  "Stirring thoughts",
  "Crunching tokens",
  "Lavash is thinking",
  "Don't rush me",
  "Loading vibes",
  "Ok ok",
  "Give me a beat",
  "Scanning context",
  "Patching reply",
  "Warming up",
  "Still here",
  "One sec bro",
] as const;

const PHRASES_UK = [
  "Думаю",
  "Стоп, бро",
  "Хвилинку",
  "Зачекай",
  "Хм",
  "Варю відповідь",
  "Мізки вантажу",
  "Майже",
  "Зараз гляну",
  "Працюю над цим",
  "Пишу",
  "Секунду",
  "Режим панмушки",
  "Мішу думки",
  "Жую токени",
  "Лаваш думає",
  "Не тисни",
  "Вантажу вайб",
  "Ок ок",
  "Дай біт",
  "Сканую контекст",
  "Латаю відповідь",
  "Розігріваюсь",
  "Я тут",
  "Секунда, бро",
] as const;

export function pickRandomThinkingPhrase(locale: Locale): string {
  const list = locale === "uk" ? PHRASES_UK : PHRASES_EN;
  const idx = Math.floor(Math.random() * list.length);
  return list[idx] ?? list[0];
}
