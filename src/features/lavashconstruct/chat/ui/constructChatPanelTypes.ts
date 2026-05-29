import { useLayoutEffect, useRef } from "react";
import {
  mergeTabModelsFromStorage,
  readConstructChatSettings,
  CONSTRUCT_CHAT_TABS_STORAGE_KEY,
} from "@/features/lavashconstruct/chat/model/constructChatSettings";
import {
  isConstructChatProvider,
  type ConstructChatProvider,
} from "@/features/lavashconstruct/chat/model/constructChatProviders";
import { stripWelcomeMessages } from "@/features/lavashconstruct/chat/model/constructChatWelcomeMessage";
import { ensureThreadFromTab } from "@/features/lavashconstruct/chat/model/constructChatThread";
import {
  isConstructChatAgentMode,
  type ConstructChatAgentMode,
} from "@/features/lavashconstruct/chat/model/constructChatAgentMode";
import type { ConstructChatRevertSnapshot } from "@/features/lavashconstruct/chat/model/constructChatRevertSnapshot";

export const MAX_CHAT_IMAGES = 4;
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
export const MAX_TEXT_FILE_BYTES = 512 * 1024;
export const MAX_PENDING_ATTACHMENTS = 6;

export type ChatAttachment =
  | {
      id: string;
      kind: "image";
      mimeType: string;
      dataUrl: string;
      base64: string;
    }
  | {
      id: string;
      kind: "text";
      name: string;
      mimeType: string;
      text: string;
    }
  | {
      id: string;
      kind: "file";
      name: string;
      size: number;
    };

export type ChatRole = "user" | "assistant";

export type OllamaTurn = {
  role: "user" | "assistant";
  content: string;
  images?: { mimeType: string; data: string }[];
};

export type ChatMessage = {
  id: string;
  role: ChatRole;
  text: string;
  attachments?: ChatAttachment[];
  variant?: "error";
  /** Відповідь ще стрімиться — CODE/артборд оновлюються на льоту. */
  streaming?: boolean;
  /** Стан workspace до застосування цієї відповіді (для Revert). */
  revertSnapshot?: ConstructChatRevertSnapshot;
};

/** Одна вкладка чату: свої повідомлення, модель і чернетка. */
export type ConstructChatTab = {
  id: string;
  /** Порожній рядок — показуємо «Чат n». */
  title: string;
  messages: ChatMessage[];
  ollamaThread: OllamaTurn[];
  provider: ConstructChatProvider;
  models: Partial<Record<ConstructChatProvider, string>>;
  draft: string;
  pendingAttachments: ChatAttachment[];
  /** Закріплена панель артборду (Mark) — фокус для LAVASH. */
  markedPanelId: string | null;
  markedPanelTitle: string | null;
  agentMode: ConstructChatAgentMode;
};

export function buildTabFromSettings(id: string, title: string): ConstructChatTab {
  const s = readConstructChatSettings();
  return {
    id,
    title,
    messages: [],
    ollamaThread: [],
    provider: s.provider,
    models: {},
    draft: "",
    pendingAttachments: [],
    markedPanelId: null,
    markedPanelTitle: null,
    agentMode: "agent",
  };
}

export function tryParseStoredTabs(): { tabs: ConstructChatTab[]; activeTabId: string } | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(CONSTRUCT_CHAT_TABS_STORAGE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as { activeTabId?: string; tabs?: unknown };
    if (typeof p?.activeTabId !== "string" || !Array.isArray(p.tabs) || p.tabs.length === 0) return null;
    const tabs: ConstructChatTab[] = [];
    for (const item of p.tabs) {
      if (!item || typeof item !== "object") continue;
      const o = item as Record<string, unknown>;
      if (typeof o.id !== "string" || !Array.isArray(o.messages)) continue;
      const prov = isConstructChatProvider(o.provider) ? o.provider : "ollama";
      const modelsPartial =
        o.models && typeof o.models === "object" && !Array.isArray(o.models)
          ? (o.models as Partial<Record<ConstructChatProvider, string>>)
          : undefined;
      const messages = stripWelcomeMessages(o.messages as ChatMessage[]);
      tabs.push({
        id: o.id,
        title: typeof o.title === "string" ? o.title : "",
        messages,
        ollamaThread: ensureThreadFromTab({
          messages,
          ollamaThread: Array.isArray(o.ollamaThread) ? (o.ollamaThread as OllamaTurn[]) : [],
        }),
        provider: prov,
        models: mergeTabModelsFromStorage(modelsPartial, o),
        draft: typeof o.draft === "string" ? o.draft : "",
        pendingAttachments: Array.isArray(o.pendingAttachments) ? (o.pendingAttachments as ChatAttachment[]) : [],
        markedPanelId: typeof o.markedPanelId === "string" ? o.markedPanelId : null,
        markedPanelTitle: typeof o.markedPanelTitle === "string" ? o.markedPanelTitle : null,
        agentMode: isConstructChatAgentMode(o.agentMode) ? o.agentMode : "agent",
      });
    }
    if (tabs.length === 0 || !tabs.some((x) => x.id === p.activeTabId)) return null;
    return { tabs, activeTabId: p.activeTabId };
  } catch {
    return null;
  }
}

function initialTabsState(): { tabs: ConstructChatTab[]; activeTabId: string } {
  const loaded = tryParseStoredTabs();
  if (loaded) return loaded;
  const id = `tab-${crypto.randomUUID().slice(0, 10)}`;
  return { tabs: [buildTabFromSettings(id, "")], activeTabId: id };
}

export function getConstructChatTabsInitial(): { tabs: ConstructChatTab[]; activeTabId: string } {
  return initialTabsState();
}

