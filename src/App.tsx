import { useEffect } from "react";
import { LavashConstructWorkspace } from "@/features/lavashconstruct";
import { hydrateStoredAppearance } from "@/features/lavashconstruct/shared/model/applyAppearance";
import WindowFrameControls from "@/shared/components/WindowFrameControls";
import WindowResizeEdges from "@/shared/components/WindowResizeEdges";
import "./App.css";

export default function App() {
  useEffect(() => {
    document.documentElement.dataset.activeWorkspace = "lavashconstruct";
    hydrateStoredAppearance();
  }, []);

  return (
    <div className="app-root lavash-app">
      <WindowFrameControls />
      <main className="lavash-main">
        <LavashConstructWorkspace animationState="enter" />
      </main>
      <WindowResizeEdges />
    </div>
  );
}
