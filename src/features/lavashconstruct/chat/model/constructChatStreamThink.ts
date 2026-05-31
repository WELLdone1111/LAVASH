const THINK_TAG = "think|thinking|redacted_thinking";

const THINK_COMPLETE = new RegExp(
  `<(?:${THINK_TAG})>([\\s\\S]*?)<\\/(?:${THINK_TAG})>`,
  "gi",
);

const THINK_OPEN = new RegExp(`<(?:${THINK_TAG})>([\\s\\S]*)$`, "i");

/** Витягнути reasoning з inline-тегів у content-стрімі (DeepSeek, Qwen, тощо). */
export function splitAssistantStreamThinkContent(raw: string): { thinking: string; content: string } {
  const thinkingParts: string[] = [];
  let content = raw;

  content = content.replace(THINK_COMPLETE, (_match, inner: string) => {
    const trimmed = String(inner ?? "").trim();
    if (trimmed) thinkingParts.push(trimmed);
    return "";
  });

  const openMatch = THINK_OPEN.exec(content);
  if (openMatch) {
    content = content.slice(0, openMatch.index);
    const partial = openMatch[1]?.trim() ?? "";
    if (partial) thinkingParts.push(partial);
  }

  return {
    thinking: thinkingParts.join("\n\n").trim(),
    content: content.trim(),
  };
}

/** Native reasoning channel + inline think-теги в content. */
export function mergeStreamThinkingParts(
  nativeThinking: string,
  rawContent: string,
): { thinking: string; content: string } {
  const fromTags = splitAssistantStreamThinkContent(rawContent);
  const thinking = [nativeThinking.trim(), fromTags.thinking.trim()].filter(Boolean).join("\n\n");
  return { thinking, content: fromTags.content };
}

export function thinkingPreviewLine(thinking: string, maxLen = 56): string {
  const line = thinking.replace(/\s+/g, " ").trim();
  if (line.length <= maxLen) return line;
  return `${line.slice(0, maxLen - 1)}…`;
}
