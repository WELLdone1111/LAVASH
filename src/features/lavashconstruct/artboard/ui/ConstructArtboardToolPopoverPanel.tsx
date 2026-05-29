import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useConstructPanelEnterAnimation } from "@/features/lavashconstruct/workspace/ui/useConstructPanelEnterAnimation";

type ConstructArtboardToolPopoverPanelProps = {
  isOpen: boolean;
  title: string;
  ariaLabel?: string;
  className?: string;
  bodyClassName?: string;
  children: ReactNode;
};

/** Popover пошуку / шарів на артборді — enter як у popover налаштувань toolbar. */
export default function ConstructArtboardToolPopoverPanel({
  isOpen,
  title,
  ariaLabel,
  className,
  bodyClassName,
  children,
}: ConstructArtboardToolPopoverPanelProps) {
  const { mounted, enteredAttr } = useConstructPanelEnterAnimation(isOpen);

  if (!mounted) return null;

  return (
    <div
      className={cn("lc-artboard-tool-popover", className)}
      role="dialog"
      aria-label={ariaLabel ?? title}
      data-entered={enteredAttr}
    >
      <div className="lc-artboard-tool-popover__header">
        <span>{title}</span>
      </div>
      <div className={cn("lc-artboard-tool-popover__body", bodyClassName)}>{children}</div>
    </div>
  );
}
