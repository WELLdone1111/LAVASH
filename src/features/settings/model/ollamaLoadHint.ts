/** 0 = найлегший … 4 = найважчий для цієї евристики (зелений → фіолетовий в UI). */
export type OllamaLoadTier = 0 | 1 | 2 | 3 | 4;

export type HardwareSnapshot = {
  ramGb: number | null;
  cpuThreads: number;
  ramUnknown: boolean;
};

export function readHardwareSnapshot(): HardwareSnapshot {
  const nav = typeof navigator !== "undefined" ? navigator : undefined;
  const cpuThreads = typeof nav?.hardwareConcurrency === "number" && nav.hardwareConcurrency > 0 ? nav.hardwareConcurrency : 8;
  const dm = nav as Navigator & { deviceMemory?: number };
  const raw = typeof dm?.deviceMemory === "number" && dm.deviceMemory > 0 ? dm.deviceMemory : null;
  return {
    ramGb: raw,
    cpuThreads,
    ramUnknown: raw === null,
  };
}

/**
 * Грубо мільярди параметрів для пресет-підказок (якщо в тезі нема явного сайзу — ставимо прагматичний дефолт).
 */
export function modelBillionsFromTag(tag: string): number {
  const t = tag.toLowerCase();
  if (t.startsWith("gemma4")) {
    const e = /gemma4:e(\d+)b/.exec(t);
    if (e) return Number(e[1]);
    if (t.includes(":26b") || t.endsWith(":26b")) return 26;
    if (t.includes(":31b") || t.endsWith(":31b")) return 31;
    if (t === "gemma4" || t.includes("e4b")) return 4;
    return 4;
  }
  const m = /(\d+(?:\.\d+)?)\s*b\b/.exec(t);
  if (m) return Number(m[1]);
  if (t.includes("phi3") && t.includes("mini")) return 3.8;
  if (t === "mistral") return 7;
  return 7;
}

export type OllamaLocalModelRow = {
  name: string;
  sizeBytes: number;
};

export function formatBillions(b: number): string {
  if (Number.isInteger(b)) return `${b}B`;
  const s = b.toFixed(1);
  return `${s.endsWith(".0") ? String(Math.round(b)) : s}B`;
}

/** Розмір моделі на диску (Ollama `size`); `null` якщо невідомо або 0. */
export function formatOllamaDiskGbLabel(
  bytes: number,
  t: (key: string, vars?: Record<string, string | number>) => string,
): string | null {
  if (typeof bytes !== "number" || !Number.isFinite(bytes) || bytes <= 0) return null;
  const gb = bytes / 1024 ** 3;
  let n: string;
  if (gb >= 100) n = String(Math.round(gb));
  else if (gb >= 10) n = gb.toFixed(1);
  else if (gb >= 1) n = gb.toFixed(1);
  else n = gb.toFixed(2);
  return t("settings.ollama.diskGb", { gb: n });
}

/**
 * Евристика: більше RAM і ядер проти сайзу моделі → нижчий tier (зеленіший).
 * Якщо RAM невідома — для скорингу беремо 16 ГБ (але прапор `ramUnknown` лишається).
 */
export function computeLoadTier(hw: HardwareSnapshot, modelBillions: number): OllamaLoadTier {
  const ramForScore = hw.ramGb ?? 16;
  const b = modelBillions;
  const cpu = Math.max(4, hw.cpuThreads);
  const memoryIndex = Math.min(1.35, ramForScore / (b * 1.75 + 5.5));
  const cpuIndex = Math.min(1.1, cpu / (b * 1.85 + 3));
  const combined = memoryIndex * 0.62 + cpuIndex * 0.38;
  if (combined >= 0.88) return 0;
  if (combined >= 0.68) return 1;
  if (combined >= 0.48) return 2;
  if (combined >= 0.3) return 3;
  return 4;
}
