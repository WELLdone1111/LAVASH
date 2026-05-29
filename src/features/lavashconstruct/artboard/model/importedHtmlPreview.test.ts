import { describe, expect, it } from "vitest";
import {
  inferHtmlPreviewPanelSize,
  prepareHtmlForArtboardPreview,
  repairAssistantHtmlDocument,
} from "@/features/lavashconstruct/artboard/model/import";

describe("imported HTML preview helpers", () => {
  it("repairs unclosed <style> before body markup", () => {
    const broken = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
.player { width: 360px; height: 120px; background: #111; border-radius: 16px; }
<div class="player"><button type="button">Play</button></div>
</html>`;

    const { html, repaired } = repairAssistantHtmlDocument(broken);
    expect(repaired).toBe(true);
    expect(html).toContain("</style></head><body>");
    expect(html).toContain('<div class="player">');
    expect(html).toContain("</body></html>");
  });

  it("injects transparent artboard base css for full documents", () => {
    const { html } = prepareHtmlForArtboardPreview(
      "<!DOCTYPE html><html><head></head><body><div>ok</div></body></html>",
    );
    expect(html).toContain('data-lc-artboard-base="1"');
    expect(html).toContain("background:transparent!important");
  });

  it("infers panel size from embedded CSS", () => {
    const html = `<!DOCTYPE html><html><head><style>
.neon-player { width: 360px; height: 480px; }
</style></head><body><div class="neon-player"></div></body></html>`;
    expect(inferHtmlPreviewPanelSize(html)).toEqual({ width: 376, height: 496 });
  });
});
