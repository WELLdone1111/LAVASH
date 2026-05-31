import { FolderTree, Library, Settings } from "lucide-react";
import type { ComponentType, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n/context";
import IdeWebBrowserButton from "@/features/ide-browser/ui/IdeWebBrowserButton";

export type ConstructSectionId = "artboard" | "userLib" | "project";

type ConstructSectionRailProps = {
  userLibOpen: boolean;
  projectOpen: boolean;
  onSelectSection: (id: ConstructSectionId) => void;
  settingsOpen: boolean;
  onToggleSettings: () => void;
  onToggleBrowser: () => void;
};

type SectionDef = {
  id: Exclude<ConstructSectionId, "artboard">;
  labelKey: string;
  Icon: ComponentType<{ size?: number; strokeWidth?: number }>;
};

const SECTIONS: SectionDef[] = [
  { id: "project", Icon: FolderTree, labelKey: "construct.sections.project" },
  { id: "userLib", Icon: Library, labelKey: "construct.sections.userLib" },
];

function RailIconButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className={cn("lc-section-rail__btn", active && "lc-section-rail__btn--active")}
      aria-label={label}
      aria-pressed={active}
      data-tooltip={label}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export default function ConstructSectionRail({
  userLibOpen,
  projectOpen,
  onSelectSection,
  settingsOpen,
  onToggleSettings,
  onToggleBrowser,
}: ConstructSectionRailProps) {
  const { t } = useI18n();

  return (
    <nav className="lc-section-rail" aria-label={t("construct.sections.railAria")}>
      <div className="lc-section-rail__sections">
        {SECTIONS.map(({ id, Icon, labelKey }) => {
          const label = t(labelKey);
          const active = id === "userLib" ? userLibOpen : projectOpen;
          return (
            <RailIconButton key={id} label={label} active={active} onClick={() => onSelectSection(id)}>
              <Icon size={18} strokeWidth={1.75} aria-hidden />
            </RailIconButton>
          );
        })}
      </div>

      <div className="lc-section-rail__spacer" aria-hidden />

      <div className="lc-section-rail__footer">
        <IdeWebBrowserButton variant="rail" onRailToggle={onToggleBrowser} />
        <RailIconButton label={t("construct.settings.title")} active={settingsOpen} onClick={onToggleSettings}>
          <Settings size={18} strokeWidth={1.75} aria-hidden />
        </RailIconButton>
      </div>
    </nav>
  );
}
