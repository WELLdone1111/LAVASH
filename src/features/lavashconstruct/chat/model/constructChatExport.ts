import { invoke, isTauri } from "@tauri-apps/api/core";
import { save } from "@tauri-apps/plugin-dialog";
import { downloadTextFile } from "@/features/file-menu/model/fileMenuWindowActions";
import { getTabModel } from "@/features/lavashconstruct/chat/model/constructChatSettings";
import { providerShortLabel, type ConstructChatProvider } from "@/features/lavashconstruct/chat/model/constructChatProviders";
import { stripWelcomeMessages } from "@/features/lavashconstruct/chat/model/constructChatWelcomeMessage";

export type ConstructChatExportMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  attachments?: readonly {
    kind: string;
    name?: string;
  }[];
};

export type ConstructChatExportTab = {
  title: string;
  tabIndex: number;
  provider: ConstructChatProvider;
  models: Partial<Record<ConstructChatProvider, string>>;
  messages: readonly ConstructChatExportMessage[];
};

export type ConstructChatExportLabels = {
  user: string;
  assistant: string;
  tab: string;
  provider: string;
  model: string;
  exported: string;
  attachments: string;
  heading: string;
};

function sanitizeExportFilename(title: string, tabIndex: number): string {
  const base = title.trim() || `chat-${tabIndex + 1}`;
  const safe = base
    .replace(/[^\w\u0400-\u04FF.-]+/gi, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
  const stamp = new Date().toISOString().slice(0, 10);
  return `lavash-${safe || "chat"}-${stamp}.md`;
}

function formatAttachmentLine(
  att: NonNullable<ConstructChatExportMessage["attachments"]>[number],
): string {
  if (att.kind === "text" || att.kind === "file") {
    return att.name?.trim() || att.kind;
  }
  if (att.kind === "image") return "image";
  return att.kind;
}

export function buildConstructChatExportMarkdown(
  tab: ConstructChatExportTab,
  labels: ConstructChatExportLabels,
): string {
  const modelId = getTabModel({ models: tab.models }, tab.provider);
  const providerLabel = providerShortLabel(tab.provider);
  const tabTitle = tab.title.trim() || `${labels.tab} ${tab.tabIndex + 1}`;
  const exportedAt = new Date().toISOString();
  const lines: string[] = [
    `# ${labels.heading}`,
    "",
    `- **${labels.tab}:** ${tabTitle}`,
    `- **${labels.provider}:** ${providerLabel}`,
    `- **${labels.model}:** ${modelId}`,
    `- **${labels.exported}:** ${exportedAt}`,
    "",
    "---",
    "",
  ];

  const messages = stripWelcomeMessages([...tab.messages]);
  for (const message of messages) {
    const roleLabel = message.role === "user" ? labels.user : labels.assistant;
    lines.push(`## ${roleLabel}`, "");
    if (message.attachments?.length) {
      const names = message.attachments.map(formatAttachmentLine).join(", ");
      lines.push(`*${labels.attachments}: ${names}*`, "");
    }
    lines.push(message.text.trim() || "—", "", "---", "");
  }

  return `${lines.join("\n").trim()}\n`;
}

export function canExportConstructChatTab(messages: readonly ConstructChatExportMessage[]): boolean {
  return stripWelcomeMessages([...messages]).some(
    (m) => m.text.trim().length > 0 || (m.attachments?.length ?? 0) > 0,
  );
}

export async function exportConstructChatTabToFile(
  tab: ConstructChatExportTab,
  labels: ConstructChatExportLabels,
  dialogTitle: string,
): Promise<boolean> {
  const contents = buildConstructChatExportMarkdown(tab, labels);
  const defaultPath = sanitizeExportFilename(tab.title, tab.tabIndex);

  if (isTauri()) {
    const path = await save({
      title: dialogTitle,
      defaultPath,
      filters: [
        { name: "Markdown", extensions: ["md"] },
        { name: "Text", extensions: ["txt"] },
      ],
    });
    if (!path) return false;
    await invoke("fs_write_text", { absolutePath: path, contents, scope: "user" });
    return true;
  }

  downloadTextFile(defaultPath, contents);
  return true;
}
