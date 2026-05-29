import type { Environment } from "monaco-editor/esm/vs/editor/editor.api";

declare global {
  interface Window {
    MonacoEnvironment?: Environment;
  }

  // eslint-disable-next-line no-var
  var MonacoEnvironment: Environment | undefined;
}

export {};
