import type { ConstructLibraryItem } from "@/features/lavashconstruct/shared/model/libraryItem";
import {
  displayFilenameForImportedTextFile,
  extractImportableFileExtension,
  isImportableTextFileExtension,
  isImportableTextFileName,
} from "@/features/lavashconstruct/editor/model/importableCodeFiles";
import { IMPORT_TEXT_FILE_MAX_BYTES } from "@/features/lavashconstruct/editor/model/panelEditFilename";
import { readStoredLocale } from "@/i18n/locale";
import { translateBare } from "@/i18n/translateBare";
import {
  clampImportWarnings,
  normalizeImportedTextForEditPalette,
} from "./clipboardClamp";
import {
  IMPORT_CLIPBOARD_TEXT_MAX,
  IMPORT_JSX_CLIPBOARD_TEXT_MAX,
  IMPORT_SANDBOX_HTML_MAX,
  type ImportedVisualKind,
} from "./clipboardTypes";
import { resolveImportedVisualKindForFile } from "./clipboardVisualKind";

async function readTextFileCapped(
  file: File,
  maxBytes: number,
): Promise<{ text: string; truncated: boolean }> {
  if (file.size <= maxBytes) {
    return { text: await file.text(), truncated: false };
  }
  const text = await file.slice(0, maxBytes).text();
  return { text, truncated: true };
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

export async function createImportedLibraryItemsFromFiles(files: File[]): Promise<ConstructLibraryItem[]> {
  const nextItems: ConstructLibraryItem[] = [];
  for (const file of files) {
    const ext = extractImportableFileExtension(file.name);
    const fileName = file.name.replace(/\.[^.]+$/, "").trim();
    const isImage = file.type.startsWith("image/") || ["png", "jpg", "jpeg", "webp", "gif"].includes(ext);
    const isText =
      file.type.startsWith("text/") ||
      isImportableTextFileExtension(ext) ||
      isImportableTextFileName(file.name);
    let importedDataUrl: string | undefined;
    let importedTextContent: string | undefined;
    let importedSourceKind: "text" | "image" | "file" = "file";
    let importedVisualKind: ImportedVisualKind | undefined;
    let fileImportWarnings: string[] | undefined;
    if (isImage) {
      importedSourceKind = "image";
      try {
        importedDataUrl = await readFileAsDataUrl(file);
      } catch {
        importedDataUrl = undefined;
      }
    } else if (isText) {
      importedSourceKind = "text";
      try {
        const { text: rawText, truncated } = await readTextFileCapped(file, IMPORT_TEXT_FILE_MAX_BYTES);
        importedVisualKind = resolveImportedVisualKindForFile(ext, rawText);
        const textCap =
          importedVisualKind === "jsx"
            ? Math.min(IMPORT_JSX_CLIPBOARD_TEXT_MAX, IMPORT_SANDBOX_HTML_MAX - 14_000)
            : IMPORT_CLIPBOARD_TEXT_MAX;
        importedTextContent = rawText.slice(0, textCap);
        const norm = normalizeImportedTextForEditPalette(
          importedTextContent,
          importedVisualKind,
          undefined,
        );
        importedTextContent = norm.text;
        const warnings = [...(norm.importWarnings ?? [])];
        if (truncated) {
          warnings.push(
            translateBare("construct.import.fileTruncated", readStoredLocale(), {
              maxMb: Math.round(IMPORT_TEXT_FILE_MAX_BYTES / (1024 * 1024)),
            }),
          );
        }
        fileImportWarnings = warnings.length > 0 ? warnings : undefined;
      } catch {
        importedTextContent = undefined;
        importedVisualKind = "plain-text";
      }
    }
    const baseName = file.name.split(/[/\\]/).pop() ?? file.name;
    const displayTitle = isText
      ? displayFilenameForImportedTextFile(baseName.replace(/\.[^.]+$/, "") || baseName, ext)
      : fileName || file.name || `Imported ${ext.toUpperCase()}`;

    nextItems.push({
      id: `import-${ext}-${crypto.randomUUID().slice(0, 8)}`,
      title: displayTitle,
      kind: "element",
      category: "player",
      keywords: ["imported", "file", ext, "player"],
      defaultWidth: isImage ? 320 : 260,
      defaultHeight: isImage ? 200 : isText ? 190 : 150,
      importedSourceKind,
      importedVisualKind,
      importedMimeType: file.type || undefined,
      importedTextContent,
      importedDataUrl,
      importWarnings: clampImportWarnings(fileImportWarnings),
    });
  }
  return nextItems;
}
