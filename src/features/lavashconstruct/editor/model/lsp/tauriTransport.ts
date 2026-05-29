import { invoke, isTauri } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import {
  AbstractMessageReader,
  AbstractMessageWriter,
  createMessageConnection,
  type DataCallback,
  type Disposable,
  type Message,
  type MessageConnection,
} from "vscode-jsonrpc";

export class TauriMessageReader extends AbstractMessageReader {
  private unlistenMessage?: UnlistenFn;
  private unlistenClose?: UnlistenFn;
  private started = false;

  constructor(private readonly sessionId: string) {
    super();
  }

  listen(callback: DataCallback): Disposable {
    if (this.started) {
      throw new Error("TauriMessageReader.listen called twice");
    }
    this.started = true;

    void listen<string>(`lsp://message/${this.sessionId}`, (event) => {
      try {
        callback(JSON.parse(event.payload) as Message);
      } catch (error) {
        this.fireError(error);
      }
    }).then((unlisten) => {
      this.unlistenMessage = unlisten;
    });

    void listen(`lsp://close/${this.sessionId}`, () => {
      this.fireClose();
    }).then((unlisten) => {
      this.unlistenClose = unlisten;
    });

    return {
      dispose: () => this.dispose(),
    };
  }

  dispose(): void {
    super.dispose();
    void this.unlistenMessage?.();
    void this.unlistenClose?.();
  }
}

export class TauriMessageWriter extends AbstractMessageWriter {
  constructor(private readonly sessionId: string) {
    super();
  }

  async write(msg: Message): Promise<void> {
    await invoke("lsp_send", {
      sessionId: this.sessionId,
      message: JSON.stringify(msg),
    });
  }

  end(): void {
    this.fireClose();
  }
}

export type LspStartResult = {
  sessionId: string;
  workspaceRoot: string;
  workspaceUri: string;
  reused: boolean;
};

export function createTauriLspConnection(sessionId: string): MessageConnection {
  const reader = new TauriMessageReader(sessionId);
  const writer = new TauriMessageWriter(sessionId);
  return createMessageConnection(reader, writer);
}

export async function startLspServer(languageKey: string): Promise<LspStartResult> {
  if (!isTauri()) {
    throw new Error("LSP is only available in the desktop app");
  }
  return invoke<LspStartResult>("lsp_start", { language: languageKey });
}

export async function stopLspServer(sessionId: string): Promise<void> {
  if (!isTauri()) return;
  await invoke("lsp_stop", { sessionId });
}
