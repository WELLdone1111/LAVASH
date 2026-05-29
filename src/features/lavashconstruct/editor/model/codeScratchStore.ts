import { create } from "zustand";
import { isAssistantPanelFence } from "@/features/lavashconstruct/chat/model/assistantFenceHints";

const SCRATCH_STORAGE_KEY = "lavash.construct.codeScratch.v2";
export type ConstructCodeTab = {
  id: string;
  label: string;
  content: string;
};

export type ParsedCodeFence = {
  lang: string;
  tabHint: string;
  body: string;
};

/** Розбір ```info\nbody``` з відповіді Лаваша. У рядку `info`: перший токен — мова, решта — підказка назви вкладки (напр. `tsx player`). */
export function parseCodeFencesFromMarkdown(markdown: string): ParsedCodeFence[] {
  const re = /```([^\n\r]*)\r?\n([\s\S]*?)```/g;
  const out: ParsedCodeFence[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(markdown)) !== null) {
    const meta = (m[1] ?? "").trim();
    const body = (m[2] ?? "").replace(/\r\n/g, "\n");
    const tokens = meta.split(/\s+/).filter(Boolean);
    const lang = tokens[0] ?? "";
    const tabHint = tokens.slice(1).join(" ").trim();
    if (!body.trim() && !lang) continue;
    out.push({ lang, tabHint, body });
  }
  return out;
}

function safeTabs(raw: unknown): ConstructCodeTab[] | null {
  if (!Array.isArray(raw)) return null;
  const tabs: ConstructCodeTab[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Partial<ConstructCodeTab>;
    const id = typeof o.id === "string" && o.id.trim() ? o.id.trim().slice(0, 80) : "";
    const label = typeof o.label === "string" && o.label.trim() ? o.label.trim().slice(0, 40) : "Код";
    const content = typeof o.content === "string" ? o.content : "";
    if (!id) continue;
    tabs.push({ id, label, content });
  }
  return tabs.length > 0 ? tabs : null;
}

function readPersisted(): { tabs: ConstructCodeTab[]; activeTabId: string } {
  if (typeof localStorage === "undefined") {
    const id = "scratch-main";
    return { tabs: [{ id, label: "Чернетка", content: "" }], activeTabId: id };
  }
  try {
    const v2 = localStorage.getItem(SCRATCH_STORAGE_KEY);
    if (v2) {
      const p = JSON.parse(v2) as { tabs?: unknown; activeTabId?: unknown };
      const tabs = safeTabs(p.tabs);
      if (tabs) {
        const active =
          typeof p.activeTabId === "string" && tabs.some((t) => t.id === p.activeTabId)
            ? p.activeTabId
            : tabs[0].id;
        try {
          localStorage.setItem(SCRATCH_STORAGE_KEY, v2);
        } catch {
          /* пофіг */
        }
        return { tabs, activeTabId: active };
      }
    }
    const id = "scratch-main";
    return { tabs: [{ id, label: "Чернетка", content: "" }], activeTabId: id };
  } catch {
    const id = "scratch-main";
    return { tabs: [{ id, label: "Чернетка", content: "" }], activeTabId: id };
  }
}

function persistState(tabs: ConstructCodeTab[], activeTabId: string) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(SCRATCH_STORAGE_KEY, JSON.stringify({ tabs, activeTabId }));
  } catch {
    /* пофіг */
  }
}

type CodeScratchState = {
  tabs: ConstructCodeTab[];
  activeTabId: string;
};

export type ApplyAssistantMarkdownOptions = {
  /**
   * Якщо в відповіді рівно один fence-код: оновити цю вкладку (наприклад прив’язану до виділеної панелі на артборді),
   * а не лише поточну активну.
   */
  preferScratchTabId?: string | null;
};

type CodeScratchActions = {
  setActiveTabId: (id: string) => void;
  setTabContent: (id: string, content: string) => void;
  addTab: (label?: string) => void;
  removeTab: (id: string) => void;
  /** Після відповіді Лаваша: оновлює вкладки з markdown fenced blocks. */
  applyFromAssistantMarkdown: (markdown: string, options?: ApplyAssistantMarkdownOptions) => void;
  /** Повне відновлення вкладок (revert чату). */
  restoreSnapshot: (tabs: ConstructCodeTab[], activeTabId: string) => void;
};

