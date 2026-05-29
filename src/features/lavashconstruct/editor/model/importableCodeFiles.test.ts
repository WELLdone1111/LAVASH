import { describe, expect, it } from "vitest";
import {
  displayFilenameForImportedTextFile,
  extractImportableFileExtension,
  isImportableTextFileName,
} from "@/features/lavashconstruct/editor/model/importableCodeFiles";
import { resolveImportedVisualKindForFile } from "@/features/lavashconstruct/artboard/model/import";

describe("importableCodeFiles", () => {
  it("recognizes Python and other code extensions by filename", () => {
    expect(isImportableTextFileName("main.py")).toBe(true);
    expect(isImportableTextFileName("lib.rs")).toBe(true);
    expect(isImportableTextFileName("Dockerfile")).toBe(true);
    expect(extractImportableFileExtension("main.py")).toBe("py");
    expect(extractImportableFileExtension("Dockerfile")).toBe("dockerfile");
  });

  it("keeps extension in display title for Monaco", () => {
    expect(displayFilenameForImportedTextFile("main", "py")).toBe("main.py");
    expect(displayFilenameForImportedTextFile("main.py", "py")).toBe("main.py");
    expect(displayFilenameForImportedTextFile("Dockerfile", "dockerfile")).toBe("Dockerfile");
    expect(displayFilenameForImportedTextFile("Makefile", "makefile")).toBe("Makefile");
  });

  it("maps non-web languages to plain-text preview", () => {
    const py = 'print("hello")\n';
    expect(resolveImportedVisualKindForFile("py", py)).toBe("plain-text");
    expect(resolveImportedVisualKindForFile("rs", 'fn main() {}')).toBe("plain-text");
  });

  it("still previews web stack by content", () => {
    const html = "<!DOCTYPE html><html><body>Hi</body></html>";
    expect(resolveImportedVisualKindForFile("html", html)).toBe("html");
    const tsx = `export default function Player() {
  return <div className="player">Hi</div>;
}`;
    expect(resolveImportedVisualKindForFile("tsx", tsx)).toBe("jsx");
  });
});
