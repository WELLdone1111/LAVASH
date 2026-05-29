import { useState } from "react";
import { useIdeBrowserStore } from "@/features/ide-browser/model/ideBrowserStore";

export function useConstructWorkspaceBrowserSplit() {
  const [browserSplitRatio, setBrowserSplitRatio] = useState(0.5);
  const ideBrowserOpen = useIdeBrowserStore((s) => s.open);

  return {
    ideBrowserOpen,
    browserSplitRatio,
    setBrowserSplitRatio,
  };
}
