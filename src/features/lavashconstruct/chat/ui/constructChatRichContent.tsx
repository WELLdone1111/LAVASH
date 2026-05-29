import { createElement, Fragment, useCallback, useMemo, useState, type MouseEvent, type ReactNode } from "react";
import { Check, Copy } from "lucide-react";
import { openExternalUrl } from "@/lib/openExternalUrl";
import { useI18n } from "@/i18n/context";

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function openExternalLink(href: string): Promise<void> {
  try {
    await openExternalUrl(href);
  } catch {
    /* ignore */
  }
}

function plainWithBreaks(s: string, keyPrefix: string): ReactNode {
  const lines = s.split("\n");
  if (lines.length === 1) return escapeHtml(lines[0]);
  return lines.map((line, idx) => (
    <Fragment key={`${keyPrefix}-${idx}`}>
      {idx > 0 ? <br /> : null}
      {escapeHtml(line)}
    </Fragment>
  ));
}

function parseInline(s: string, keyBase: string): ReactNode[] {
  const out: ReactNode[] = [];
  let i = 0;
  let n = 0;
  while (i < s.length) {
    const rest = s.slice(i);
    const linkM = /^\[([^\]]+)\]\(([^)\s]+)\)/.exec(rest);
    if (linkM) {
      const href = linkM[2];
      const label = linkM[1];
      const isHttp = href.startsWith("http://") || href.startsWith("https://");
      out.push(
        <a
          key={`${keyBase}-l${n++}`}
          href={href}
          className="lc-chat-md__a"
          {...(isHttp
            ? {
                onClick: (e: MouseEvent<HTMLAnchorElement>) => {
                  e.preventDefault();
                  void openExternalLink(href);
                },
              }
            : {})}
          rel="noreferrer"
        >
          {escapeHtml(label)}
        </a>,
      );
      i += linkM[0].length;
      continue;
    }
    if (rest.startsWith("**")) {
      const end = s.indexOf("**", i + 2);
      if (end !== -1) {
        out.push(
          <strong key={`${keyBase}-s${n++}`}>{plainWithBreaks(s.slice(i + 2, end), `${keyBase}-sb${n}`)}</strong>,
        );
        i = end + 2;
        continue;
      }
    }
    if (rest.startsWith("__")) {
      const end = s.indexOf("__", i + 2);
      if (end !== -1) {
        out.push(
          <strong key={`${keyBase}-u${n++}`}>{plainWithBreaks(s.slice(i + 2, end), `${keyBase}-ub${n}`)}</strong>,
        );
        i = end + 2;
        continue;
      }
    }
    if (rest.startsWith("*") && rest[1] !== "*") {
      const end = s.indexOf("*", i + 1);
      if (end !== -1 && s[end + 1] !== "*") {
        out.push(<em key={`${keyBase}-e${n++}`}>{plainWithBreaks(s.slice(i + 1, end), `${keyBase}-eb${n}`)}</em>);
        i = end + 1;
        continue;
      }
    }
    if (rest.startsWith("_") && rest[1] !== "_") {
      const end = s.indexOf("_", i + 1);
      if (end !== -1 && s[end + 1] !== "_") {
        out.push(<em key={`${keyBase}-em${n++}`}>{plainWithBreaks(s.slice(i + 1, end), `${keyBase}-emb${n}`)}</em>);
        i = end + 1;
        continue;
      }
    }
    if (rest.startsWith("`")) {
      const end = s.indexOf("`", i + 1);
      if (end !== -1) {
        out.push(
          <code key={`${keyBase}-c${n++}`} className="lc-chat-md__icode">
            {escapeHtml(s.slice(i + 1, end))}
          </code>,
        );
        i = end + 1;
        continue;
      }
    }
    let j = i + 1;
    while (j < s.length) {
      const r = s.slice(j);
      if (
        r.startsWith("**") ||
        r.startsWith("__") ||
        r.startsWith("`") ||
        /^\[[^\]]+\]\([^)]+\)/.test(r) ||
        (r.startsWith("*") && r[1] !== "*") ||
        (r.startsWith("_") && r[1] !== "_")
      ) {
        break;
      }
      j++;
    }
    if (j > i) {
      out.push(<span key={`${keyBase}-t${n++}`}>{plainWithBreaks(s.slice(i, j), `${keyBase}-tb${n}`)}</span>);
    }
    i = Math.max(j, i + 1);
  }
  return out;
}

type FenceSeg = { kind: "text"; body: string } | { kind: "code"; lang: string; body: string };

function splitFences(src: string): FenceSeg[] {
  const out: FenceSeg[] = [];
  let i = 0;
  while (i < src.length) {
    const start = src.indexOf("```", i);
    if (start === -1) {
      out.push({ kind: "text", body: src.slice(i) });
      break;
    }
    if (start > i) out.push({ kind: "text", body: src.slice(i, start) });
    let j = start + 3;
    const lineEnd = src.indexOf("\n", j);
    let lang = "";
    let bodyStart: number;
    if (lineEnd === -1) {
      bodyStart = j;
    } else {
      lang = src.slice(j, lineEnd).trim();
      bodyStart = lineEnd + 1;
    }
    const close = src.indexOf("```", bodyStart);
    if (close === -1) {
      out.push({ kind: "text", body: src.slice(start) });
      break;
    }
    let body = src.slice(bodyStart, close);
    if (body.endsWith("\n")) body = body.slice(0, -1);
    out.push({ kind: "code", lang, body });
    i = close + 3;
    if (src[i] === "\n" || (src[i] === "\r" && src[i + 1] === "\n")) {
      if (src[i] === "\r") i += 2;
      else i += 1;
    }
  }
  return out;
}

