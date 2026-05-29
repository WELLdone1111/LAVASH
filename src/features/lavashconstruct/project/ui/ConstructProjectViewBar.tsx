import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n/context";
import {
  useProjectWorkspaceStore,
  type ProjectViewMode,
} from "@/features/lavashconstruct/project/model/projectWorkspaceStore";
import "./ConstructProjectViewBar.css";

const VIEW_MODES: { id: ProjectViewMode; labelKey: string }[] = [
  { id: "design", labelKey: "construct.sections.artboard" },
  { id: "split", labelKey: "construct.project.viewSplit" },
  { id: "code", labelKey: "construct.project.viewCode" },
];

export default function ConstructProjectViewBar() {
  const { t } = useI18n();
  const viewMode = useProjectWorkspaceStore((s) => s.viewMode);
  const setViewMode = useProjectWorkspaceStore((s) => s.setViewMode);

  return (
    <div className="lc-project-view-bar" role="tablist" aria-label={t("construct.project.viewModesAria")}>
      {VIEW_MODES.map(({ id, labelKey }) => (
        <button
          key={id}
          type="button"
          role="tab"
          className={cn("lc-project-view-bar__tab", viewMode === id && "lc-project-view-bar__tab--active")}
          aria-selected={viewMode === id}
          onClick={() => setViewMode(id)}
        >
          {t(labelKey)}
        </button>
      ))}
    </div>
  );
}
