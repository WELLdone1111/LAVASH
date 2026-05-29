import { stripCodeFencesForChatDisplay } from "@/features/lavashconstruct/chat/model/constructAssistantDisplay";
import { getConstructProviderDef, type ConstructChatProvider } from "@/features/lavashconstruct/chat/model/constructChatProviders";
import { isWelcomeConstructChatMessageId } from "@/features/lavashconstruct/chat/model/constructChatWelcomeMessage";

export type ConstructChatThreadTurn = {
  role: "user" | "assistant";
  content: string;
  images?: { mimeType: string; data: string }[];
};

const CONSTRUCT_SNAPSHOT_MARK = "[LavashConstruct snapshot";
const USER_MESSAGE_MARK = "\n---\nUser message:\n";
const SYNC_NOTE_RE = /\n\n\[LavashConstruct sync\][^\n]*$/;

/** Скільки пар user/assistant тримати в контексті моделі. */
export const MAX_THREAD_TURNS = 48;
/** Загальний ліміт символів у thread для API (без system). */
export const MAX_THREAD_CHARS = 120_000;
/** Хмарні провайдери (Groq, Gemini, …) — менший thread, щоб уникнути HTTP 413. */
export const MAX_THREAD_CHARS_CLOUD = 28_000;

export function stripConstructSnapshotFromUserContent(content: string): string {
  const s = content.replace(/\r\n/g, "\n");
  const idx = s.indexOf(USER_MESSAGE_MARK);
  if (idx >= 0) return s.slice(idx + USER_MESSAGE_MARK.length).trim();
  if (s.includes(CONSTRUCT_SNAPSHOT_MARK)) return "";
  return s.trim();
}

export function buildUserContentWithConstructSnapshot(
  constructSnapshot: string,
  userBody: string,
): string {
  const snap = constructSnapshot.trim();
  const body = userBody.trim();
  if (!snap) return body || ".";
  if (!body) return snap;
  return `${snap}\n${body}`;
}

export function stripSyncNoteFromAssistant(content: string): string {
  return content.replace(SYNC_NOTE_RE, "").trim();
}

export function slimThreadTurn(turn: ConstructChatThreadTurn): ConstructChatThreadTurn {
  const role = turn.role;
  if (role === "user") {
    const content = stripConstructSnapshotFromUserContent(turn.content);
    return { role, content: content || "." };
  }
  return { role, content: stripSyncNoteFromAssistant(turn.content) };
}

/** Для хмари: без ```-блоків у assistant (код уже в CODE / на артборді). */
export function slimThreadTurnForCloud(turn: ConstructChatThreadTurn): ConstructChatThreadTurn {
  if (turn.role === "assistant") {
    const prose = stripCodeFencesForChatDisplay(stripSyncNoteFromAssistant(turn.content));
    return { role: turn.role, content: prose || stripSyncNoteFromAssistant(turn.content).slice(0, 500) };
  }
  return slimThreadTurn(turn);
}

export function slimThreadForProvider(
  turns: readonly ConstructChatThreadTurn[],
  provider: ConstructChatProvider,
): ConstructChatThreadTurn[] {
  const cloud = getConstructProviderDef(provider).kind !== "local";
  return turns
    .map((t) => (cloud ? slimThreadTurnForCloud(t) : slimThreadTurn(t)))
    .filter((t) => t.content.trim().length > 0);
}

export function slimThread(turns: readonly ConstructChatThreadTurn[]): ConstructChatThreadTurn[] {
  return turns.map(slimThreadTurn).filter((t) => t.content.trim().length > 0);
}

export function rebuildThreadFromUiMessages(
  messages: readonly { id: string; role: string; text: string; variant?: string }[],
): ConstructChatThreadTurn[] {
  const out: ConstructChatThreadTurn[] = [];
  for (const m of messages) {
    if (m.variant === "error") continue;
    if (m.role !== "user" && m.role !== "assistant") continue;
    if (isWelcomeConstructChatMessageId(m.id)) continue;
    const text = m.text.trim();
    if (!text) continue;
    out.push({ role: m.role, content: text });
  }
  return out;
}

export function ensureThreadFromTab(tab: {
  messages: readonly { id: string; role: string; text: string; variant?: string }[];
  ollamaThread: readonly ConstructChatThreadTurn[];
}): ConstructChatThreadTurn[] {
  const raw = tab.ollamaThread.length > 0 ? tab.ollamaThread : rebuildThreadFromUiMessages(tab.messages);
  return slimThread(raw);
}

export function trimThreadForApi(
  turns: readonly ConstructChatThreadTurn[],
  provider?: ConstructChatProvider,
): ConstructChatThreadTurn[] {
  const maxChars =
    provider && getConstructProviderDef(provider).kind !== "local"
      ? MAX_THREAD_CHARS_CLOUD
      : MAX_THREAD_CHARS;
  let slice = turns.length > MAX_THREAD_TURNS ? turns.slice(-MAX_THREAD_TURNS) : [...turns];
  let total = slice.reduce((n, t) => n + t.content.length, 0);
  while (total > maxChars && slice.length > 2) {
    slice = slice.slice(1);
    total = slice.reduce((n, t) => n + t.content.length, 0);
  }
  return slice;
}

export function buildApiThreadForSend(args: {
  priorSlim: readonly ConstructChatThreadTurn[];
  constructSnapshot: string;
  userBody: string;
  images?: ConstructChatThreadTurn["images"];
  provider?: ConstructChatProvider;
}): ConstructChatThreadTurn[] {
  const prior = trimThreadForApi(args.priorSlim, args.provider);
  const userContent = buildUserContentWithConstructSnapshot(args.constructSnapshot, args.userBody);
  const next: ConstructChatThreadTurn = {
    role: "user",
    content: userContent,
    ...(args.images?.length ? { images: args.images } : {}),
  };
  return [...prior, next];
}

export function appendSlimExchange(
  priorSlim: readonly ConstructChatThreadTurn[],
  userBody: string,
  assistantBody: string,
): ConstructChatThreadTurn[] {
  const userContent = userBody.trim() || ".";
  const assistantContent = stripSyncNoteFromAssistant(assistantBody);
  return slimThread([
    ...priorSlim,
    { role: "user", content: userContent },
    { role: "assistant", content: assistantContent },
  ]);
}
