import type { ComponentProps } from "react";
import ConstructLavashDocumentStatus from "@/features/lavashconstruct/documents/ui/ConstructLavashDocumentStatus";
import ConstructProjectPanel from "@/features/lavashconstruct/project/ui/ConstructProjectPanel";
import ConstructUserLibPanel, {
  CONSTRUCT_USER_LIB_DRAG_MIME,
} from "@/features/lavashconstruct/artboard/ui/ConstructUserLibPanel";
import type { ConstructLibraryItem } from "@/features/lavashconstruct/shared/model/libraryItem";
import ConstructRailSectionDrawer from "@/features/lavashconstruct/workspace/ui/ConstructRailSectionDrawer";
import ConstructSectionRail from "@/features/lavashconstruct/workspace/ui/ConstructSectionRail";
import { useI18n } from "@/i18n/context";

export { CONSTRUCT_USER_LIB_DRAG_MIME };

type ConstructWorkspaceRailProps = {
  userLibOpen: boolean;
  projectOpen: boolean;
  isArtboardSettingsOpen: boolean;
  userLibraryItems: ConstructLibraryItem[];
  onSelectSection: ComponentProps<typeof ConstructSectionRail>["onSelectSection"];
  onToggleSettings: () => void;
  onToggleBrowser: () => void;
  onNewDocument: () => void;
  onOpenDocument: () => void;
  onOpenProjectFolder: () => void;
  onOpenLavashDocument: (relativePath: string) => void;
  onRemoveLibraryItem: (itemId: string) => void;
  onInsertLibraryItem: (item: ConstructLibraryItem) => void;
};

export default function ConstructWorkspaceRail({
  userLibOpen,
  projectOpen,
  isArtboardSettingsOpen,
  userLibraryItems,
  onSelectSection,
  onToggleSettings,
  onToggleBrowser,
  onNewDocument,
  onOpenDocument,
  onOpenProjectFolder,
  onOpenLavashDocument,
  onRemoveLibraryItem,
  onInsertLibraryItem,
}: ConstructWorkspaceRailProps) {
  const { t } = useI18n();

  return (
    <section className="lc-unified-cell lc-unified-shell__rail" style={{ gridColumn: 1, gridRow: 1, minWidth: 0, minHeight: 0 }}>
      <ConstructSectionRail
        userLibOpen={userLibOpen}
        projectOpen={projectOpen}
        onSelectSection={onSelectSection}
        settingsOpen={isArtboardSettingsOpen}
        onToggleSettings={onToggleSettings}
        onToggleBrowser={onToggleBrowser}
      />
      <ConstructRailSectionDrawer isOpen={projectOpen} title={t("construct.project.title")} className="lc-project-drawer">
        <ConstructLavashDocumentStatus onNewDocument={onNewDocument} onOpenDocument={onOpenDocument} />
        <ConstructProjectPanel onOpenFolder={onOpenProjectFolder} onOpenLavashDocument={onOpenLavashDocument} />
      </ConstructRailSectionDrawer>
      <ConstructRailSectionDrawer isOpen={userLibOpen} title={t("construct.userLib.title")}>
        <ConstructUserLibPanel
          showTitle={false}
          items={userLibraryItems}
          onRemove={onRemoveLibraryItem}
          onInsertToArtboard={onInsertLibraryItem}
        />
      </ConstructRailSectionDrawer>
    </section>
  );
}
