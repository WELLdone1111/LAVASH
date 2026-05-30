import { FitAddon } from "@xterm/addon-fit";
import { Terminal } from "@xterm/xterm";
import { listen } from "@tauri-apps/api/event";
import { useEffect, useRef, useState } from "react";
import { isTauri } from "@tauri-apps/api/core";
import { useI18n } from "@/i18n/context";
import {
  killTerminalSession,
  resizeTerminalSession,
  spawnTerminalSession,
  writeTerminalSession,
} from "@/features/lavashconstruct/project/model/projectToolsApi";
import { formatDevToolsError } from "@/features/lavashconstruct/project/model/projectToolsModel";
import { useProjectWorkspaceStore } from "@/features/lavashconstruct/project/model/projectWorkspaceStore";
import "@xterm/xterm/css/xterm.css";
import "./ConstructTerminalPanel.css";

type TerminalOutputPayload = { sessionId: string; data: string };
type TerminalExitPayload = { sessionId: string };

function payloadSessionId(payload: { sessionId?: string; session_id?: string }): string | undefined {
  return payload.sessionId ?? payload.session_id;
}

export default function ConstructTerminalPanel() {
  const { t } = useI18n();
  const projectRoot = useProjectWorkspaceStore((s) => s.projectRoot);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [bootError, setBootError] = useState<string | null>(null);

  useEffect(() => {
    if (!isTauri() || !containerRef.current) return;

    const term = new Terminal({
      cursorBlink: true,
      fontSize: 12,
      fontFamily: "ui-monospace, Menlo, Consolas, monospace",
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
    let sessionClosed = false;
    const sessionIdRef = { current: null as string | null };

    const syncPtySize = () => {
      const id = sessionIdRef.current;
      if (!id) return;
      void resizeTerminalSession(id, term.rows, term.cols);
    };

    void (async () => {
      try {
        const id = await spawnTerminalSession(projectRoot);
        if (disposed) {
          await killTerminalSession(id);
          return;
        }
        sessionIdRef.current = id;
        term.writeln(t("devTools.terminal.ready"));
        syncPtySize();
      } catch (error) {
        const message = formatDevToolsError(error, t("devTools.terminal.startFailed"));
        setBootError(message);
        term.writeln(`\r\n\x1b[31m${message}\x1b[0m`);
      }
    })();

    const onData = term.onData((data) => {
      const id = sessionIdRef.current;
      if (!id || sessionClosed) return;
      void writeTerminalSession(id, data).catch((error) => {
        const message = formatDevToolsError(error, t("devTools.terminal.writeFailed"));
        if (message.toLowerCase().includes("closed") || message.includes("232")) {
          sessionClosed = true;
          sessionIdRef.current = null;
          term.writeln(`\r\n\x1b[33m${t("devTools.terminal.exited")}\x1b[0m`);
          return;
        }
        term.writeln(`\r\n\x1b[31m${message}\x1b[0m`);
      });
    });

    const unlistenOutput = listen<TerminalOutputPayload>("terminal-output", (event) => {
      if (payloadSessionId(event.payload) !== sessionIdRef.current) return;
      term.write(event.payload.data);
    });

    const unlistenExit = listen<TerminalExitPayload>("terminal-exit", (event) => {
      if (payloadSessionId(event.payload) !== sessionIdRef.current) return;
      sessionClosed = true;
      term.writeln(`\r\n\x1b[33m${t("devTools.terminal.exited")}\x1b[0m`);
      sessionIdRef.current = null;
    });

    const ro = new ResizeObserver(() => {
      fit.fit();
      syncPtySize();
    });
    ro.observe(containerRef.current);

    return () => {
      disposed = true;
      sessionClosed = true;
      onData.dispose();
      ro.disconnect();
      const id = sessionIdRef.current;
      sessionIdRef.current = null;
      if (id) void killTerminalSession(id);
      term.dispose();
      void unlistenOutput.then((fn) => fn());
      void unlistenExit.then((fn) => fn());
    };
  }, [projectRoot, t]);

  return (
    <div className="lc-terminal-panel">
      {bootError ? (
        <p className="lc-devtools-panel__notice lc-devtools-panel__notice--error" role="alert">
          {bootError}
        </p>
      ) : null}
      <div ref={containerRef} className="lc-terminal-panel__host" />
    </div>
  );
}
