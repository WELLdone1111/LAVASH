export type AgentScope = "global" | "project";

export type AgentImportSettings = {
  agentsSkillsDir: boolean;
  agentsMd: boolean;
  claudeMd: boolean;
};

export type AgentSkill = {
  id: string;
  name: string;
  description: string;
  content: string;
  enabled: boolean;
  scope: AgentScope;
  /** Discovered from `.agents/skills` — not editable inline. */
  discovered?: boolean;
};

export type AgentCommand = {
  id: string;
  name: string;
  trigger: string;
  description: string;
  content: string;
  enabled: boolean;
  scope: AgentScope;
};

export type AgentRule = {
  id: string;
  name: string;
  content: string;
  enabled: boolean;
  scope: AgentScope;
};

export type AgentMemory = {
  id: string;
  content: string;
  enabled: boolean;
  scope: AgentScope;
};

export const AGENT_IMPORT_SETTINGS_KEY = "lavash.construct.agent.import.v1";
export const AGENT_MEMORIES_ENABLED_KEY = "lavash.construct.agent.memoriesEnabled.v1";
export const AGENT_CONFIG_CHANGED_EVENT = "lavash:construct-agent-config-changed";

const GLOBAL_KEYS = {
  skills: "lavash.construct.agent.skills.global.v1",
  commands: "lavash.construct.agent.commands.global.v1",
  rules: "lavash.construct.agent.rules.global.v1",
  memories: "lavash.construct.agent.memories.global.v1",
  discoveredSkillEnabled: "lavash.construct.agent.discoveredSkills.enabled.v1",
} as const;

function hashProjectRoot(root: string): string {
  let h = 0;
  for (let i = 0; i < root.length; i += 1) {
    h = (h * 31 + root.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(36);
}

function projectKey(base: string, projectRoot: string | null): string {
  if (!projectRoot?.trim()) return `${base}.orphan`;
  return `${base}.project.${hashProjectRoot(projectRoot.trim())}`;
}

function scopeStorageKey(
  kind: "skills" | "commands" | "rules" | "memories",
  scope: AgentScope,
  projectRoot: string | null,
): string {
  if (scope === "global") return GLOBAL_KEYS[kind];
  return projectKey(`lavash.construct.agent.${kind}`, projectRoot);
}

function safeReadJson<T>(key: string, fallback: T): T {
  if (typeof localStorage === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function safeWriteJson(key: string, value: unknown): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

export function dispatchAgentConfigChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(AGENT_CONFIG_CHANGED_EVENT));
}

export function readAgentImportSettings(): AgentImportSettings {
  const stored = safeReadJson<Partial<AgentImportSettings>>(AGENT_IMPORT_SETTINGS_KEY, {});
  return {
    agentsSkillsDir: stored.agentsSkillsDir ?? true,
    agentsMd: stored.agentsMd ?? true,
    claudeMd: stored.claudeMd ?? false,
  };
}

export function writeAgentImportSettings(next: AgentImportSettings): void {
  safeWriteJson(AGENT_IMPORT_SETTINGS_KEY, next);
  dispatchAgentConfigChanged();
}

export function readMemoriesFeatureEnabled(): boolean {
  if (typeof localStorage === "undefined") return true;
  try {
    const raw = localStorage.getItem(AGENT_MEMORIES_ENABLED_KEY);
    if (raw === null) return true;
    return raw === "1";
  } catch {
    return true;
  }
}

export function writeMemoriesFeatureEnabled(enabled: boolean): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(AGENT_MEMORIES_ENABLED_KEY, enabled ? "1" : "0");
  } catch {
    /* ignore */
  }
  dispatchAgentConfigChanged();
}

function readScopedList<T>(kind: "skills" | "commands" | "rules" | "memories", scope: AgentScope, projectRoot: string | null): T[] {
  const key = scopeStorageKey(kind, scope, projectRoot);
  const list = safeReadJson<unknown[]>(key, []);
  return Array.isArray(list) ? (list as T[]) : [];
}

