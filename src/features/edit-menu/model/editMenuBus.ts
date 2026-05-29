export type EditMenuActionId = "undo" | "redo" | "cut" | "copy" | "paste";

export type EditMenuHandlers = {
  [K in EditMenuActionId]?: () => void | Promise<void>;
};

type EditMenuRegistry = {
  handlers: EditMenuHandlers;
  canPerform: Partial<Record<EditMenuActionId, () => boolean>>;
};

const registry: EditMenuRegistry = {
  handlers: {},
  canPerform: {},
};

export function registerEditMenuHandlers(
  handlers: EditMenuHandlers,
  canPerform: Partial<Record<EditMenuActionId, () => boolean>>,
): () => void {
  registry.handlers = { ...registry.handlers, ...handlers };
  registry.canPerform = { ...registry.canPerform, ...canPerform };
  return () => {
    for (const key of Object.keys(handlers) as EditMenuActionId[]) {
      delete registry.handlers[key];
      delete registry.canPerform[key];
    }
  };
}

export function runEditMenuAction(id: EditMenuActionId): void {
  const fn = registry.handlers[id];
  if (!fn) return;
  void Promise.resolve(fn()).catch((error) => {
    console.warn(`[edit-menu] ${id} failed`, error);
  });
}

export function isEditMenuActionEnabled(id: EditMenuActionId): boolean {
  const can = registry.canPerform[id];
  if (can) return can();
  return Boolean(registry.handlers[id]);
}
