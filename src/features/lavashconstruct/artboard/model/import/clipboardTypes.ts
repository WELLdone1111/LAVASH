export type ImportedVisualKind = "plain-text" | "html" | "css" | "jsx";

export type ClipboardImportFidelity = "rich-html" | "code";

export type AnalyzedClipboardImport = {
  visualKind: ImportedVisualKind;
  /** для інспектора / реекспорту; plain або урізаний HTML */
  textContent: string;
  /** повний HTML для iframe srcDoc — rich web clip */
  sandboxHtmlDoc?: string;
  fidelity: ClipboardImportFidelity;
  /** тайтл панелі / ліби */
  displayTitle: string;
  /** варнінги для юзера (linked CSS, truncation…) */
  warnings?: string[];
};

export const IMPORT_CLIPBOARD_TEXT_MAX = 6000;
/** більший ліміт для jsx/tsx — превʼю тягне React+Babel у srcDoc */
export const IMPORT_JSX_CLIPBOARD_TEXT_MAX = 48_000;
export const IMPORT_SANDBOX_HTML_MAX = 80_000;
export const IMPORT_WARNINGS_MAX = 8;
export const IMPORT_WARNING_LINE_MAX = 240;
export const IMPORT_CSS_PREVIEW_MARKUP_MAX = 12_000;
export const IMPORT_HTML_PREVIEW_EXTRA_CSS_MAX = 12_000;
export const CSS_SANDBOX_SCOPE_CLASS = "lc-css-preview-host";

/** мінімум полів щоб зібрати iframe-превʼю імпорт-панелі */
export type ImportedPanelPreviewInput = {
  id?: string;
  importedSourceKind?: "text" | "image" | "file";
  importedVisualKind?: ImportedVisualKind | "plain-text";
  importedTextContent?: string;
  importedSandboxHtmlDoc?: string;
  /** збережені хінти з аналізу paste */
  importWarnings?: string[];
  /** CSS: сирий HTML у body превʼю замість авто-визначення */
  importedCssPreviewMarkup?: string;
  /** HTML: додатковий CSS у <head> (розумний паст) */
  importedHtmlPreviewExtraCss?: string;
};

/** ресет кнопок у iframe — інакше Win UA дає сині «плити» на всю ширину */
export const SANDBOX_BASE_RESET = `html,body{margin:0;padding:0;background:transparent;box-sizing:border-box}
body{overflow:auto;padding:10px}
*,*::before,*::after{box-sizing:inherit}
img,svg,video,canvas{max-width:100%;height:auto;vertical-align:middle}
button,input,select,textarea{font:inherit;color:inherit}
button,input[type="button"],input[type="submit"],input[type="reset"]{
  appearance:none;-webkit-appearance:none;
  background:#f8fafc;color:#0f172a;
  border:1px solid #cbd5e1;border-radius:8px;
  padding:8px 14px;line-height:1.25;
  width:auto;max-width:100%;vertical-align:middle
}
`;

export const HTML_STRUCTURE_REPAIRED_NOTE =
  "Broken HTML (unclosed <style> or missing </head><body>) was auto-repaired for preview.";
