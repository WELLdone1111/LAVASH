import type { RefObject } from "react";
import {
  analyzedImportToLibraryItemBase,
  clampImportedCssPreviewMarkup,
  clampImportedHtmlPreviewExtraCss,
  type AnalyzedClipboardImport,
} from "@/features/lavashconstruct/artboard/model/import";
import type { ConstructLibraryItem } from "@/features/lavashconstruct/shared/model/libraryItem";
import { useI18n } from "@/i18n/context";

type ConstructWorkspaceSmartPasteDialogProps = {
  smartPaste: AnalyzedClipboardImport;
  markupDraft: string;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  onMarkupDraftChange: (value: string) => void;
  onClose: () => void;
  onApplyItem: (item: ConstructLibraryItem) => void;
};

export default function ConstructWorkspaceSmartPasteDialog({
  smartPaste,
  markupDraft,
  textareaRef,
  onMarkupDraftChange,
  onClose,
  onApplyItem,
}: ConstructWorkspaceSmartPasteDialogProps) {
  const { t } = useI18n();

  return (
    <div className="lc-smart-paste-backdrop" role="presentation" onMouseDown={onClose}>
      <div
        className="lc-smart-paste-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="lc-smart-paste-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="lc-smart-paste-row lc-smart-paste-detected" id="lc-smart-paste-title">
          <span className="lc-smart-paste-emoji" aria-hidden>
            📋
          </span>
          <span>
            {t("construct.smartPaste.detected")}{" "}
            <strong className="lc-smart-paste-kind">{t(`construct.smartPaste.kind.${smartPaste.visualKind}`)}</strong>
          </span>
        </div>
        <label className="lc-smart-paste-label" htmlFor="lc-smart-paste-markup">
          {smartPaste.visualKind === "html"
            ? t("construct.smartPaste.addCssOptional")
            : t("construct.smartPaste.addHtmlOptional")}
        </label>
        <textarea
          ref={textareaRef}
          id="lc-smart-paste-markup"
          className="lc-smart-paste-textarea"
          value={markupDraft}
          onChange={(e) => onMarkupDraftChange(e.target.value)}
          placeholder={
            smartPaste.visualKind === "html" ? t("construct.smartPaste.phCss") : t("construct.smartPaste.phHtml")
          }
          spellCheck={false}
          rows={4}
        />
        <div className="lc-smart-paste-actions">
          <button
            type="button"
            className="lc-pill-button lc-smart-paste-skip"
            onClick={() => {
              const base = analyzedImportToLibraryItemBase(smartPaste);
              onApplyItem({
                ...base,
                id: `import-clipboard-${crypto.randomUUID().slice(0, 10)}`,
              });
              onClose();
            }}
          >
            {t("construct.smartPaste.skip")}
          </button>
          <button
            type="button"
            className="lc-pill-button lc-smart-paste-add"
            onClick={() => {
              const trimmed = markupDraft.trim();
              const markup =
                smartPaste.visualKind === "css" && trimmed ? clampImportedCssPreviewMarkup(trimmed) : undefined;
              const extraCss =
                smartPaste.visualKind === "html" && trimmed ? clampImportedHtmlPreviewExtraCss(trimmed) : undefined;
              const base = analyzedImportToLibraryItemBase(smartPaste);
              onApplyItem({
                ...base,
                id: `import-clipboard-${crypto.randomUUID().slice(0, 10)}`,
                ...(smartPaste.visualKind === "css" ? { importedCssPreviewMarkup: markup } : {}),
                ...(smartPaste.visualKind === "html" ? { importedHtmlPreviewExtraCss: extraCss } : {}),
              });
              onClose();
            }}
          >
            {t("construct.smartPaste.add")}
          </button>
        </div>
      </div>
    </div>
  );
}
