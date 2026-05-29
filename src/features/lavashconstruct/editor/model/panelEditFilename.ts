import type { ImportedVisualKind } from "@/features/lavashconstruct/artboard/model/import";
import { extractImportableFileExtension } from "@/features/lavashconstruct/editor/model/importableCodeFiles";

/** Максимальний розмір текстового файлу при імпорті (2 MB). */
export const IMPORT_TEXT_FILE_MAX_BYTES = 2 * 1024 * 1024;

const EXTENSION_IN_TITLE = /\.[A-Za-z0-9]{1,12}$/;

export function panelTitleHasFileExtension(title: string): boolean {
  return EXTENSION_IN_TITLE.test(title.trim());
}

/** Ім'я для Monaco LSP / підсвітки — зберігає розширення з title панелі. */
export function monacoFilenameForEdit(input: {
  panelTitle?: string | null;
  elementName?: string;
  visualKind: ImportedVisualKind;
}): string {
  const title = input.panelTitle?.trim();
  if (title && panelTitleHasFileExtension(title)) return title;

  const rawBase = (input.elementName ?? title ?? "snippet").trim() || "snippet";
  const base = rawBase.replace(/\.[^.\\/]+$/, "") || "snippet";

  switch (input.visualKind) {
    case "html":
      return `${base}.html`;
    case "css":
      return `${base}.css`;
    case "jsx":
      return `${base}.tsx`;
    case "plain-text":
    default:
      return `${base}.txt`;
  }
}

/** Базове ім'я для завантаження коду панелі (з розширенням). */
export function downloadBasenameForPanel(
  panel: { title?: string; importedVisualKind?: ImportedVisualKind },
  fallbackBase = "panel",
): string {
  const title = panel.title?.trim();
  if (title && panelTitleHasFileExtension(title)) return title;

  const base = (title ?? fallbackBase).replace(/\.[^.]+$/, "") || fallbackBase;
  const ext =
    panel.importedVisualKind === "html"
      ? "html"
      : panel.importedVisualKind === "css"
        ? "css"
        : panel.importedVisualKind === "jsx"
          ? "tsx"
          : "txt";
  return `${base}.${ext}`;
}

export function extensionFromPanelTitle(title: string | undefined): string | null {
  const trimmed = title?.trim();
  if (!trimmed || !panelTitleHasFileExtension(trimmed)) return null;
  return extractImportableFileExtension(trimmed);
}
