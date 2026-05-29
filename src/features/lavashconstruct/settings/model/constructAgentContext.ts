import { readWorkspaceFile } from "@/features/lavashconstruct/editor/model/lsp/workspaceApi";
import type { WorkspaceTreeNode } from "@/features/lavashconstruct/project/model/projectWorkspaceStore";
import { invoke, isTauri } from "@tauri-apps/api/core";
import {
  findAgentCommandByTrigger,
  getAllEnabledMemories,
  getAllEnabledRules,
  getAllEnabledSkills,
  readAgentImportSettings,
  readDiscoveredSkillEnabledMap,
  type AgentSkill,
} from "@/features/lavashconstruct/settings/model/constructAgentConfig";

const MAX_AGENT_BLOCK_CHARS = 12_000;
const MAX_FILE_CHARS = 6_000;
const MAX_SKILL_CHARS = 2_500;

function clip(text: string, max: number): string {
  const s = text.replace(/\r\n/g, "\n").trim();
  if (s.length <= max) return s;
  return `${s.slice(0, max)}\n… [truncated]`;
}

function parseSkillMeta(content: string, fallbackName: string): { name: string; description: string; body: string } {
  const trimmed = content.trim();
  const titleMatch = trimmed.match(/^#\s+(.+)$/m);
  const name = titleMatch?.[1]?.trim() || fallbackName;
  const descMatch = trimmed.match(/^>\s*(.+)$/m);
  const description = descMatch?.[1]?.trim() || "";
  return { name, description, body: trimmed };
}

function walkTree(nodes: readonly WorkspaceTreeNode[], visit: (node: WorkspaceTreeNode) => void): void {
  for (const node of nodes) {
    visit(node);
    if (node.children?.length) walkTree(node.children, visit);
  }
}

export async function scanDiscoveredAgentSkills(): Promise<AgentSkill[]> {
  if (!isTauri()) return [];
  const importSettings = readAgentImportSettings();
  if (!importSettings.agentsSkillsDir) return [];

  let tree: WorkspaceTreeNode[] = [];
  try {
    tree = await invoke<WorkspaceTreeNode[]>("workspace_list_tree");
  } catch {
    return [];
  }

  const skillPaths: string[] = [];
  walkTree(tree, (node) => {
    if (node.kind !== "file") return;
    const normalized = node.path.replace(/\\/g, "/");
    if (/^\.agents\/skills\/[^/]+\/SKILL\.md$/i.test(normalized)) {
      skillPaths.push(node.path);
    }
  });

  const enabledMap = readDiscoveredSkillEnabledMap();
  const out: AgentSkill[] = [];

  for (const relativePath of skillPaths) {
    const content = await readWorkspaceFile(relativePath);
    if (!content?.trim()) continue;
    const folderName = relativePath.replace(/\\/g, "/").split("/").slice(-2, -1)[0] ?? relativePath;
    const meta = parseSkillMeta(content, folderName);
    const id = `discovered:${relativePath.replace(/\\/g, "/")}`;
    out.push({
      id,
      name: meta.name,
      description: meta.description,
      content: meta.body,
      enabled: enabledMap[id] ?? true,
      scope: "project",
      discovered: true,
    });
  }

  return out;
}

async function readOptionalProjectFile(relativePath: string): Promise<string | null> {
  if (!isTauri()) return null;
  try {
    return await readWorkspaceFile(relativePath);
  } catch {
    return null;
  }
}

export async function buildAgentContextForModel(projectRoot: string | null): Promise<string> {
  const importSettings = readAgentImportSettings();
  const parts: string[] = ["[LAVASH agent context — follow these instructions alongside the construct snapshot]"];

  if (projectRoot && importSettings.agentsMd) {
    const agentsMd = await readOptionalProjectFile("AGENTS.md");
    if (agentsMd?.trim()) {
      parts.push("", "## AGENTS.md", clip(agentsMd, MAX_FILE_CHARS));
    }
  }

  if (projectRoot && importSettings.claudeMd) {
    const claudeMd = await readOptionalProjectFile("CLAUDE.md");
    if (claudeMd?.trim()) {
      parts.push("", "## CLAUDE.md", clip(claudeMd, MAX_FILE_CHARS));
    }
    const claudeLocal = await readOptionalProjectFile("CLAUDE.local.md");
    if (claudeLocal?.trim()) {
      parts.push("", "## CLAUDE.local.md", clip(claudeLocal, MAX_FILE_CHARS));
    }
  }

  const rules = getAllEnabledRules(projectRoot);
  if (rules.length > 0) {
    parts.push("", "## Rules");
    for (const rule of rules) {
      parts.push(`### ${rule.name}`, clip(rule.content, MAX_SKILL_CHARS));
    }
  }

  const discovered = projectRoot ? await scanDiscoveredAgentSkills() : [];
  const skills = getAllEnabledSkills(projectRoot, discovered);
  if (skills.length > 0) {
    parts.push("", "## Active skills");
    for (const skill of skills) {
      const lead = skill.description ? `${skill.name} — ${skill.description}` : skill.name;
      parts.push(`### ${lead}`, clip(skill.content, MAX_SKILL_CHARS));
    }
  }

  const memories = getAllEnabledMemories(projectRoot);
  if (memories.length > 0) {
    parts.push("", "## Memories");
    for (const memory of memories) {
      parts.push(`- ${clip(memory.content, 800)}`);
    }
  }

  let block = parts.join("\n").trim();
  if (block.length > MAX_AGENT_BLOCK_CHARS) {
    block = `${block.slice(0, MAX_AGENT_BLOCK_CHARS)}\n… [agent context truncated]`;
  }
  return block;
}

export function expandSlashCommandInDraft(text: string, projectRoot: string | null): string {
  const trimmed = text.trimStart();
  if (!trimmed.startsWith("/")) return text;

  const match = trimmed.match(/^\/([\w-]+)(?:\s+([\s\S]*))?$/);
  if (!match) return text;

  const command = findAgentCommandByTrigger(match[1], projectRoot);
  if (!command) return text;

  const rest = (match[2] ?? "").trim();
  const body = command.content.trim();
  if (!rest) return body;
  return `${body}\n\n${rest}`;
}
