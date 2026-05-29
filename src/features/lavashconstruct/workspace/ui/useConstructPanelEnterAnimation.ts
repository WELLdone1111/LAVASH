import { useEffect, useState } from "react";

/** Тривалість enter/exit — як у ConstructSettingsWorkspaceDrawer. */
export const CONSTRUCT_PANEL_ENTER_MS = 280;

export type ConstructPanelEnterAnimation = {
  mounted: boolean;
  entered: boolean;
  enteredAttr: "true" | "false";
};

/** Mount + double-rAF enter; delayed unmount on close (fade/slide CSS via data-entered). */
export function useConstructPanelEnterAnimation(isOpen: boolean): ConstructPanelEnterAnimation {
  const [mounted, setMounted] = useState(false);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setEntered(false);
      const timer = window.setTimeout(() => setMounted(false), CONSTRUCT_PANEL_ENTER_MS);
      return () => window.clearTimeout(timer);
    }
    setMounted(true);
    let raf1 = 0;
    let raf2 = 0;
    raf1 = window.requestAnimationFrame(() => {
      raf2 = window.requestAnimationFrame(() => setEntered(true));
    });
    return () => {
      window.cancelAnimationFrame(raf1);
      window.cancelAnimationFrame(raf2);
    };
  }, [isOpen]);

  return {
    mounted,
    entered,
    enteredAttr: entered ? "true" : "false",
  };
}
