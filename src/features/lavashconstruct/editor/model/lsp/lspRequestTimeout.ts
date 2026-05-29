import type { MessageConnection } from "vscode-jsonrpc";

export const DEFAULT_LSP_REQUEST_TIMEOUT_MS = 15_000;

export function sendLspRequestWithTimeout<T>(
  connection: MessageConnection,
  method: string,
  params: unknown,
  timeoutMs: number = DEFAULT_LSP_REQUEST_TIMEOUT_MS,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      reject(new Error(`LSP request timed out: ${method}`));
    }, timeoutMs);

    void connection
      .sendRequest(method, params)
      .then(
        (value) => {
          window.clearTimeout(timer);
          resolve(value as T);
        },
        (error: unknown) => {
          window.clearTimeout(timer);
          reject(error);
        },
      );
  });
}
