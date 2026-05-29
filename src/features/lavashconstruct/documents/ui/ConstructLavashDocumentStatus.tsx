import { FilePlus2, FolderOpen, X } from "lucide-react";
import { isTauri } from "@tauri-apps/api/core";
import { useI18n } from "@/i18n/context";
import { useLavashDocumentStore } from "@/features/lavashconstruct/documents/model/lavashDocumentStore";
import { confirmDiscardWorkspaceChanges } from "@/features/lavashconstruct/project/model/workspaceUnsavedGuard";
import "./ConstructLavashDocumentStatus.css";

type ConstructLavashDocumentStatusProps = {
  onOpenDocument: () => void;
  onNewDocument: () => void;
};

export default function ConstructLavashDocumentStatus({
  onOpenDocument,
  onNewDocument,
}: ConstructLavashDocumentStatusProps) {
  const { t } = useI18n();
  const filePath = useLavashDocumentStore((s) => s.filePath);
  const dirty = useLavashDocumentStore((s) => s.dirty);
  const saving = useLavashDocumentStore((s) => s.saving);
  const clear = useLavashDocumentStore((s) => s.clear);

  const handleClose = () => {
    if (!confirmDiscardWorkspaceChanges(t("construct.unsaved.discardConfirm"))) return;
    clear();
  };

  return (
    <div className="lc-lavash-doc-status-wrap">
      <div className="lc-lavash-doc-status__actions">
        <button type="button" className="lc-lavash-doc-status__action" onClick={onNewDocument}>
          <FilePlus2 size={14} aria-hidden />
          {t("construct.lavashDoc.new")}
        </button>
        <button
          type="button"
          className="lc-lavash-doc-status__action"
          onClick={() => {
            if (!isTauri()) {
              window.alert(t("construct.project.desktopOnly"));
              return;
            }
            onOpenDocument();
          }}
        >
          <FolderOpen size={14} aria-hidden />
          {t("construct.lavashDoc.open")}
        </button>
      </div>
      {filePath ? (
        <div className="lc-lavash-doc-status" title={filePath}>
          <span className="lc-lavash-doc-status__label">{t("construct.lavashDoc.active")}</span>
          <span className="lc-lavash-doc-status__name">
            {filePath.replace(/\\/g, "/").split("/").pop()}
          </span>
          {saving ? (
            <span className="lc-lavash-doc-status__badge">{t("construct.lavashDoc.saving")}</span>
          ) : dirty ? (
            <span className="lc-lavash-doc-status__badge lc-lavash-doc-status__badge--dirty">
              {t("construct.project.unsaved")}
            </span>
          ) : (
            <span className="lc-lavash-doc-status__badge">{t("construct.lavashDoc.saved")}</span>
          )}
          <button
            type="button"
            className="lc-lavash-doc-status__close"
            aria-label={t("construct.lavashDoc.close")}
            onClick={handleClose}
          >
            <X size={14} aria-hidden />
          </button>
        </div>
      ) : dirty ? (
        <p className="lc-lavash-doc-status__hint">{t("construct.lavashDoc.unsavedNew")}</p>
      ) : null}
    </div>
  );
}