function writeScopedList<T>(
  kind: "skills" | "commands" | "rules" | "memories",
  scope: AgentScope,
  projectRoot: string | null,
  list: T[],
): void {
  safeWriteJson(scopeStorageKey(kind, scope, projectRoot), list);
  dispatchAgentConfigChanged();
}

export function readAgentSkills(scope: AgentScope, projectRoot: string | null): AgentSkill[] {
  return readScopedList<AgentSkill>("skills", scope, projectRoot).filter((s) => s?.id && s.name);
}

export function readAgentCommands(scope: AgentScope, projectRoot: string | null): AgentCommand[] {
  return readScopedList<AgentCommand>("commands", scope, projectRoot).filter((c) => c?.id && c.name);
}

export function readAgentRules(scope: AgentScope, projectRoot: string | null): AgentRule[] {
  return readScopedList<AgentRule>("rules", scope, projectRoot).filter((r) => r?.id && r.name);
}

export function readAgentMemories(scope: AgentScope, projectRoot: string | null): AgentMemory[] {
  return readScopedList<AgentMemory>("memories", scope, projectRoot).filter((m) => m?.id && m.content);
}

export function readDiscoveredSkillEnabledMap(): Record<string, boolean> {
  return safeReadJson<Record<string, boolean>>(GLOBAL_KEYS.discoveredSkillEnabled, {});
}

export function setDiscoveredSkillEnabled(skillId: string, enabled: boolean): void {
  const map = readDiscoveredSkillEnabledMap();
  map[skillId] = enabled;
  safeWriteJson(GLOBAL_KEYS.discoveredSkillEnabled, map);
  dispatchAgentConfigChanged();
}


export function addAgentSkill(
  scope: AgentScope,
  projectRoot: string | null,
  input: { name: string; description?: string; content: string },
): AgentSkill {
  const skill: AgentSkill = {
    id: `skill-${crypto.randomUUID().slice(0, 10)}`,
    name: input.name.trim(),
    description: input.description?.trim() || "",
    content: input.content.trim(),
    enabled: true,
    scope,
  };
  const list = readAgentSkills(scope, projectRoot);
  writeScopedList("skills", scope, projectRoot, [...list, skill]);
  return skill;
}

export function updateAgentSkill(
  scope: AgentScope,
  projectRoot: string | null,
  id: string,
  patch: Partial<Pick<AgentSkill, "name" | "description" | "content" | "enabled">>,
): void {
  const list = readAgentSkills(scope, projectRoot).map((s) =>
    s.id === id ? { ...s, ...patch, name: patch.name?.trim() ?? s.name, content: patch.content?.trim() ?? s.content } : s,
  );
  writeScopedList("skills", scope, projectRoot, list);
}

export function removeAgentSkill(scope: AgentScope, projectRoot: string | null, id: string): void {
  writeScopedList(
    "skills",
    scope,
    projectRoot,
    readAgentSkills(scope, projectRoot).filter((s) => s.id !== id),
  );
}

export function addAgentCommand(
  scope: AgentScope,
  projectRoot: string | null,
  input: { name: string; trigger: string; description?: string; content: string },
): AgentCommand {
  const command: AgentCommand = {
    id: `cmd-${crypto.randomUUID().slice(0, 10)}`,
    name: input.name.trim(),
    trigger: normalizeCommandTrigger(input.trigger),
    description: input.description?.trim() || "",
    content: input.content.trim(),
    enabled: true,
    scope,
  };
  writeScopedList("commands", scope, projectRoot, [...readAgentCommands(scope, projectRoot), command]);
  return command;
}

export function updateAgentCommand(
  scope: AgentScope,
  projectRoot: string | null,
  id: string,
  patch: Partial<Pick<AgentCommand, "name" | "trigger" | "description" | "content" | "enabled">>,
): void {
  const list = readAgentCommands(scope, projectRoot).map((c) =>
    c.id === id
      ? {
          ...c,
          ...patch,
          name: patch.name?.trim() ?? c.name,
          trigger: patch.trigger ? normalizeCommandTrigger(patch.trigger) : c.trigger,
          content: patch.content?.trim() ?? c.content,
        }
      : c,
  );
  writeScopedList("commands", scope, projectRoot, list);
}

