/** Одноразово прибирає localStorage від пресетів / плеєра (більше не використовується). */
const PURGE_DONE_KEY = "lavash.legacyPlayerStoragePurged.v1";

const KEYS_TO_REMOVE = [
  "lavash.presets.layouts.v1",
  "lavash.construct.currentPresetId",
  "lavash.runtime.appliedMainPresetId",
  "lavash.runtime.floatingMiniPresets",
  "motif.presets.layouts.v1",
  "motif.lab.currentPresetId",
  "motif.runtime.appliedMainPresetId",
  "motif.runtime.floatingMiniPresets",
  "somp.runtime.appliedMainPresetId",
  "somp.runtime.floatingMiniPresets",
] as const;

export function purgeLegacyPlayerStorage(): void {
  if (typeof localStorage === "undefined") return;
  if (localStorage.getItem(PURGE_DONE_KEY) === "1") return;
  for (const key of KEYS_TO_REMOVE) {
    try {
      localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  }
  try {
    localStorage.setItem(PURGE_DONE_KEY, "1");
  } catch {
    /* ignore */
  }
}
