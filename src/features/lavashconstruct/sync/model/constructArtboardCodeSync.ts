import { startProjectArtboardSync } from "./projectArtboardSync";
import { startScratchArtboardSync } from "./scratchArtboardSync";

/**
 * Єдина точка входу: двосторонній sync artboard ↔ code (scratch tabs + project files).
 * Обидва канали ділять один `artboardCodeSyncMachine` для echo suppression.
 */
export function startConstructArtboardCodeSync(): () => void {
  const stopScratch = startScratchArtboardSync();
  const stopProject = startProjectArtboardSync();
  return () => {
    stopScratch();
    stopProject();
  };
}
