/** Вкладки дока з повноекранною панеллю (повторний клік = pulse, не закриття). */
export const DOCK_WORKSPACE_IDS = [
  "profile",
  "lavashconstruct",
  "presets",
  "player",
  "store",
  "settings",
] as const;

export type DockWorkspaceId = (typeof DOCK_WORKSPACE_IDS)[number];

export type WorkspaceDockPulse = {
  workspaceId: DockWorkspaceId;
  nonce: number;
};

export function isDockWorkspaceId(id: string): id is DockWorkspaceId {
  return (DOCK_WORKSPACE_IDS as readonly string[]).includes(id);
}

export function dockPulseDataAttr(pulseKey?: number): { "data-dock-pulse"?: string } {
  if (pulseKey == null || pulseKey === 0) return {};
  return { "data-dock-pulse": String(pulseKey) };
}

export function dockAffirmDataAttr(pulseKey?: number): { "data-dock-affirm"?: string } {
  if (pulseKey == null || pulseKey === 0) return {};
  return { "data-dock-affirm": String(pulseKey) };
}
