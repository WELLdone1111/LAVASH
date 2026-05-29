import { isMonacoCanceledReason } from "@/features/lavashconstruct/editor/model/monacoSetup";

let installed = false;

/** Логує необроблені помилки; Monaco `Canceled` ігнорується (див. monacoSetup). */
export function installGlobalErrorHandlers(): void {
  if (installed || typeof window === "undefined") return;
  installed = true;

  window.addEventListener("error", (event) => {
    console.error("[LAVASH] uncaught error", event.error ?? event.message, event.filename, event.lineno);
  });

  window.addEventListener("unhandledrejection", (event) => {
    if (isMonacoCanceledReason(event.reason)) {
      event.preventDefault();
      return;
    }
    console.error("[LAVASH] unhandled rejection", event.reason);
  });
}
