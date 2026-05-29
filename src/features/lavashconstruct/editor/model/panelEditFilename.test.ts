import { describe, expect, it } from "vitest";
import {
  downloadBasenameForPanel,
  monacoFilenameForEdit,
} from "@/features/lavashconstruct/editor/model/panelEditFilename";
import { detectImportedVisualKind } from "@/features/lavashconstruct/artboard/model/import";

describe("panelEditFilename", () => {
  it("monacoFilenameForEdit preserves panel title extension", () => {
    expect(
      monacoFilenameForEdit({
        panelTitle: "main.py",
        elementName: "Player",
        visualKind: "plain-text",
      }),
    ).toBe("main.py");
  });

  it("monacoFilenameForEdit maps visual kind when title has no extension", () => {
    expect(
      monacoFilenameForEdit({
        panelTitle: "Player",
        visualKind: "html",
      }),
    ).toBe("Player.html");
  });

  it("downloadBasenameForPanel uses title or visual kind", () => {
    expect(downloadBasenameForPanel({ title: "styles.css", importedVisualKind: "css" })).toBe(
      "styles.css",
    );
    expect(downloadBasenameForPanel({ title: "snippet", importedVisualKind: "plain-text" })).toBe(
      "snippet.txt",
    );
  });
});

describe("detectImportedVisualKind (.js)", () => {
  it("treats plain Node scripts as non-jsx", () => {
    const node = `const fs = require("fs");\nconsole.log(fs);\n`;
    expect(detectImportedVisualKind("js", node)).toBe("plain-text");
  });

  it("detects JSX in .js when signals present", () => {
    const jsx = `export default function App() {\n  return <div className="x" />;\n}\n`;
    expect(detectImportedVisualKind("js", jsx)).toBe("jsx");
  });
});
