import { cn } from "@/lib/utils";
import { useWindowDragPointerDown } from "@/shared/lib/useWindowDrag";

type WindowDragSpacerProps = {
  className?: string;
};

/** Flex-пустишка: тягни вікно тут. Кнопки — мимо неї. */
export default function WindowDragSpacer({ className }: WindowDragSpacerProps) {
  const onPointerDown = useWindowDragPointerDown();

  return (
    <div
      className={cn("lavash-window-drag-spacer", className)}
      data-tauri-drag-region
      aria-hidden
      onPointerDown={onPointerDown}
    />
  );
}