const initial = readPersisted();

export const useConstructCodeScratchStore = create<CodeScratchState & CodeScratchActions>((set, get) => ({
  tabs: initial.tabs,
  activeTabId: initial.activeTabId,

  setActiveTabId: (id) => {
    const { tabs } = get();
    if (!tabs.some((t) => t.id === id)) return;
    set({ activeTabId: id });
    persistState(tabs, id);
  },

  setTabContent: (id, content) => {
    set((s) => {
      const tabs = s.tabs.map((t) => (t.id === id ? { ...t, content } : t));
      persistState(tabs, s.activeTabId);
      return { tabs };
    });
  },

  addTab: (label) => {
    const id = `scratch-${crypto.randomUUID().slice(0, 10)}`;
    const base = (label ?? "Нова").trim().slice(0, 32) || "Нова";
    set((s) => {
      const tabs = [...s.tabs, { id, label: base, content: "" }];
      persistState(tabs, id);
      return { tabs, activeTabId: id };
    });
  },

  removeTab: (id) => {
    set((s) => {
      if (s.tabs.length <= 1) return s;
      const tabs = s.tabs.filter((t) => t.id !== id);
      let activeTabId = s.activeTabId;
      if (!tabs.some((t) => t.id === activeTabId)) {
        activeTabId = tabs[0].id;
      }
      persistState(tabs, activeTabId);
      return { tabs, activeTabId };
    });
  },

  applyFromAssistantMarkdown: (markdown, options) => {
    const fences = parseCodeFencesFromMarkdown(markdown).filter(
      (f) => !isAssistantPanelFence(f.tabHint),
    );
    if (fences.length === 0) return;

    set((s) => {
      const tabs = [...s.tabs];
      let activeTabId = s.activeTabId;

      const preferId = options?.preferScratchTabId?.trim();
      const preferIdx = preferId ? tabs.findIndex((t) => t.id === preferId) : -1;

      const activeIdx = Math.max(
        0,
        tabs.findIndex((t) => t.id === activeTabId),
      );

      if (fences.length === 1) {
        const t =
          preferIdx >= 0 ? tabs[preferIdx] : (tabs[activeIdx] ?? tabs[0]);
        const i = tabs.findIndex((x) => x.id === t.id);
        tabs[i] = { ...t, content: fences[0].body };
        activeTabId = t.id;
        persistState(tabs, activeTabId);
        return { tabs, activeTabId };
      }

      let lastId = activeTabId;
      fences.forEach((fence, index) => {
        const hint = fence.tabHint.trim();
        if (index === 0 && !hint) {
          const t = tabs[activeIdx] ?? tabs[0];
          const i = tabs.findIndex((x) => x.id === t.id);
          tabs[i] = { ...t, content: fence.body };
          lastId = t.id;
          return;
        }

        const fallbackLabel = `${fence.lang || "код"} ${index + 1}`.trim().slice(0, 28);
        const label = (hint || fallbackLabel).slice(0, 28);

        let idx = -1;
        if (hint.length > 0) {
          const h = hint.toLowerCase();
          idx = tabs.findIndex((t) => t.label.toLowerCase() === h);
        }

        if (idx < 0) {
          const id = `scratch-${crypto.randomUUID().slice(0, 10)}`;
          tabs.push({ id, label, content: fence.body });
          lastId = id;
        } else {
          tabs[idx] = { ...tabs[idx], content: fence.body, label: tabs[idx].label || label };
          lastId = tabs[idx].id;
        }
      });

      activeTabId = lastId;
      persistState(tabs, activeTabId);
      return { tabs, activeTabId };
    });
  },

  restoreSnapshot: (tabs, activeTabId) => {
    const nextTabs = tabs.length > 0 ? tabs.map((t) => ({ ...t })) : [{ id: "scratch-main", label: "Чернетка", content: "" }];
    const nextActive =
      nextTabs.some((t) => t.id === activeTabId) ? activeTabId : nextTabs[0].id;
    set({ tabs: nextTabs, activeTabId: nextActive });
    persistState(nextTabs, nextActive);
  },
}));
