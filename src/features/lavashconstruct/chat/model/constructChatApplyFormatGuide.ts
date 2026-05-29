import type { ConstructChatAgentMode } from "@/features/lavashconstruct/chat/model/constructChatAgentMode";

/**
 * Як модель має відповідати, щоб LAVASH реально застосував зміни (не «відкрий вкладку CODE»).
 * Додається до construct snapshot у Agent (і коротко в Plan).
 */
export function buildConstructApplyFormatGuide(mode: ConstructChatAgentMode): string {
  const sharedRules = [
    "[LAVASH apply format — mandatory]",
    "LAVASH auto-applies ONLY markdown code fences. Prose instructions do NOT change the artboard.",
    "NEVER tell the user to: switch tabs manually, press Ctrl+S, use a console, or type `tab`.",
    "NEVER write empty steps like «Apply the following command:» without a complete fence block.",
  ];

  if (mode === "ask" || mode === "debug") {
    return [...sharedRules, "In Ask/Debug: explain in prose only; no apply fences."].join("\n");
  }

  if (mode === "plan") {
    return [
      ...sharedRules,
      "In Plan: describe steps in prose; you may show fence examples as read-only previews.",
      "Do not output fences that would apply until the user switches to Agent mode.",
    ].join("\n");
  }

  return [
    ...sharedRules,
    "[Agent — output rules]",
    "1. For a NEW UI component on the artboard → one ```html lavash-panel Title``` fence with self-contained HTML+CSS (+ optional JS).",
    "2. To move/resize/style existing panels by id → ```json lavash-artboard``` with {\"merge\":true,\"artboardPanels\":[...]}.",
    "3. Optional extra code tab → plain ```css``` / ```html``` fence (no lavash-panel hint) goes to CODE scratch.",
    "4. Keep prose short (1–3 sentences). Put the real work inside fences.",
    "5. ALWAYS close every fence with a line containing only ``` (models often forget — unclosed fences may not apply).",
    "6. Prefer one compact HTML document: <!DOCTYPE html><html><head>…</head><body>…</body></html> — no broken <style> tags.",
    "",
    "Example — futuristic play/pause button panel (adapt to user request):",
    "```html lavash-panel Play Pause",
    "<!DOCTYPE html><html><head><meta charset=\"utf-8\"><style>",
    "html,body{margin:0;height:100%;display:grid;place-items:center;background:transparent;font-family:system-ui,sans-serif}",
    ".pp{--a:#00f0ff;--b:#7c3aed;width:120px;height:120px;border-radius:50%;border:2px solid var(--a);",
    "box-shadow:0 0 24px color-mix(in srgb,var(--a) 55%,transparent);cursor:pointer;position:relative;",
    "background:radial-gradient(circle at 30% 30%,#1a1a2e,#0a0a12);transition:transform .2s,box-shadow .2s}",
    ".pp:hover{transform:scale(1.05);box-shadow:0 0 36px color-mix(in srgb,var(--a) 70%,transparent)}",
    ".pp::before,.pp::after{content:'';position:absolute;top:50%;left:50%;transform:translate(-50%,-50%)}",
    ".pp.play::before{border-style:solid;border-width:14px 0 14px 22px;border-color:transparent transparent transparent var(--a);margin-left:4px}",
    ".pp.pause::before{width:8px;height:28px;background:var(--a);box-shadow:12px 0 0 var(--a);border-radius:2px}",
    "</style></head><body>",
    "<button type=\"button\" class=\"pp play\" id=\"b\" aria-label=\"Play\"></button>",
    "<script>const b=document.getElementById('b');b.onclick=()=>{const p=b.classList.toggle('play');b.classList.toggle('pause',!p);};</script>",
    "</body></html>",
    "```",
  ].join("\n");
}
