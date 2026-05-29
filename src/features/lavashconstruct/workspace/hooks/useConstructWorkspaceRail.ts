import { useCallback, useEffect, useState } from "react";
import { CONSTRUCT_OPEN_MODELS_SECTION_EVENT } from "@/features/lavashconstruct/chat/model/constructModelBus";
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

  const closeTransientRailPopovers = useCallback(() => {
    setSearchOpen(false);
    setLayersOpen(false);
    setMarkMode(false);
  }, []);

  useEffect(() => {
    const openModels = () => {
      closeTransientRailPopovers();
      setUserLibOpen(false);
      setProjectOpen(false);
      setSettingsSection("models");
      setIsArtboardSettingsOpen(true);
    };
    window.addEventListener(CONSTRUCT_OPEN_MODELS_SECTION_EVENT, openModels);
    return () => window.removeEventListener(CONSTRUCT_OPEN_MODELS_SECTION_EVENT, openModels);
  }, [closeTransientRailPopovers]);

  useEffect(() => {
    if (!markMode) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMarkMode(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [markMode]);

  const handleSelectSection = useCallback((id: ConstructSectionId) => {
    closeTransientRailPopovers();
    if (id === "userLib") {
      setUserLibOpen((open) => !open);
      setProjectOpen(false);
      return;
    }
    if (id === "project") {
      setProjectOpen((open) => !open);
      setUserLibOpen(false);
      return;
    }
    setUserLibOpen(false);
    setProjectOpen(false);
  }, [closeTransientRailPopovers]);

  const handleOpenSettingsFromSearch = useCallback(
    (section: ConstructSettingsSection) => {
      closeTransientRailPopovers();
      setUserLibOpen(false);
      setProjectOpen(false);
      setSettingsSection(section);
      setIsArtboardSettingsOpen(true);
    },
    [closeTransientRailPopovers],
  );

  const handleToggleSearch = useCallback(() => {
    setSearchOpen((open) => {
      const next = !open;
      if (next) {
        setUserLibOpen(false);
        setProjectOpen(false);
        setLayersOpen(false);
        setMarkMode(false);
      }
      return next;
    });
  }, []);

  const handleToggleLayers = useCallback(() => {
    setLayersOpen((open) => {
      const next = !open;
      if (next) {
        setUserLibOpen(false);
        setProjectOpen(false);
        setSearchOpen(false);
        setMarkMode(false);
      }
      return next;
    });
  }, []);

  const handleToggleMark = useCallback(() => {
    setMarkMode((open) => {
      const next = !open;
      if (next) {
        setUserLibOpen(false);
        setProjectOpen(false);
        setSearchOpen(false);
        setLayersOpen(false);
      }
      return next;
    });
  }, []);

  const openUserLibDrawer = useCallback(() => {
    setUserLibOpen(true);
    setProjectOpen(false);
    closeTransientRailPopovers();
  }, [closeTransientRailPopovers]);

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
    handleOpenSettingsFromSearch,
    handleToggleSearch,
    handleToggleLayers,
    handleToggleMark,
    openUserLibDrawer,
    closeTransientRailPopovers,
  };
}
