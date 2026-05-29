export type FileMenuActionId =
  | "newTextFile"
  | "newLavashDocument"
  | "newWindow"
  | "newAgentsWindow"
  | "openFile"
  | "openLavashDocument"
  | "openFolder"
  | "import"
  | "export"
  | "save"
  | "saveAs";

export type FileMenuHandlers = {
  [K in FileMenuActionId]?: () => void | Promise<void>;
};

const registry: FileMenuHandlers = {};

export function registerFileMenuHandlers(handlers: FileMenuHandlers): () => void {
  Object.assign(registry, handlers);
  return () => {
    for (const key of Object.keys(handlers) as FileMenuActionId[]) {
      delete registry[key];
    }
  };
}

export function runFileMenuAction(id: FileMenuActionId): void {
  const fn = registry[id];
  if (!fn) return;
  void Promise.resolve(fn()).catch((error) => {
    console.warn(`[file-menu] ${id} failed`, error);
  });
}

export function isFileMenuActionEnabled(id: FileMenuActionId): boolean {
  return Boolean(registry[id]);
}

export const FILE_MENU_NEW_CHAT_EVENT = "lavash:file-menu:new-chat-tab";

export function dispatchNewChatTabRequest(): void {
  window.dispatchEvent(new CustomEvent(FILE_MENU_NEW_CHAT_EVENT));
}
