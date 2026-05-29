import { FitAddon } from "@xterm/addon-fit";
import { Terminal } from "@xterm/xterm";
import { listen } from "@tauri-apps/api/event";
import { useEffect, useRef } from "react";
import { isTauri } from "@tauri-apps/api/core";
import { useI18n } from "@/i18n/context";
import {
  terminalKill,
  terminalSpawn,
  terminalWrite,
} from "@/features/lavashconstruct/project/model/projectWorkspaceApi";
import { useProjectWorkspaceStore } from "@/features/lavashconstruct/project/model/projectWorkspaceStore";
import "@xterm/xterm/css/xterm.css";
import "./ConstructTerminalPanel.css";

type TerminalOutputPayload = { sessionId: string; data: string };
type TerminalExitPayload = { sessionId: string };

export default function ConstructTerminalPanel() {
  const { t } = useI18n();
  const projectRoot = useProjectWorkspaceStore((s) => s.projectRoot);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const sessionRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isTauri() || !containerRef.current || !projectRoot) return;

    const term = new Terminal({
      cursorBlink: true,
      fontSize: 12,
      fontFamily: 'ui-monospace, Menlo, Consolas, monospace',
      theme: {
        background: "#1a1a1a",
        foreground: "#e8e8e8",
        cursor: "#ffb800",
      },
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(containerRef.current);
    fit.fit();

    let disposed = false;
    const sessionIdRef = { current: null as string | null };

    void (async () => {
      try {
        const id = await terminalSpawn(projectRoot);
        if (disposed) {
          await terminalKill(id);
          return;
        }
        sessionIdRef.current = id;
        sessionRef.current = id;
        term.writeln(t("construct.terminal.ready"));
      } catch (error) {
        term.writeln(`\r\n\x1b[31m${String(error)}\x1b[0m`);
      }
    })();

    const onData = term.onData((data) => {
      const id = sessionIdRef.current;
      if (!id) return;
      void terminalWrite(id, data);
    });

    const unlistenOutput = listen<TerminalOutputPayload>("terminal-output", (event) => {
      if (event.payload.sessionId !== sessionIdRef.current) return;
      term.write(event.payload.data);
    });

    const unlistenExit = listen<TerminalExitPayload>("terminal-exit", (event) => {
      if (event.payload.sessionId !== sessionIdRef.current) return;
      term.writeln(`\r\n\x1b[33m${t("construct.terminal.exited")}\x1b[0m`);
    });

    const ro = new ResizeObserver(() => fit.fit());
    ro.observe(containerRef.current);

    return () => {
      disposed = true;
      onData.dispose();
      ro.disconnect();
      const id = sessionIdRef.current;
      if (id) void terminalKill(id);
      term.dispose();
      void unlistenOutput.then((fn) => fn());
      void unlistenExit.then((fn) => fn());
    };
  }, [projectRoot, t]);

  return (
    <div className="lc-terminal-panel">
      <div ref={containerRef} className="lc-terminal-panel__host" />
    </div>
  );
}
