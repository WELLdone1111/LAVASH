type TranslateFn = (key: string, vars?: Record<string, string | number>) => string;

function extractOllamaErrorMessage(raw: string): string | null {
  const trimmed = raw.trim();
  const jsonStart = trimmed.indexOf("{");
  if (jsonStart >= 0) {
    const slice = trimmed.slice(jsonStart);
    try {
      const parsed = JSON.parse(slice) as { error?: unknown };
      if (typeof parsed.error === "string" && parsed.error.trim()) {
        return parsed.error.trim();
      }
    } catch {
      /* not JSON */
    }
  }
  const withoutHttp = trimmed.replace(/^Ollama (?:chat )?HTTP \d+[^:]*:\s*/i, "");
  if (withoutHttp !== trimmed) return withoutHttp.trim() || null;
  return trimmed || null;
}

function mapOllamaMessage(message: string, t: TranslateFn): string {
  const mem = message.match(
    /model requires more system memory \(([^)]+)\) than is available \(([^)]+)\)/i,
  );
  if (mem) {
    return t("construct.chat.error.ollamaMemory", {
      required: mem[1] ?? "",
      available: mem[2] ?? "",
    });
  }

  const notFound =
    message.match(/model\s+["']([^"']+)["']\s+not found/i) ??
    message.match(/model\s+(\S+)\s+not found/i);
  if (notFound?.[1]) {
    return t("construct.chat.error.ollamaModelNotFound", { model: notFound[1] });
  }

  if (/connection refused|failed to connect|error sending request|timed out/i.test(message)) {
    return t("construct.chat.error.ollamaUnreachable");
  }

  if (/pull the model|try pulling/i.test(message)) {
    return t("construct.chat.error.ollamaPullRequired");
  }

  return message;
}

/** Перетворює технічну помилку invoke/stream у текст для бульбашки чату. */
export function formatConstructChatErrorDetail(raw: string, t: TranslateFn): string {
  const message = extractOllamaErrorMessage(raw);
  if (!message) return t("construct.chat.error.unknown");

  if (/^Ollama request failed:/i.test(message)) {
    const inner = message.replace(/^Ollama request failed:\s*/i, "");
    if (/connection refused|failed to connect|error sending request/i.test(inner)) {
      return t("construct.chat.error.ollamaUnreachable");
    }
  }

  if (/requires more system memory|not found|pull the model/i.test(message)) {
    return mapOllamaMessage(message, t);
  }

  if (/Streaming requires LAVASH desktop/i.test(message)) {
    return t("construct.chat.error.desktopRequired");
  }

  return mapOllamaMessage(message, t);
}
