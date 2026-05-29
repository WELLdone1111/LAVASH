/**
 * Шейп айтема, коли пастимо / імпортимо файли в лабу як нові артборд-панелі,
 * і для рядків у лівій колонці **User Lib**.
 */
export type ConstructLibraryItem = {
  id: string;
  title: string;
  kind: "panel" | "element";
  /** User Lib лише для плеєрів / webview / імпортованого коду (не каталог UI-компонентів). */
  category: "player";
  keywords: string[];
  defaultWidth: number;
  defaultHeight: number;
  lockAspectRatioByDefault?: boolean;
  importedSourceKind?: "text" | "image" | "file";
  importedVisualKind?: "plain-text" | "html" | "css" | "jsx";
  importedMimeType?: string;
  importedTextContent?: string;
  importedDataUrl?: string;
  importedSandboxHtmlDoc?: string;
  importWarnings?: string[];
  importedCssPreviewMarkup?: string;
  importedHtmlPreviewExtraCss?: string;
  /** Внутрішнє: панель з цього scratch-табу живе разом з контентом табу (не персистимо в User Lib). */
  linkedScratchTabId?: string;
};
