import { describe, expect, it } from "vitest";
import {
  canIdeBrowserGoBack,
  canIdeBrowserGoForward,
  createIdeBrowserTab,
  getIdeBrowserHistoryEntries,
  goIdeBrowserHome,
  ideBrowserGoBack,
  ideBrowserGoForward,
  ideBrowserGoToHistoryIndex,
  pushIdeBrowserHistory,
  searchIdeBrowserTab,
} from "@/features/ide-browser/model/ideBrowserTab";
import { getIdeBrowserHomeUrl } from "@/features/ide-browser/model/ideBrowserHomeUrl";

describe("ideBrowserTab history", () => {
  it("pushes unique urls and skips duplicate tail", () => {
    let tab = createIdeBrowserTab();
    tab = pushIdeBrowserHistory(tab, "https://www.google.com/search?q=a", "a");
    tab = pushIdeBrowserHistory(tab, "https://example.com");
    expect(tab.history).toHaveLength(3);
    tab = pushIdeBrowserHistory(tab, "https://example.com");
    expect(tab.history).toHaveLength(3);
  });

  it("goes back and forward", () => {
    let tab = searchIdeBrowserTab(createIdeBrowserTab(), "lavash");
    tab = pushIdeBrowserHistory(tab, "https://github.com");
    expect(canIdeBrowserGoBack(tab)).toBe(true);
    const back = ideBrowserGoBack(tab);
    expect(back?.url).toContain("google.com/search");
    expect(canIdeBrowserGoForward(back!)).toBe(true);
    const forward = ideBrowserGoForward(back!);
    expect(forward?.url).toBe("https://github.com");
  });

  it("jumps to history index and goes home", () => {
    let tab = createIdeBrowserTab();
    tab = pushIdeBrowserHistory(tab, "https://www.google.com/search?q=test", "test");
    tab = pushIdeBrowserHistory(tab, "https://github.com");
    const jumped = ideBrowserGoToHistoryIndex(tab, 1);
    expect(jumped?.url).toContain("google.com/search");
    const home = goIdeBrowserHome(tab);
    expect(home.url).toBe(getIdeBrowserHomeUrl());
    const entries = getIdeBrowserHistoryEntries(home, "Google");
    expect(entries.some((e) => e.isCurrent)).toBe(true);
  });
});
