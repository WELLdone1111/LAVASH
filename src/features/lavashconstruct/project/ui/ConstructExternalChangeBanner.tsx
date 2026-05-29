import { RefreshCw, X } from "lucide-react";
import { useI18n } from "@/i18n/context";
import { useLavashDocumentStore } from "@/features/lavashconstruct/documents/model/lavashDocumentStore";
import { useProjectWorkspaceStore } from "@/features/lavashconstruct/project/model/projectWorkspaceStore";
import "./ConstructExternalChangeBanner.css";

type ConstructExternalChangeBannerProps = {
  onReloadLavashDocument: () => void;
};

export default function ConstructExternalChangeBanner({
  onReloadLavashDocument,
}: ConstructExternalChangeBannerProps) {
  const { t } = useI18n();
  const lavashStale = useLavashDocumentStore((s) => s.externalStale);
  const lavashPath = useLavashDocumentStore((s) => s.filePath);
  const projectStale = useProjectWorkspaceStore((s) => s.externalStale);
  const projectPath = useProjectWorkspaceStore((s) => s.openFile?.path);
  const reloadProject = useProjectWorkspaceStore((s) => s.reloadOpenFileFromDisk);
  const dismissLavash = useLavashDocumentStore((s) => s.dismissExternalStale);
  const dismissProject = useProjectWorkspaceStore((s) => s.dismissExternalStale);

  if (!lavashStale && !projectStale) return null;

  const label = lavashStale
    ? t("construct.externalChange.lavashDoc", {
        name: lavashPath?.replace(/\\/g, "/").split("/").pop() ?? "",
      })
    : t("construct.externalChange.projectFile", { name: projectPath ?? "" });

  return (
    <div className="lc-external-change" role="status">
      <span className="lc-external-change__text">{label}</span>
      <button
        type="button"
        className="lc-external-change__reload"
        onClick={() => {
          if (lavashStale) onReloadLavashDocument();
          else void reloadProject();
        }}
      >
        <RefreshCw size={14} aria-hidden />
        {t("construct.externalChange.reload")}
      </button>
      <button
        type="button"
        className="lc-external-change__dismiss"
        aria-label={t("construct.externalChange.dismiss")}
        onClick={() => {
          if (lavashStale) dismissLavash();
          else dismissProject();
        }}
      >
        <X size={14} aria-hidden />
      </button>
    </div>
  );
}
