import { describe, expect, it } from "vitest";
import {
  resolveEditVisualKind,
  resolvePanelEditVisualKind,
} from "@/features/lavashconstruct/workspace/model/constructWorkspaceUtils";

describe("resolveEditVisualKind", () => {
  it("keeps HTML with comments as html, not jsx", () => {
    const html = `<h3 style="text-align: center;">Title</h3>
<!-- Album Art -->
<div class="album-art-container">
  <img src="https://example.com/a.png" />
</div>`;
    expect(resolveEditVisualKind(html)).toBe("html");
  });

  it("detects real TSX modules as jsx", () => {
    const tsx = `export default function Player() {
  return <div className="player">Hi</div>;
}`;
    expect(resolveEditVisualKind(tsx)).toBe("jsx");
  });
});

describe("resolvePanelEditVisualKind", () => {
  it("prefers stored panel kind over content sniffing", () => {
    const html = "<div>test</div>";
    expect(
      resolvePanelEditVisualKind(
        { importedVisualKind: "html", importedTextContent: html },
        html,
      ),
    ).toBe("html");
  });

  it("infers plain-text from panel title extension when kind is missing", () => {
    const py = 'print("hi")\n';
    expect(
      resolvePanelEditVisualKind(
        { importedVisualKind: undefined, importedTextContent: py, title: "main.py" },
        py,
      ),
    ).toBe("plain-text");
  });
});
