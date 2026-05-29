import { useCallback } from "react";
import { isTauri } from "@tauri-apps/api/core";
import { useI18n } from "@/i18n/context";
import { openResourcesWindow } from "@/features/resources/model/openResourcesWindow";
import MonitorActivityIcon from "@/features/resources/ui/MonitorActivityIcon";
import "@/features/resources/ui/LavashResourcesButton.css";

export default function LavashResourcesButton() {
  const { t } = useI18n();

  const onOpen = useCallback(() => {
    void openResourcesWindow(t("resources.windowTitle"));
  }, [t]);

  return (
    <button
      type="button"
      className="lc-resources-btn"
      onClick={onOpen}
      aria-label={t("resources.open")}
      title={t("resources.openHint")}
      disabled={!isTauri()}
    >
      <MonitorActivityIcon size={14} />
    </button>
  );
}
