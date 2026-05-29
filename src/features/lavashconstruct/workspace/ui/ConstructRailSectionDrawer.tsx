import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useConstructPanelEnterAnimation } from "@/features/lavashconstruct/workspace/ui/useConstructPanelEnterAnimation";

type ConstructRailSectionDrawerProps = {
  isOpen: boolean;
  title: string;
  ariaLabel?: string;
  className?: string;
  bodyClassName?: string;
  children: ReactNode;
};

/** Drawer зліва від rail (Моделі, Проєкт, Бібліотека) — та сама enter-анімація, що в налаштуваннях. */
export default function ConstructRailSectionDrawer({
  isOpen,
  title,
  ariaLabel,
  className,
  bodyClassName,
  children,
}: ConstructRailSectionDrawerProps) {
  const { mounted, enteredAttr } = useConstructPanelEnterAnimation(isOpen);

  if (!mounted) return null;

  return (
    <aside
      className={cn("lc-user-lib-drawer", className)}
      role="dialog"
      aria-modal="false"
      aria-label={ariaLabel ?? title}
      data-entered={enteredAttr}
    >
      <div className="lc-user-lib-drawer__header">
        <span>{title}</span>
      </div>
      <div className={cn("lc-user-lib-drawer__body", bodyClassName)}>{children}</div>
    </aside>
  );
}
