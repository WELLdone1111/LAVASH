import { useEffect, useRef, type ReactNode } from "react";
import { Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n/context";
import { useConstructPanelEnterAnimation } from "@/features/lavashconstruct/workspace/ui/useConstructPanelEnterAnimation";

type ConstructArtboardSettingsPopoverProps = {
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  children: ReactNode;
  placement?: "toolbar" | "rail";
};

export default function ConstructArtboardSettingsPopover({
  isOpen,
  onToggle,
  onClose,
  children,
  placement = "toolbar",
}: ConstructArtboardSettingsPopoverProps) {
  const { t } = useI18n();
  const anchorRef = useRef<HTMLDivElement | null>(null);
  const { mounted, enteredAttr } = useConstructPanelEnterAnimation(isOpen);
  const isRail = placement === "rail";

  useEffect(() => {
    if (!isOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      const anchor = anchorRef.current;
      if (!anchor || anchor.contains(event.target as Node)) return;
      onClose();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen, onClose]);

  return (
    <div
      ref={anchorRef}
      className={cn("lavash-artboard-settings-anchor", isRail && "lavash-artboard-settings-anchor--rail")}
    >
      <button
        type="button"
        className={cn(
          isRail ? "lc-section-rail__btn" : "lavash-artboard-view-button",
          isRail && isOpen && "lc-section-rail__btn--active",
        )}
        aria-expanded={isOpen}
        aria-controls="lavash-artboard-settings-dialog"
        aria-label={t("construct.settings.aria")}
        title={t("construct.settings.title")}
        onClick={onToggle}
      >
        {isRail ? <Settings size={20} strokeWidth={1.75} aria-hidden /> : t("construct.settings.title")}
      </button>
      {mounted ? (
        <div
          id="lavash-artboard-settings-dialog"
          className={cn("lavash-artboard-settings-popover", isRail && "lavash-artboard-settings-popover--rail")}
          role="dialog"
          aria-label={t("construct.settings.aria")}
          data-entered={enteredAttr}
        >
          <div className="lavash-artboard-settings-popover__header">
            <strong>{t("construct.settings.title")}</strong>
            <button type="button" className="lavash-artboard-view-button" onClick={onClose}>
              {t("construct.artboard.close")}
            </button>
          </div>
          <div className="lavash-artboard-settings-popover__body">{children}</div>
        </div>
      ) : null}
    </div>
  );
}
