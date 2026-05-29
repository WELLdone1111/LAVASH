import type { CSSProperties, ReactNode } from "react";
import ConstructIdeBrowserPanel from "@/features/ide-browser/ui/ConstructIdeBrowserPanel";

type ConstructWorkspaceBrowserSplitProps = {
  open: boolean;
  splitRatio: number;
  onSplitRatioChange: (ratio: number) => void;
  overlaySuppressed: boolean;
  children: ReactNode;
};

export default function ConstructWorkspaceBrowserSplit({
  open,
  splitRatio,
  onSplitRatioChange,
  overlaySuppressed,
  children,
}: ConstructWorkspaceBrowserSplitProps) {
  return (
    <div
      className="lc-artboard-workspace-split"
      data-browser-open={open ? "true" : undefined}
      style={
        open ? ({ "--lc-browser-split": `${Math.round(splitRatio * 1000) / 10}%` } as CSSProperties) : undefined
      }
    >
      {open ? (
        <ConstructIdeBrowserPanel
          splitRatio={splitRatio}
          onSplitRatioChange={onSplitRatioChange}
          overlaySuppressed={overlaySuppressed}
        />
      ) : null}
      <div className="lc-artboard-workspace-main">{children}</div>
    </div>
  );
}