export function removeAgentCommand(scope: AgentScope, projectRoot: string | null, id: string): void {
  writeScopedList(
    "commands",
    scope,
    projectRoot,
    readAgentCommands(scope, projectRoot).filter((c) => c.id !== id),
  );
}

export function addAgentRule(
  scope: AgentScope,
  projectRoot: string | null,
  input: { name: string; content: string },
): AgentRule {
  const rule: AgentRule = {
    id: `rule-${crypto.randomUUID().slice(0, 10)}`,
    name: input.name.trim(),
    content: input.content.trim(),
    enabled: true,
    scope,
  };
  writeScopedList("rules", scope, projectRoot, [...readAgentRules(scope, projectRoot), rule]);
  return rule;
}

export function updateAgentRule(
  scope: AgentScope,
  projectRoot: string | null,
  id: string,
  patch: Partial<Pick<AgentRule, "name" | "content" | "enabled">>,
): void {
  const list = readAgentRules(scope, projectRoot).map((r) =>
    r.id === id ? { ...r, ...patch, name: patch.name?.trim() ?? r.name, content: patch.content?.trim() ?? r.content } : r,
  );
  writeScopedList("rules", scope, projectRoot, list);
}

export function removeAgentRule(scope: AgentScope, projectRoot: string | null, id: string): void {
  writeScopedList(
    "rules",
    scope,
    projectRoot,
    readAgentRules(scope, projectRoot).filter((r) => r.id !== id),
  );
}

export function addAgentMemory(scope: AgentScope, projectRoot: string | null, content: string): AgentMemory {
  const memory: AgentMemory = {
    id: `mem-${crypto.randomUUID().slice(0, 10)}`,
    content: content.trim(),
    enabled: true,
    scope,
  };
  writeScopedList("memories", scope, projectRoot, [...readAgentMemories(scope, projectRoot), memory]);
  return memory;
}

export function updateAgentMemory(
  scope: AgentScope,
  projectRoot: string | null,
  id: string,
  patch: Partial<Pick<AgentMemory, "content" | "enabled">>,
): void {
  const list = readAgentMemories(scope, projectRoot).map((m) =>
    m.id === id ? { ...m, ...patch, content: patch.content?.trim() ?? m.content } : m,
  );
  writeScopedList("memories", scope, projectRoot, list);
}

export function removeAgentMemory(scope: AgentScope, projectRoot: string | null, id: string): void {
  writeScopedList(
    "memories",
    scope,
    projectRoot,
    readAgentMemories(scope, projectRoot).filter((m) => m.id !== id),
  );
}

export function normalizeCommandTrigger(raw: string): string {
  return raw.trim().replace(/^\//, "").toLowerCase();
}

export function getAllEnabledRules(projectRoot: string | null): AgentRule[] {
  return [...readAgentRules("global", null), ...(projectRoot ? readAgentRules("project", projectRoot) : [])].filter(
    (r) => r.enabled,
  );
}

export function getAllEnabledSkills(projectRoot: string | null, discovered: AgentSkill[]): AgentSkill[] {
  const user = [
    ...readAgentSkills("global", null),
    ...(projectRoot ? readAgentSkills("project", projectRoot) : []),
  ].filter((s) => s.enabled && !s.discovered);
  const enabledDiscovered = discovered.filter((s) => s.enabled);
  return [...user, ...enabledDiscovered];
}

export function getAllEnabledMemories(projectRoot: string | null): AgentMemory[] {
  if (!readMemoriesFeatureEnabled()) return [];
  return [
    ...readAgentMemories("global", null),
    ...(projectRoot ? readAgentMemories("project", projectRoot) : []),
  ].filter((m) => m.enabled);
}

export function findAgentCommandByTrigger(
  trigger: string,
  projectRoot: string | null,
): AgentCommand | undefined {
  const normalized = normalizeCommandTrigger(trigger);
  const all = [
    ...(projectRoot ? readAgentCommands("project", projectRoot) : []),
    ...readAgentCommands("global", null),
  ];
  return all.find((c) => c.enabled && c.trigger === normalized);
}
