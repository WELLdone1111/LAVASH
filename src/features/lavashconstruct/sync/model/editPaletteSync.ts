/**
 * Edit palette (pickers + sliders) ↔ imported panel preview.
 * Channel: visual property sync (not raw code tabs / project files).
 */

import type { ArtboardPanel } from "@/features/lavashconstruct/artboard/ui/types";

export type EditCssVarName = "--accent-color" | "--bg-color" | "--text-color";

export type EditCssVarsState = Record<EditCssVarName, string>;

const EDIT_VAR_NAMES: readonly EditCssVarName[] = ["--accent-color", "--bg-color", "--text-color"];

export function buildInjectedCssRoot(vars: EditCssVarsState): string {
  return `:root { --accent-color: ${vars["--accent-color"]}; --bg-color: ${vars["--bg-color"]}; --text-color: ${vars["--text-color"]}; }`;
}

function parseVarsFromDeclBlock(block: string): Partial<EditCssVarsState> | null {
  const out: Partial<EditCssVarsState> = {};
  for (const name of EDIT_VAR_NAMES) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`${escaped}\\s*:\\s*([^;]+);`, "i");
    const m = block.match(re);
    if (m?.[1]) out[name] = m[1].trim();
  }
  return Object.keys(out).length > 0 ? out : null;
}

function parseVarsLastOccurrences(source: string): Partial<EditCssVarsState> | null {
  const merged: Partial<EditCssVarsState> = {};
  for (const name of EDIT_VAR_NAMES) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`${escaped}\\s*:\\s*([^;]+);`, "gi");
    let last: string | undefined;
    let m: RegExpExecArray | null;
    while ((m = re.exec(source)) !== null) last = m[1].trim();
    if (last) merged[name] = last;
  }
  return Object.keys(merged).length > 0 ? merged : null;
}

export function extractCssVarsFromEditSource(
  visualKind: "plain-text" | "html" | "css" | "jsx",
  source: string,
): Partial<EditCssVarsState> | null {
  if (visualKind === "plain-text") return null;

  const rootMatch = source.match(/:root\s*\{([^}]*)\}/i);
  if (rootMatch?.[1]) {
    const fromRoot = parseVarsFromDeclBlock(rootMatch[1]);
    if (fromRoot) return fromRoot;
  }

  if (visualKind === "jsx") {
    const colorM = source.match(/--color\s*:\s*([^;]+);/i);
    if (colorM?.[1]) return { "--accent-color": colorM[1].trim() };
  }

  if (visualKind === "css" || visualKind === "html") {
    return parseVarsLastOccurrences(source);
  }

  return parseVarsLastOccurrences(source);
}

export type ImportedLiveEditSliders = {
  opacity: number;
  blurPx: number;
  borderRadiusPx: number;
  hoverScale: number;
};

export function buildImportedLiveEditPanelPatch(
  panel: ArtboardPanel,
  args: {
    visualKind: "plain-text" | "html" | "css" | "jsx";
    source: string;
    vars: EditCssVarsState;
    sliders: ImportedLiveEditSliders;
  },
): ArtboardPanel | null {
  const cssRoot =
    args.visualKind === "html" || args.visualKind === "jsx" ? buildInjectedCssRoot(args.vars) : undefined;
  const target = {
    ...panel,
    importedSourceKind: "text" as const,
    importedVisualKind: args.visualKind,
    importedTextContent: args.source,
    importedHtmlPreviewExtraCss: cssRoot,
    backgroundColor: args.vars["--bg-color"],
    opacity: args.sliders.opacity,
    blurPx: args.sliders.blurPx,
    borderRadiusPx: args.sliders.borderRadiusPx,
    hoverScale: args.sliders.hoverScale,
  };
  const same =
    panel.importedTextContent === target.importedTextContent &&
    panel.importedHtmlPreviewExtraCss === target.importedHtmlPreviewExtraCss &&
    panel.backgroundColor === target.backgroundColor &&
    panel.opacity === target.opacity &&
    panel.blurPx === target.blurPx &&
    panel.borderRadiusPx === target.borderRadiusPx &&
    panel.hoverScale === target.hoverScale &&
    panel.importedSourceKind === target.importedSourceKind &&
    panel.importedVisualKind === target.importedVisualKind;
  if (same) return null;
  return target;
}
