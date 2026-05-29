import type { ConstructSettingsSection } from "@/features/lavashconstruct/settings/ui/ConstructSettingsPanel";
import type { ConstructSectionId } from "@/features/lavashconstruct/workspace/ui/ConstructSectionRail";

export const APP_SEARCH_OPEN_SETTINGS_EVENT = "lavash:app-search:open-settings";
export const APP_SEARCH_FOCUS_PANEL_EVENT = "lavash:app-search:focus-panel";
export const APP_SEARCH_NAVIGATE_SECTION_EVENT = "lavash:app-search:navigate-section";
export const APP_SEARCH_FOCUS_INPUT_EVENT = "lavash:app-search:focus-input";

export type AppSearchOpenSettingsDetail = { section: ConstructSettingsSection };
export type AppSearchFocusPanelDetail = { panelId: string };
export type AppSearchNavigateSectionDetail = { section: ConstructSectionId };

export function dispatchAppSearchOpenSettings(section: ConstructSettingsSection): void {
  window.dispatchEvent(new CustomEvent<AppSearchOpenSettingsDetail>(APP_SEARCH_OPEN_SETTINGS_EVENT, { detail: { section } }));
}

export function dispatchAppSearchFocusPanel(panelId: string): void {
  window.dispatchEvent(new CustomEvent<AppSearchFocusPanelDetail>(APP_SEARCH_FOCUS_PANEL_EVENT, { detail: { panelId } }));
}

export function dispatchAppSearchNavigateSection(section: ConstructSectionId): void {
  window.dispatchEvent(
    new CustomEvent<AppSearchNavigateSectionDetail>(APP_SEARCH_NAVIGATE_SECTION_EVENT, { detail: { section } }),
  );
}

export function dispatchAppSearchFocusInput(): void {
  window.dispatchEvent(new CustomEvent(APP_SEARCH_FOCUS_INPUT_EVENT));
}
