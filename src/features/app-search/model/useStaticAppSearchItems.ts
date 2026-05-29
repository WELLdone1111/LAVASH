import { useMemo } from "react";
import { useI18n } from "@/i18n/context";
import {
  dispatchAppSearchNavigateSection,
  dispatchAppSearchOpenSettings,
} from "@/features/app-search/model/appSearchBus";
import { dispatchConstructOpenModelsSection } from "@/features/lavashconstruct/chat/model/constructModelBus";
import { dispatchNewChatTabRequest } from "@/features/file-menu/model/fileMenuBus";
import {
  isFileMenuActionEnabled,
  runFileMenuAction,
  type FileMenuActionId,
} from "@/features/file-menu/model/fileMenuBus";
import {
  isEditMenuActionEnabled,
  runEditMenuAction,
  type EditMenuActionId,
} from "@/features/edit-menu/model/editMenuBus";
import type { ConstructSettingsSection } from "@/features/lavashconstruct/settings/ui/ConstructSettingsPanel";
import type { AppSearchItem } from "./types";

const FILE_ACTIONS: FileMenuActionId[] = [
  "newTextFile",
  "newLavashDocument",
  "openLavashDocument",
  "openFolder",
  "import",
  "export",
  "save",
  "saveAs",
];

const FILE_LABEL_KEYS: Record<FileMenuActionId, string> = {
  newTextFile: "file.menu.newTextFile",
  newLavashDocument: "file.menu.newLavashDocument",
  newWindow: "file.menu.newWindow",
  newAgentsWindow: "file.menu.newAgentsWindow",
  openFile: "file.menu.openFile",
  openLavashDocument: "file.menu.openLavashDocument",
  openFolder: "file.menu.openFolder",
  import: "file.menu.import",
  export: "file.menu.export",
  save: "file.menu.save",
  saveAs: "file.menu.saveAs",
};

const EDIT_ACTIONS: EditMenuActionId[] = ["undo", "redo", "cut", "copy", "paste"];

const EDIT_LABEL_KEYS: Record<EditMenuActionId, string> = {
  undo: "edit.menu.undo",
  redo: "edit.menu.redo",
  cut: "edit.menu.cut",
  copy: "edit.menu.copy",
  paste: "edit.menu.paste",
};

const SETTINGS_SECTIONS: ConstructSettingsSection[] = ["basics", "models", "account"];

function settingsLabelKey(section: ConstructSettingsSection): string {
  switch (section) {
    case "basics":
      return "construct.settings.section.basics";
    case "models":
      return "construct.model.title";
    case "account":
      return "construct.settings.section.account";
  }
}

export function useStaticAppSearchItems(): AppSearchItem[] {
  const { t } = useI18n();

  return useMemo(() => {
    const groupCommands = t("appSearch.group.commands");
    const groupSettings = t("appSearch.group.settings");
    const groupNavigate = t("appSearch.group.navigate");

    const fileItems: AppSearchItem[] = FILE_ACTIONS.map((id) => ({
      id: `file:${id}`,
      title: t(FILE_LABEL_KEYS[id]),
      group: groupCommands,
      keywords: ["file", id],
      enabled: () => isFileMenuActionEnabled(id),
      run: () => runFileMenuAction(id),
    }));

    const editItems: AppSearchItem[] = EDIT_ACTIONS.map((id) => ({
      id: `edit:${id}`,
      title: t(EDIT_LABEL_KEYS[id]),
      group: groupCommands,
      keywords: ["edit", id],
      enabled: () => isEditMenuActionEnabled(id),
      run: () => runEditMenuAction(id),
    }));

    const settingsItems: AppSearchItem[] = [
      ...SETTINGS_SECTIONS.map((section) => ({
        id: `settings:${section}`,
        title: t(settingsLabelKey(section)),
        group: groupSettings,
        keywords: ["settings", section],
        run: () => dispatchAppSearchOpenSettings(section),
      })),
      {
        id: "settings:wallpapers",
        title: t("construct.settings.section.wallpapers"),
        group: groupSettings,
        keywords: ["settings", "wallpapers", "basics", "background"],
        run: () => dispatchAppSearchOpenSettings("basics"),
      },
      {
        id: "settings:artboard",
        title: t("construct.settings.section.artboard"),
        group: groupSettings,
        keywords: ["settings", "artboard", "basics", "grid", "snap"],
        run: () => dispatchAppSearchOpenSettings("basics"),
      },
    ];

    const navigateItems: AppSearchItem[] = [
      {
        id: "nav:artboard",
        title: t("construct.sections.artboard"),
        group: groupNavigate,
        keywords: ["artboard", "navigate"],
        run: () => dispatchAppSearchNavigateSection("artboard"),
      },
      {
        id: "nav:project",
        title: t("construct.project.title"),
        group: groupNavigate,
        keywords: ["project", "folder"],
        run: () => dispatchAppSearchNavigateSection("project"),
      },
      {
        id: "nav:userLib",
        title: t("construct.userLib.title"),
        group: groupNavigate,
        keywords: ["library", "user"],
        run: () => dispatchAppSearchNavigateSection("userLib"),
      },
      {
        id: "nav:chat",
        title: t("appSearch.action.newChat"),
        group: groupNavigate,
        keywords: ["chat", "ai"],
        run: () => dispatchNewChatTabRequest(),
      },
      {
        id: "nav:models",
        title: t("construct.model.title"),
        group: groupNavigate,
        keywords: ["models", "ai"],
        run: () => dispatchConstructOpenModelsSection(),
      },
    ];

    return [...navigateItems, ...settingsItems, ...fileItems, ...editItems];
  }, [t]);
}