function CodeBlock({ lang, code }: { lang: string; code: string }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const onCopy = useCallback(() => {
    void navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    });
  }, [code]);
  return (
    <div className="lc-chat-md__code-block">
      <div className="lc-chat-md__code-toolbar">
        <span className="lc-chat-md__code-lang">{lang ? escapeHtml(lang) : "\u00a0"}</span>
        <button type="button" className="lc-chat-md__code-copy" onClick={onCopy} aria-label={t("construct.chat.copyCodeMd")}>
          {copied ? <Check size={14} strokeWidth={2.5} /> : <Copy size={14} strokeWidth={2} />}
        </button>
      </div>
      <pre className="lc-chat-md__pre">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function renderTextBlocks(body: string, keyPrefix: string): ReactNode[] {
  const lines = body.replace(/\r\n/g, "\n").split("\n");
  const nodes: ReactNode[] = [];
  let i = 0;
  let blockIdx = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
      continue;
    }
    if (/^(-{3,}|\*{3,}|_{3,})\s*$/.test(line.trim())) {
      nodes.push(<hr key={`${keyPrefix}-hr-${blockIdx++}`} className="lc-chat-md__hr" />);
      i++;
      continue;
    }
    const hm = /^(#{1,6})\s+(.*)$/.exec(line);
    if (hm) {
      const level = Math.min(hm[1].length, 6) as 1 | 2 | 3 | 4 | 5 | 6;
      const cls = `lc-chat-md__h lc-chat-md__h--${level}`;
      const tag = `h${level}` as "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
      nodes.push(
        createElement(
          tag,
          { key: `${keyPrefix}-h-${blockIdx++}`, className: cls },
          parseInline(hm[2], `${keyPrefix}-hi-${i}`),
        ),
      );
      i++;
      continue;
    }
    if (/^>\s?/.test(line)) {
      const qs: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i]!)) {
        qs.push(lines[i]!.replace(/^>\s?/, ""));
        i++;
      }
      nodes.push(
        <blockquote key={`${keyPrefix}-q-${blockIdx++}`} className="lc-chat-md__quote">
          {qs.map((q, qi) => (
            <p key={qi} className="lc-chat-md__quote-p">
              {parseInline(q, `${keyPrefix}-qi-${qi}`)}
            </p>
          ))}
        </blockquote>,
      );
      continue;
    }
    if (/^[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i]!)) {
        items.push(lines[i]!.replace(/^[-*]\s+/, ""));
        i++;
      }
      nodes.push(
        <ul key={`${keyPrefix}-ul-${blockIdx++}`} className="lc-chat-md__ul">
          {items.map((it, ii) => (
            <li key={ii} className="lc-chat-md__li">
              {parseInline(it, `${keyPrefix}-uli-${ii}`)}
            </li>
          ))}
        </ul>,
      );
      continue;
    }
    if (/^\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i]!)) {
        items.push(lines[i]!.replace(/^\d+\.\s+/, ""));
        i++;
      }
      nodes.push(
        <ol key={`${keyPrefix}-ol-${blockIdx++}`} className="lc-chat-md__ol">
          {items.map((it, ii) => (
            <li key={ii} className="lc-chat-md__li">
              {parseInline(it, `${keyPrefix}-oli-${ii}`)}
            </li>
          ))}
        </ol>,
      );
      continue;
    }
    const para: string[] = [line];
    i++;
    while (i < lines.length && lines[i]!.trim() !== "") {
      para.push(lines[i]!);
      i++;
    }
    const merged = para.join("\n");
    nodes.push(
      <p key={`${keyPrefix}-p-${blockIdx++}`} className="lc-chat-md__p">
        {parseInline(merged, `${keyPrefix}-pi-${blockIdx}`)}
      </p>,
    );
  }
  return nodes;
}

export function ConstructChatRichContent({ text, className }: { text: string; className?: string }) {
  const segments = useMemo(() => splitFences(text), [text]);
  const children: ReactNode[] = [];
  let segIdx = 0;
  for (const seg of segments) {
    if (seg.kind === "code") {
      children.push(<CodeBlock key={`f-${segIdx}`} lang={seg.lang} code={seg.body} />);
    } else if (seg.body.trim()) {
      children.push(
        <div key={`t-${segIdx}`} className="lc-chat-md__blocks">
          {renderTextBlocks(seg.body, `seg-${segIdx}`)}
        </div>,
      );
    }
    segIdx++;
  }
  return <div className={className ?? "lc-chat-md"}>{children}</div>;
}
