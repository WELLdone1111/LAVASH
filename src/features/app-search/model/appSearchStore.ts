import { create } from "zustand";
import type { AppSearchItem } from "./types";

type AppSearchState = {
  dynamicItems: AppSearchItem[];
  setDynamicItems: (items: AppSearchItem[]) => void;
};

export const useAppSearchStore = create<AppSearchState>((set) => ({
  dynamicItems: [],
  setDynamicItems: (items) => set({ dynamicItems: items }),
}));
