import { useCallback, useEffect, useState } from "react";
import { CONSTRUCT_OPEN_MODELS_SECTION_EVENT } from "@/features/lavashconstruct/chat/model/constructModelBus";
import { useIdeBrowserStore } from "@/features/ide-browser/model/ideBrowserStore";
import type { ConstructSettingsSection } from "@/features/lavashconstruct/settings/ui/ConstructSettingsPanel";
import type { ConstructSectionId } from "@/features/lavashconstruct/workspace/ui/ConstructSectionRail";

export function useConstructWorkspaceRail() {
  const [userLibOpen, setUserLibOpen] = useState(false);
  const [projectOpen, setProjectOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [layersOpen, setLayersOpen] = useState(false);
  const [markMode, setMarkMode] = useState(false);
  const [isArtboardSettingsOpen, setIsArtboardSettingsOpen] = useState(false);
  const [settingsSection, setSettingsSection] = useState<ConstructSettingsSection>("basics");

  const closeRailDrawers = useCallback(() => {
    setUserLibOpen(false);
    setProjectOpen(false);
  }, []);

  const closeIdeBrowser = useCallback(() => {
    useIdeBrowserStore.getState().close();
  }, []);

  const closeTransientRailPopovers = useCallback(() => {
    setSearchOpen(false);
    setLayersOpen(false);
    setMarkMode(false);
  }, []);

  const closeOtherRailSections = useCallback(
    (except?: "project" | "userLib" | "browser" | "settings") => {
      closeTransientRailPopovers();
      if (except !== "project" && except !== "userLib") closeRailDrawers();
      if (except !== "settings") setIsArtboardSettingsOpen(false);
      if (except !== "browser") closeIdeBrowser();
    },
    [closeIdeBrowser, closeRailDrawers, closeTransientRailPopovers],
  );

  useEffect(() => {
    const openModels = () => {
      closeOtherRailSections("settings");
      setSettingsSection("models");
      setIsArtboardSettingsOpen(true);
    };
    window.addEventListener(CONSTRUCT_OPEN_MODELS_SECTION_EVENT, openModels);
    return () => window.removeEventListener(CONSTRUCT_OPEN_MODELS_SECTION_EVENT, openModels);
  }, [closeOtherRailSections]);

  useEffect(() => {
    if (!markMode) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMarkMode(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [markMode]);

  useEffect(() => {
    if (!userLibOpen && !projectOpen) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeRailDrawers();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [closeRailDrawers, projectOpen, userLibOpen]);

  const handleSelectSection = useCallback(
    (id: ConstructSectionId) => {
      if (id === "userLib") {
        setUserLibOpen((open) => {
          const next = !open;
          if (next) closeOtherRailSections("userLib");
          return next;
        });
        setProjectOpen(false);
        return;
      }
      if (id === "project") {
        setProjectOpen((open) => {
          const next = !open;
          if (next) closeOtherRailSections("project");
          return next;
        });
        setUserLibOpen(false);
        return;
      }
      closeOtherRailSections();
    },
    [closeOtherRailSections],
  );

  const handleToggleSettings = useCallback(() => {
    setIsArtboardSettingsOpen((open) => {
      const next = !open;
      if (next) closeOtherRailSections("settings");
      return next;
    });
  }, [closeOtherRailSections]);

  const handleToggleBrowser = useCallback(() => {
    const browser = useIdeBrowserStore.getState();
    if (browser.open) {
      browser.close();
      return;
    }
    closeOtherRailSections("browser");
    browser.openHome();
  }, [closeOtherRailSections]);

  const handleToggleSearch = useCallback(() => {
    setSearchOpen((open) => {
      const next = !open;
      if (next) {
        closeOtherRailSections();
        setUserLibOpen(false);
        setProjectOpen(false);
        setLayersOpen(false);
        setMarkMode(false);
      }
      return next;
    });
  }, [closeOtherRailSections]);

  const handleToggleLayers = useCallback(() => {
    setLayersOpen((open) => {
      const next = !open;
      if (next) {
        closeOtherRailSections();
        setUserLibOpen(false);
        setProjectOpen(false);
        setSearchOpen(false);
        setMarkMode(false);
      }
      return next;
    });
  }, [closeOtherRailSections]);

  const handleToggleMark = useCallback(() => {
    setMarkMode((open) => {
      const next = !open;
      if (next) {
        closeOtherRailSections();
        setUserLibOpen(false);
        setProjectOpen(false);
        setSearchOpen(false);
        setLayersOpen(false);
      }
      return next;
    });
  }, [closeOtherRailSections]);

  const openUserLibDrawer = useCallback(() => {
    closeOtherRailSections("userLib");
    setUserLibOpen(true);
    setProjectOpen(false);
  }, [closeOtherRailSections]);

  const openProjectDrawer = useCallback(() => {
    closeOtherRailSections("project");
    setProjectOpen(true);
    setUserLibOpen(false);
  }, [closeOtherRailSections]);

  return {
    userLibOpen,
    setUserLibOpen,
    projectOpen,
    setProjectOpen,
    searchOpen,
    layersOpen,
    markMode,
    setMarkMode,
    isArtboardSettingsOpen,
    setIsArtboardSettingsOpen,
    settingsSection,
    setSettingsSection,
    handleSelectSection,
    handleToggleSettings,
    handleToggleBrowser,
    handleToggleSearch,
    handleToggleLayers,
    handleToggleMark,
    openUserLibDrawer,
    openProjectDrawer,
    closeTransientRailPopovers,
  };
}