export function parseDataUrlToAttachment(dataUrl: string): Omit<Extract<ChatAttachment, { kind: "image" }>, "id"> | null {
  const m = /^data:([^;,]+);base64,(.+)$/s.exec(dataUrl.replace(/\s/g, ""));
  if (!m) return null;
  let mimeType = m[1].trim().toLowerCase();
  if (mimeType === "image/jpg") mimeType = "image/jpeg";
  const allowed = ["image/png", "image/jpeg", "image/webp", "image/gif"];
  if (!allowed.includes(mimeType)) return null;
  const base64 = m[2];
  const approxBytes = (base64.length * 3) / 4;
  if (approxBytes > MAX_IMAGE_BYTES) return null;
  if (base64.length < 32) return null;
  return { kind: "image", mimeType, dataUrl, base64 };
}

const TEXT_FILE_NAME_RE = /\.(txt|md|json|csv|xml|html?|css|js|mjs|cjs|ts|tsx|jsx|log|yml|yaml)$/i;

async function fileToImageAttachment(file: File): Promise<Omit<Extract<ChatAttachment, { kind: "image" }>, "id"> | null> {
  if (!file.type.startsWith("image/")) return null;
  if (file.size > MAX_IMAGE_BYTES) return null;
  const dataUrl = await new Promise<string | null>((resolve) => {
    const r = new FileReader();
    r.onload = () => resolve(typeof r.result === "string" ? r.result : null);
    r.onerror = () => resolve(null);
    r.readAsDataURL(file);
  });
  if (!dataUrl) return null;
  return parseDataUrlToAttachment(dataUrl);
}

export async function fileToPendingAttachment(file: File): Promise<ChatAttachment | null> {
  if (file.type.startsWith("image/")) {
    const part = await fileToImageAttachment(file);
    return part ? { ...part, id: `img-${crypto.randomUUID().slice(0, 10)}` } : null;
  }
  if (file.type.startsWith("text/") || TEXT_FILE_NAME_RE.test(file.name)) {
    if (file.size > MAX_TEXT_FILE_BYTES) return null;
    try {
      const text = await file.text();
      return {
        id: `txt-${crypto.randomUUID().slice(0, 10)}`,
        kind: "text",
        name: file.name,
        mimeType: file.type || "text/plain",
        text,
      };
    } catch {
      return null;
    }
  }
  if (file.size <= 2 * 1024 * 1024) {
    return {
      id: `bin-${crypto.randomUUID().slice(0, 10)}`,
      kind: "file",
      name: file.name,
      size: file.size,
    };
  }
  return null;
}

/** Груба евристика: чи варто гнати текст через UK→EN перед локальною Ollama. */
export function looksLikeUkrainian(text: string): boolean {
  const cyr = (text.match(/[А-Яа-яІіЇїЄєҐґ]/g) ?? []).length;
  const lat = (text.match(/[A-Za-z]/g) ?? []).length;
  return cyr >= 4 && cyr >= lat * 0.35;
}

/** Відсікає російський ввід від «українського» моста (інакше модель одержує EN-режим і кальки). */
export function looksLikeRussian(text: string): boolean {
  if (/[ІіЇїЄєҐґ]/.test(text)) return false;
  if (/[ЁёЫыЭэЪъ]/.test(text)) return true;
  const t = text.toLowerCase();
  return /\b(ещё|ничего|сейчас|почему|который|этого|чтобы|будто|всё\s|это\s|что\s|нет\s)\b/.test(t);
}

export function formatInvokeErr(e: unknown): string {
  if (typeof e === "string") return e;
  if (e instanceof Error) return e.message;
  return String(e);
}

export function tauriIpcReady(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as Window & {
    __TAURI_INTERNALS__?: { invoke?: (...args: unknown[]) => Promise<unknown> };
  };
  return typeof w.__TAURI_INTERNALS__?.invoke === "function";
}

export const COMPOSER_MAX_PX = 168;
export const COMPOSER_MIN_ROWS = 1;
/** Одна лінія поля вводу (px) — узгоджено з padding/line-height у `.lc-chat-panel__input`. */
export const COMPOSER_EMPTY_HEIGHT_PX = 36;
/** Компактний boxed-композер: 13px × line-height 1.45 без рамки. */
export const COMPOSER_BOXED_EMPTY_HEIGHT_PX = 20;

export function applyComposerTextareaHeight(el: HTMLTextAreaElement, value: string) {
  const boxed = el.classList.contains("lc-chat-panel__input--boxed");
  const emptyHeight = boxed ? COMPOSER_BOXED_EMPTY_HEIGHT_PX : COMPOSER_EMPTY_HEIGHT_PX;
  const empty = !value.trim();
  if (empty) {
    el.style.height = `${emptyHeight}px`;
    el.style.overflowY = "hidden";
    return;
  }
  // `auto` (not `0`) — scrollHeight stays sane when the panel was hidden or just remounted.
  el.style.height = "auto";
  const scroll = el.scrollHeight;
  const capped = Math.min(scroll, COMPOSER_MAX_PX);
  el.style.height = `${Math.max(capped, emptyHeight)}px`;
  el.style.overflowY = scroll > COMPOSER_MAX_PX ? "auto" : "hidden";
}

export function useAutosizeTextarea(value: string) {
  const ref = useRef<HTMLTextAreaElement | null>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    let cancelled = false;
    const measure = () => {
      if (!cancelled && ref.current) applyComposerTextareaHeight(ref.current, value);
    };

    measure();
    const raf = requestAnimationFrame(() => {
      measure();
      requestAnimationFrame(measure);
    });

    const ro = new ResizeObserver(() => {
      if (document.documentElement.hasAttribute("data-lc-split-dragging")) return;
      if (document.documentElement.hasAttribute("data-window-resizing")) return;
      measure();
    });
    ro.observe(el);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [value]);
  return ref;
}
