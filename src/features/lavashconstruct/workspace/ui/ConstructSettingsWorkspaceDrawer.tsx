import { useEffect, type ReactNode } from "react";
import { ChevronLeft } from "lucide-react";
import { useI18n } from "@/i18n/context";
import { cn } from "@/lib/utils";
import { useConstructPanelEnterAnimation } from "@/features/lavashconstruct/workspace/ui/useConstructPanelEnterAnimation";

type ConstructSettingsWorkspaceDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
};

export default function ConstructSettingsWorkspaceDrawer({
  isOpen,
  onClose,
  children,
  wide = false,
}: ConstructSettingsWorkspaceDrawerProps) {
  const { t } = useI18n();
  const { mounted, enteredAttr } = useConstructPanelEnterAnimation(isOpen);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  if (!mounted) return null;

  return (
    <aside
      className={cn("lc-settings-workspace-drawer", wide && "lc-settings-workspace-drawer--wide")}
      role="complementary"
      aria-label={t("construct.settings.aria")}
      data-entered={enteredAttr}
    >
      <div className="lc-settings-workspace-drawer__header">
        <button
          type="button"
          className="lc-settings-workspace-drawer__back"
          aria-label={t("construct.settings.back")}
          onClick={onClose}
        >
          <ChevronLeft size={16} strokeWidth={2} aria-hidden />
        </button>
      </div>
      <div className="lc-settings-workspace-drawer__body">{children}</div>
    </aside>
  );
}
