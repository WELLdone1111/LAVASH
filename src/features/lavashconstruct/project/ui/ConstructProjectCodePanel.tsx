import { X } from "lucide-react";
import { useI18n } from "@/i18n/context";
import ConstructMonacoEditor from "@/features/lavashconstruct/editor/ui/ConstructMonacoEditor";
import { useProjectWorkspaceStore } from "@/features/lavashconstruct/project/model/projectWorkspaceStore";
import "./ConstructProjectCodePanel.css";

export default function ConstructProjectCodePanel() {
  const { t } = useI18n();
  const openFile = useProjectWorkspaceStore((s) => s.openFile);
  const setOpenFileContent = useProjectWorkspaceStore((s) => s.setOpenFileContent);
  const closeOpenFile = useProjectWorkspaceStore((s) => s.closeOpenFile);

  if (!openFile) return null;

  const fileName = openFile.path.replace(/\\/g, "/").split("/").pop() ?? openFile.path;

  return (
    <div className="lc-project-code" aria-label={t("construct.project.codeAria")}>
      <div className="lc-project-code__header">
        <div className="lc-project-code__titles">
          <span className="lc-project-code__name">{fileName}</span>
          <span className="lc-project-code__path">{openFile.path}</span>
        </div>
        {openFile.dirty ? <span className="lc-project-code__dirty">{t("construct.project.unsaved")}</span> : null}
        <button
          type="button"
          className="lc-project-code__close"
          aria-label={t("construct.project.closeFile")}
          onClick={closeOpenFile}
        >
          <X size={16} aria-hidden />
        </button>
      </div>
      <ConstructMonacoEditor
        key={openFile.path}
        className="lc-project-code__monaco"
        value={openFile.content}
        onChange={setOpenFileContent}
        height="100%"
        documentId={`project:${openFile.path}`}
        workspaceRelativePath={openFile.path}
        languageInput={{ filename: fileName }}
      />
    </div>
  );
}
