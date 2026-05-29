import { describe, expect, it } from "vitest";
import {
  getIdeBrowserHomeUrl,
  isIdeBrowserHomeUrl,
  needsIdeBrowserNativeWebview,
} from "./ideBrowserHomeUrl";

describe("ideBrowserHomeUrl", () => {
  it("builds home url from window origin when available", () => {
    expect(getIdeBrowserHomeUrl()).toMatch(/\/ide-browser\/google-search\.html$/);
  });

  it("detects home page path", () => {
    expect(isIdeBrowserHomeUrl("http://localhost:1421/ide-browser/google-search.html")).toBe(true);
    expect(isIdeBrowserHomeUrl("https://www.google.com/search?q=test")).toBe(false);
  });

  it("uses native webview only for external pages", () => {
    expect(needsIdeBrowserNativeWebview(getIdeBrowserHomeUrl())).toBe(false);
    expect(needsIdeBrowserNativeWebview("https://www.google.com/search?q=test")).toBe(true);
  });
});
