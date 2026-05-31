import { invoke, isTauri } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { getConstructProviderDef, type ConstructChatProvider } from "@/features/lavashconstruct/chat/model/constructChatProviders";

export const CONSTRUCT_CHAT_STREAM_EVENT = "lc-chat-stream";

export type ConstructChatStreamPayload = {
  streamId: string;
  delta?: string;
  thinkingDelta?: string;
  done?: boolean;
  error?: string;
};

export type RunConstructChatStreamArgs = {
  streamId: string;
  provider: ConstructChatProvider;
  apiKey: string;
  model: string;
  baseUrl?: string;
  httpReferer?: string | null;
  messages: {
    role: string;
    content: string;
    images?: { mimeType: string; data: string }[];
  }[];
  replyInEnglish: boolean;
  preferUkrainian: boolean;
  userSignedIn: boolean;
  modelOverride?: string | null;
  onDelta?: (delta: string, full: string) => void;
  onThinkingDelta?: (delta: string, full: string) => void;
  signal?: AbortSignal;
};

export async function runConstructChatStream(args: RunConstructChatStreamArgs): Promise<string> {
  if (!isTauri()) {
    throw new Error("Streaming requires LAVASH desktop.");
  }

  const def = getConstructProviderDef(args.provider);
  let full = "";
  let thinkingFull = "";
  let settled = false;
  let resolveDone!: (value: string) => void;
  let rejectDone!: (reason: Error) => void;
  const donePromise = new Promise<string>((resolve, reject) => {
    resolveDone = resolve;
    rejectDone = reject;
  });

  let unlisten: UnlistenFn | null = null;
  const onAbort = () => {
    if (settled) return;
    settled = true;
    rejectDone(new Error("aborted"));
  };
  args.signal?.addEventListener("abort", onAbort, { once: true });

  try {
    unlisten = await listen<ConstructChatStreamPayload>(CONSTRUCT_CHAT_STREAM_EVENT, (ev) => {
      const p = ev.payload;
      if (!p || p.streamId !== args.streamId) return;

      if (p.error) {
        if (!settled) {
          settled = true;
          rejectDone(new Error(p.error));
        }
        return;
      }

      if (p.delta) {
        full += p.delta;
        args.onDelta?.(p.delta, full);
      }

      if (p.thinkingDelta) {
        thinkingFull += p.thinkingDelta;
        args.onThinkingDelta?.(p.thinkingDelta, thinkingFull);
      }

      if (p.done) {
        if (!settled) {
          settled = true;
          resolveDone(full);
        }
      }
    });

    const common = {
      streamId: args.streamId,
      messages: args.messages,
      replyInEnglish: args.replyInEnglish,
      preferUkrainian: args.preferUkrainian,
      userSignedIn: args.userSignedIn,
    };

    if (def.kind === "local") {
      await invoke("lavash_construct_chat_stream_ollama", {
        ...common,
        model: args.modelOverride?.trim() || args.model?.trim() || null,
      });
    } else if (def.kind === "gemini") {
      await invoke("lavash_construct_chat_stream_gemini", {
        ...common,
        apiKey: args.apiKey,
        model: args.model,
      });
    } else {
      await invoke("lavash_construct_chat_stream_openai_compat", {
        ...common,
        providerLabel: def.label,
        apiKey: args.apiKey,
        baseUrl: args.baseUrl ?? def.baseUrl ?? "",
        model: args.model,
        httpReferer: args.httpReferer ?? null,
      });
    }

    return await donePromise;
  } finally {
    args.signal?.removeEventListener("abort", onAbort);
    if (unlisten) void unlisten();
  }
}
