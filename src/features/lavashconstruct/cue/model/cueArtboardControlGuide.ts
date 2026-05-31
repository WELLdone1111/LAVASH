import type { ConstructChatAgentMode } from "@/features/lavashconstruct/chat/model/constructChatAgentMode";

/** Structured artboard control via ```json lavash-actions``` — primary apply path in Agent mode. */
export function buildCueArtboardActionsGuide(mode: ConstructChatAgentMode): string {
  if (mode !== "agent") return "";

  return [
    "[LAVASH artboard control — full model authority in Agent mode]",
    "Prefer ONE ```json lavash-actions``` block. LAVASH applies it automatically (local + cloud).",
    "You may combine multiple actions in one array. Prose alone does NOT change the artboard.",
    "",
    "Action types:",
    "1. spawn_panel — new HTML/CSS panel: {type,title,html,lang?}",
    "2. patch_artboard — partial update by id (merge keeps other panels/fields): {type,merge:true,artboardPanels:[{id,x?,y?,width?,height?,importedTextContent?,isVisible?,...}]}",
    "3. replace_artboard — full replace all panels: {type,artboardPanels:[...]}",
    "4. remove_panels — delete by id (subtree): {type,panelIds:[\"id1\"]}",
    "5. clear_artboard — remove every panel: {type:\"clear_artboard\"}",
    "6. reorder_panels — root layer order back→front: {type,orderedIds:[...]} or with parentId for composition children",
    "7. select_panel — focus panel in UI: {type,panelId:\"id\"} or panelId:null",
    "",
    "Patch tips: only include fields you change; omit fields to preserve content/style.",
    "Geometry: x,y,width,height,localX,localY,rotationDeg,zIndex | Visibility: isVisible,isLocked | Style: opacity,blurPx,borderRadiusPx,backgroundColor,shadow*,neon*,hoverScale",
    "",
    "Example — move + hide + spawn:",
    "```json lavash-actions",
    "[",
    "  {\"type\":\"patch_artboard\",\"merge\":true,\"artboardPanels\":[{\"id\":\"panel-1\",\"x\":120,\"y\":80,\"isVisible\":false}]},",
    "  {\"type\":\"spawn_panel\",\"title\":\"CTA\",\"html\":\"<!DOCTYPE html><html><body><button>Go</button></body></html>\"}",
    "]",
    "```",
    "",
    "Markdown fences (lavash-panel, lavash-artboard) still work as alternatives.",
  ].join("\n");
}
