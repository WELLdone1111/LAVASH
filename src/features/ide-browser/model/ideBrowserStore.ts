import { create } from "zustand";
import {
  createIdeBrowserTab,
  goIdeBrowserHome,
  ideBrowserGoBack,
  ideBrowserGoForward,
  ideBrowserGoToHistoryIndex,
  navigateIdeBrowserTab,
  pushIdeBrowserHistory,
  searchIdeBrowserTab,
  type IdeBrowserTab,
} from "@/features/ide-browser/model/ideBrowserTab";
import { getIdeBrowserHomeUrl } from "@/features/ide-browser/model/ideBrowserHomeUrl";

type IdeBrowserStore = {
  open: boolean;
  tabs: IdeBrowserTab[];
  activeTabId: string;
  openHome: () => void;
  openSearch: (query: string) => void;
  navigate: (url: string) => void;
  addTab: () => void;
  closeTab: (tabId: string) => void;
  selectTab: (tabId: string) => void;
  goBack: () => void;
  goForward: () => void;
  goHome: () => void;
  goToHistory: (index: number) => void;
  close: () => void;
};

function mapActiveTab(
  state: Pick<IdeBrowserStore, "tabs" | "activeTabId">,
  updater: (tab: IdeBrowserTab) => IdeBrowserTab,
): Pick<IdeBrowserStore, "tabs" | "activeTabId"> | null {
  const index = state.tabs.findIndex((t) => t.id === state.activeTabId);
  if (index < 0) return null;
  const nextTabs = [...state.tabs];
  nextTabs[index] = updater(nextTabs[index]);
  return { tabs: nextTabs, activeTabId: state.activeTabId };
}

function initialState(): Pick<IdeBrowserStore, "open" | "tabs" | "activeTabId"> {
  const tab = createIdeBrowserTab();
  return { open: false, tabs: [tab], activeTabId: tab.id };
}

const boot = initialState();

export const useIdeBrowserStore = create<IdeBrowserStore>((set, get) => ({
  ...boot,

  openHome: () => {
    const home = getIdeBrowserHomeUrl();
    const { open, tabs, activeTabId } = get();
    if (!open) {
      const tab = createIdeBrowserTab({ url: home });
      set({ open: true, tabs: [tab], activeTabId: tab.id });
      return;
    }
    const next = mapActiveTab({ tabs, activeTabId }, (tab) =>
      pushIdeBrowserHistory({ ...tab, query: "" }, home),
    );
    if (next) set({ open: true, ...next });
  },

  openSearch: (query) => {
    const { open, tabs, activeTabId } = get();
    if (!open) {
      const tab = searchIdeBrowserTab(createIdeBrowserTab(), query);
      set({ open: true, tabs: [tab], activeTabId: tab.id });
      return;
    }
    const next = mapActiveTab({ tabs, activeTabId }, (tab) => searchIdeBrowserTab(tab, query));
    if (next) set({ open: true, ...next });
  },

  navigate: (url) => {
    const next = mapActiveTab(get(), (tab) => navigateIdeBrowserTab(tab, url));
    if (next) set({ open: true, ...next });
  },

  addTab: () => {
    const home = getIdeBrowserHomeUrl();
    const tab = createIdeBrowserTab({ url: home, query: "" });
    set((state) => ({
      open: true,
      tabs: [...state.tabs, tab],
      activeTabId: tab.id,
    }));
  },

  closeTab: (tabId) => {
    set((state) => {
      const index = state.tabs.findIndex((t) => t.id === tabId);
      if (index < 0) return state;

      const remaining = state.tabs.filter((t) => t.id !== tabId);
      if (remaining.length === 0) {
        const fresh = createIdeBrowserTab();
        return { open: false, tabs: [fresh], activeTabId: fresh.id };
      }

      let activeTabId = state.activeTabId;
      if (activeTabId === tabId) {
        const nextIndex = Math.min(index, remaining.length - 1);
        activeTabId = remaining[nextIndex].id;
      }

      return { tabs: remaining, activeTabId };
    });
  },

  selectTab: (tabId) => {
    if (get().tabs.some((t) => t.id === tabId)) set({ activeTabId: tabId });
  },

  goBack: () => {
    const next = mapActiveTab(get(), (tab) => ideBrowserGoBack(tab) ?? tab);
    if (next) set(next);
  },

  goForward: () => {
    const next = mapActiveTab(get(), (tab) => ideBrowserGoForward(tab) ?? tab);
    if (next) set(next);
  },

  goHome: () => {
    const next = mapActiveTab(get(), (tab) => goIdeBrowserHome(tab));
    if (next) set({ open: true, ...next });
  },

  goToHistory: (index) => {
    const next = mapActiveTab(get(), (tab) => ideBrowserGoToHistoryIndex(tab, index) ?? tab);
    if (next) set(next);
  },

  close: () => set({ open: false }),
}));

export function selectActiveIdeBrowserTab(state: IdeBrowserStore): IdeBrowserTab | undefined {
  return state.tabs.find((t) => t.id === state.activeTabId);
}

export function selectIdeBrowserUrl(state: IdeBrowserStore): string {
  return selectActiveIdeBrowserTab(state)?.url ?? getIdeBrowserHomeUrl();
}

export function selectIdeBrowserQuery(state: IdeBrowserStore): string {
  return selectActiveIdeBrowserTab(state)?.query ?? "";
}
