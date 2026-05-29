import { useEffect, useMemo } from "react";
import { useI18n } from "@/i18n/context";
import {
  APP_SEARCH_FOCUS_PANEL_EVENT,
  APP_SEARCH_NAVIGATE_SECTION_EVENT,
  APP_SEARCH_OPEN_SETTINGS_EVENT,
  type AppSearchFocusPanelDetail,
  type AppSearchNavigateSectionDetail,
  type AppSearchOpenSettingsDetail,
} from "@/features/app-search/model/appSearchBus";
import { useAppSearchStore } from "@/features/app-search/model/appSearchStore";
import type { AppSearchItem } from "@/features/app-search/model/types";
import type { ArtboardPanel } from "@/features/lavashconstruct/artboard/ui/types";

type UseRegisterConstructAppSearchOptions = {
  panels: ArtboardPanel[];
  onSelectPanel: (id: string) => void;
  onFocusPanel: (id: string) => void;
  onNavigateSection: (section: AppSearchNavigateSectionDetail["section"]) => void;
  onOpenSettings: (section: AppSearchOpenSettingsDetail["section"]) => void;
};

export function useRegisterConstructAppSearch({
  panels,
  onSelectPanel,
  onFocusPanel,
  onNavigateSection,
  onOpenSettings,
}: UseRegisterConstructAppSearchOptions): void {
  const { t } = useI18n();
  const setDynamicItems = useAppSearchStore((state) => state.setDynamicItems);

  const panelItems = useMemo((): AppSearchItem[] => {
    const group = t("appSearch.group.panels");
    return panels.map((panel) => ({
      id: `panel:${panel.id}`,
      title: panel.title,
      subtitle: `z:${panel.zIndex}`,
      group,
      keywords: [panel.id, "panel", "artboard"],
      run: () => {
        onSelectPanel(panel.id);
        onFocusPanel(panel.id);
      },
    }));
  }, [panels, onFocusPanel, onSelectPanel, t]);

  useEffect(() => {
    setDynamicItems(panelItems);
    return () => setDynamicItems([]);
  }, [panelItems, setDynamicItems]);

  useEffect(() => {
    const handleOpenSettingsEvent = (event: Event) => {
      const detail = (event as CustomEvent<AppSearchOpenSettingsDetail>).detail;
      if (!detail?.section) return;
      onOpenSettings(detail.section);
    };
    const handleFocusPanelEvent = (event: Event) => {
      const detail = (event as CustomEvent<AppSearchFocusPanelDetail>).detail;
      if (!detail?.panelId) return;
      onSelectPanel(detail.panelId);
      onFocusPanel(detail.panelId);
    };
    const handleNavigate = (event: Event) => {
      const detail = (event as CustomEvent<AppSearchNavigateSectionDetail>).detail;
      if (!detail?.section) return;
      onNavigateSection(detail.section);
    };

    window.addEventListener(APP_SEARCH_OPEN_SETTINGS_EVENT, handleOpenSettingsEvent);
    window.addEventListener(APP_SEARCH_FOCUS_PANEL_EVENT, handleFocusPanelEvent);
    window.addEventListener(APP_SEARCH_NAVIGATE_SECTION_EVENT, handleNavigate);
    return () => {
      window.removeEventListener(APP_SEARCH_OPEN_SETTINGS_EVENT, handleOpenSettingsEvent);
      window.removeEventListener(APP_SEARCH_FOCUS_PANEL_EVENT, handleFocusPanelEvent);
      window.removeEventListener(APP_SEARCH_NAVIGATE_SECTION_EVENT, handleNavigate);
    };
  }, [onFocusPanel, onNavigateSection, onOpenSettings, onSelectPanel]);
}
