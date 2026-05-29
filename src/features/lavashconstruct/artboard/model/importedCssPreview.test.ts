import { describe, expect, it } from "vitest";
import {
  inferCssPreviewBodyMarkup,
  inferCssPreviewPanelSize,
} from "@/features/lavashconstruct/artboard/model/import";

describe("imported CSS preview helpers", () => {
  it("infers markup and panel size from custom class like .pp", () => {
    const css = `.pp {
  --a: #00f0ff;
  width: 120px;
  height: 120px;
  border-radius: 50%;
  cursor: pointer;
}`;

    expect(inferCssPreviewBodyMarkup(css)).toContain('class="pp"');
    expect(inferCssPreviewBodyMarkup(css)).toContain("<button");
    expect(inferCssPreviewPanelSize(css)).toEqual({ width: 136, height: 136 });
  });
});
