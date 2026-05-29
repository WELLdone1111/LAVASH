/** Markdown fence hints that spawn artboard panels (not CODE scratchpad). */
export const ASSISTANT_PANEL_FENCE_RE = /\b(?:lavash-panel|construct-panel)\b/i;

export function isAssistantPanelFence(tabHint: string): boolean {
  return ASSISTANT_PANEL_FENCE_RE.test(tabHint);
}

export const ASSISTANT_ARTBOARD_FENCE_HINTS = new Set(["lavash-artboard", "construct-artboard"]);

export function isAssistantArtboardFence(hint: string): boolean {
  return ASSISTANT_ARTBOARD_FENCE_HINTS.has(hint.trim().toLowerCase());
}
