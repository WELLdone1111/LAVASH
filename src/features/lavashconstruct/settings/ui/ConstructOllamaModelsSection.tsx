import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { invoke, isTauri } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { Trash2 } from "lucide-react";
import { useI18n } from "@/i18n/context";
import { cn } from "@/lib/utils";
import { OLLAMA_SUGGESTED_MODELS } from "@/features/lavashconstruct/settings/model/ollamaSuggestedModels";
import {
  computeLoadTier,
  formatBillions,
  formatOllamaDiskGbLabel,
  modelBillionsFromTag,
  readHardwareSnapshot,
  type OllamaLoadTier,
  type OllamaLocalModelRow,
} from "@/features/settings/model/ollamaLoadHint";

type PullFinishedPayload = { model: string; ok: boolean; error?: string };
type PullLogPayload = { model: string; line: string };
type PullStartedPayload = { model: string };
type RmFinishedPayload = { model: string; ok: boolean; error?: string };

type StatusTone = "ok" | "neutral" | null;

type ConstructOllamaModelsSectionProps = {
  onInstalledChange?: (names: string[]) => void;
};

function formatInvokeErr(e: unknown): string {
  if (typeof e === "string") return e;
  if (e instanceof Error) return e.message;
  return String(e);
}

function chipTooltip(
  t: (key: string, vars?: Record<string, string | number>) => string,
  tier: OllamaLoadTier,
  ramGb: number,
  cpuThreads: number,
  ramUnknown: boolean,
  name: string,
  weight: string,
  sizeHint: { kind: "measured" | "approx"; label: string } | null,
): string {
  const tierKey = `settings.ollama.chipHintTier${tier}` as const;
  let body = t(tierKey, { name, weight, ramGb: Math.round(ramGb), cpu: cpuThreads });
  if (ramUnknown) {
    body += `\n\n${t("settings.ollama.chipHintRamUnknown", { assumeGb: 16 })}`;
  }
  if (sizeHint) {
    const hintKey =
      sizeHint.kind === "measured" ? "settings.ollama.chipHintDisk" : "settings.ollama.chipHintApproxDownload";
    body += `\n\n${t(hintKey, { size: sizeHint.label })}`;
  }
  return body;
}

function formatApproxGbLabel(
  approxGb: number,
  t: (key: string, vars?: Record<string, string | number>) => string,
): string {
  const gb =
    approxGb >= 10 ? approxGb.toFixed(0) : approxGb >= 1 ? approxGb.toFixed(1) : approxGb.toFixed(2);
  return t("settings.ollama.approxDiskGb", { gb });
}

function isSuggestedTagInstalled(localName: string, suggestedTag: string): boolean {
  const n = localName.trim().toLowerCase();
  const tag = suggestedTag.trim().toLowerCase();
  if (!n || !tag) return false;
  if (n === tag) return true;
  if (n.startsWith(`${tag}:`)) return true;
  return false;
}

export default function ConstructOllamaModelsSection({ onInstalledChange }: ConstructOllamaModelsSectionProps) {
  const { t } = useI18n();
  const [tag, setTag] = useState("");
  const [busy, setBusy] = useState(false);
  const activeModelRef = useRef<string | null>(null);
  const [logLines, setLogLines] = useState<string[]>([]);
  const [statusLine, setStatusLine] = useState<string | null>(null);
  const [statusTone, setStatusTone] = useState<StatusTone>(null);
  const logRef = useRef<HTMLPreElement | null>(null);
  const [installedRows, setInstalledRows] = useState<OllamaLocalModelRow[]>([]);
  const [installedListError, setInstalledListError] = useState<string | null>(null);
  const [deletingModel, setDeletingModel] = useState<string | null>(null);

  const hardware = useMemo(() => readHardwareSnapshot(), []);
  const installedNames = useMemo(() => installedRows.map((r) => r.name), [installedRows]);

  const refreshInstalledModels = useCallback(async () => {
    if (!isTauri()) return;
    try {
      const list = await invoke<OllamaLocalModelRow[]>("ollama_list_local_models");
      const rows = Array.isArray(list) ? list : [];
      setInstalledRows(rows);
      setInstalledListError(null);
      onInstalledChange?.(rows.map((r) => r.name));
    } catch (err) {
      setInstalledRows([]);
      setInstalledListError(formatInvokeErr(err));
      onInstalledChange?.([]);
    }
  }, [onInstalledChange]);

  useEffect(() => {
    void refreshInstalledModels();
  }, [refreshInstalledModels]);

  useEffect(() => {
    if (!isTauri()) return;
    const unlisten: UnlistenFn[] = [];

    void listen<PullStartedPayload>("ollama-model-pull-started", (e) => {
      activeModelRef.current = e.payload.model;
      setLogLines([]);
      setStatusLine(t("settings.ollama.pulling", { model: e.payload.model }));
      setStatusTone("neutral");
      setBusy(true);
    }).then((u) => unlisten.push(u));

    void listen<PullLogPayload>("ollama-model-pull-log", (e) => {
      const current = activeModelRef.current;
      if (current !== null && e.payload.model !== current) return;
      setLogLines((prev) => [...prev, e.payload.line].slice(-80));
    }).then((u) => unlisten.push(u));

    void listen<PullFinishedPayload>("ollama-model-pull-finished", (e) => {
      activeModelRef.current = null;
      setBusy(false);
      if (e.payload.ok) {
        setStatusLine(t("settings.ollama.done", { model: e.payload.model }));
        setStatusTone("ok");
        void refreshInstalledModels();
      } else {
        setStatusLine(e.payload.error ?? t("settings.ollama.error", { model: e.payload.model }));
        setStatusTone("neutral");
      }
    }).then((u) => unlisten.push(u));

    void listen<{ model: string }>("ollama-model-rm-started", (e) => {
      setDeletingModel(e.payload.model);
    }).then((u) => unlisten.push(u));

    void listen<RmFinishedPayload>("ollama-model-rm-finished", (e) => {
      setDeletingModel(null);
      if (e.payload.ok) {
        setStatusLine(t("settings.ollama.deleted", { model: e.payload.model }));
        setStatusTone("ok");
        void refreshInstalledModels();
      } else {
        setStatusLine(e.payload.error ?? t("settings.ollama.deleteError", { model: e.payload.model }));
        setStatusTone("neutral");
      }
    }).then((u) => unlisten.push(u));

    return () => {
      for (const u of unlisten) void u();
    };
  }, [t, refreshInstalledModels]);

  useEffect(() => {
    const el = logRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [logLines]);

  const startPull = useCallback(
    async (modelTag: string) => {
      const trimmed = modelTag.trim();
      if (!trimmed || busy) return;
      if (!isTauri()) {
        setStatusLine(t("settings.ollama.desktopRequired"));
        setStatusTone("neutral");
        return;
      }
      setBusy(true);
      setStatusLine(null);
      setStatusTone(null);
      setLogLines([]);
      try {
        await invoke("ollama_pull_model", { model: trimmed });
      } catch (err) {
        setStatusLine(err instanceof Error ? err.message : String(err));
        setStatusTone("neutral");
        setBusy(false);
      }
    },
    [busy, t],
  );

  const removeModel = useCallback(
    async (modelName: string) => {
      const trimmed = modelName.trim();
      if (!trimmed || busy || deletingModel) return;
      if (!window.confirm(t("settings.ollama.deleteConfirm", { model: trimmed }))) return;
      if (!isTauri()) {
        setStatusLine(t("settings.ollama.desktopRequired"));
        setStatusTone("neutral");
        return;
      }
      setStatusLine(null);
      setStatusTone(null);
      try {
        await invoke("ollama_rm_model", { model: trimmed });
      } catch (err) {
        setDeletingModel(null);
        setStatusLine(formatInvokeErr(err));
        setStatusTone("neutral");
      }
    },
    [busy, deletingModel, t],
  );

  if (!isTauri()) {
    return (
      <section className="lc-model-ollama" aria-labelledby="lc-model-ollama-heading">
        <h3 id="lc-model-ollama-heading" className="lc-model-ollama__title">
          {t("settings.ollama.title")}
        </h3>
        <p className="lc-model-ollama__hint">{t("settings.ollama.browserOnly")}</p>
      </section>
    );
  }

  return (
    <section className="lc-model-ollama" aria-labelledby="lc-model-ollama-heading">
      <h3 id="lc-model-ollama-heading" className="lc-model-ollama__title">
        {t("settings.ollama.title")}
      </h3>
      <p className="lc-model-ollama__lead">{t("construct.model.ollamaLead")}</p>

      <div className="lc-model-ollama__chips" role="group" aria-label={t("settings.ollama.chipsAria")}>
        {OLLAMA_SUGGESTED_MODELS.map((s) => {
          const billions = modelBillionsFromTag(s.tag);
          const weightLabel = formatBillions(billions);
          const tier = computeLoadTier(hardware, billions);
          const ramForHint = hardware.ramGb ?? 16;
          const installedMatch = installedRows.find((r) => isSuggestedTagInstalled(r.name, s.tag));
          const measuredDisk = installedMatch ? formatOllamaDiskGbLabel(installedMatch.sizeBytes, t) : null;
          const approxLabel = formatApproxGbLabel(s.approxDownloadGb, t);
          const diskLabel = measuredDisk ?? approxLabel;
          const sizeHint: { kind: "measured" | "approx"; label: string } | null = measuredDisk
            ? { kind: "measured", label: measuredDisk }
            : { kind: "approx", label: approxLabel };
          const title = chipTooltip(
            t,
            tier,
            ramForHint,
            hardware.cpuThreads,
            hardware.ramUnknown,
            s.shortName,
            weightLabel,
            sizeHint,
          );
          const dotAria = t(`settings.ollama.dotAriaTier${tier}` as const);
          const isInstalled = installedNames.some((n) => isSuggestedTagInstalled(n, s.tag));
          return (
            <div key={s.tag} className="lc-model-ollama__model-card">
              <div className="lc-model-ollama__model-card__header">
                {isInstalled ? (
                  <span className="lc-model-ollama__installed-badge">{t("settings.ollama.installed")}</span>
                ) : (
                  <span className="lc-model-ollama__installed-placeholder" aria-hidden />
                )}
                <div className="lc-model-ollama__model-card__dot-wrap">
                  <span
                    className={cn("lc-model-ollama__load-dot", `lc-model-ollama__load-dot--${tier}`)}
                    role="img"
                    aria-label={dotAria}
                    title={dotAria}
                  />
                </div>
              </div>
              <button
                type="button"
                className="lc-model-ollama__chip"
                disabled={busy}
                title={title}
                onClick={() => {
                  setTag(s.tag);
                  void startPull(s.tag);
                }}
              >
                <span className="lc-model-ollama__chip-title">{s.shortName}</span>
                <div className="lc-model-ollama__chip-meta">
                  <div className="lc-model-ollama__chip-weight-row">
                    <span className="lc-model-ollama__chip-weight">{weightLabel}</span>
                    <span className="lc-model-ollama__chip-weight" aria-hidden>
                      ·
                    </span>
                    <span
                      className={cn(
                        "lc-model-ollama__chip-disk",
                        !measuredDisk && "lc-model-ollama__chip-disk--approx",
                      )}
                      title={measuredDisk ? undefined : t("settings.ollama.approxDiskHint")}
                    >
                      {diskLabel}
                    </span>
                  </div>
                </div>
              </button>
            </div>
          );
        })}
      </div>

      {installedRows.length > 0 ? (
        <div className="lc-model-ollama__installed-list" aria-labelledby="lc-model-ollama-installed-heading">
          <h4 id="lc-model-ollama-installed-heading" className="lc-model-ollama__installed-list-title">
            {t("settings.ollama.installedListTitle")}
          </h4>
          <ul className="lc-model-ollama__installed-list-items">
            {installedRows.map((row) => {
              const disk = formatOllamaDiskGbLabel(row.sizeBytes, t);
              const isDeleting = deletingModel === row.name;
              return (
                <li key={row.name} className="lc-model-ollama__installed-row">
                  <div className="lc-model-ollama__installed-row-main">
                    <span className="lc-model-ollama__installed-name" title={row.name}>
                      {row.name}
                    </span>
                    {disk ? <span className="lc-model-ollama__installed-disk">{disk}</span> : null}
                  </div>
                  <button
                    type="button"
                    className={cn(
                      "lc-model-ollama__installed-delete",
                      isDeleting && "lc-model-ollama__installed-delete--busy",
                    )}
                    disabled={busy || Boolean(deletingModel)}
                    aria-busy={isDeleting}
                    aria-label={t("settings.ollama.deleteModelAria", { model: row.name })}
                    title={t("settings.ollama.deleteModelAria", { model: row.name })}
                    onClick={() => void removeModel(row.name)}
                  >
                    <Trash2 size={15} strokeWidth={2} aria-hidden />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {installedListError ? (
        <p className="lc-model-ollama__local-error" role="status">
          {t("settings.ollama.localModelsError", { detail: installedListError })}
        </p>
      ) : null}

      <div className="lc-model-ollama__row">
        <label className="lc-model-ollama__label" htmlFor="lc-model-ollama-model-input">
          {t("settings.ollama.modelTag")}
        </label>
        <input
          id="lc-model-ollama-model-input"
          className="lc-model-ollama__input"
          type="text"
          autoComplete="off"
          spellCheck={false}
          placeholder={t("settings.ollama.placeholder")}
          value={tag}
          disabled={busy}
          onChange={(e) => setTag(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void startPull(tag);
            }
          }}
        />
        <button
          type="button"
          className="lc-model-ollama__pull-btn"
          disabled={busy || !tag.trim()}
          onClick={() => void startPull(tag)}
        >
          {t("settings.ollama.pull")}
        </button>
      </div>

      {statusLine ? (
        <p className={cn("lc-model-ollama__status", statusTone === "ok" && "lc-model-ollama__status--ok")}>
          {statusLine}
        </p>
      ) : null}

      {logLines.length > 0 ? (
        <pre ref={logRef} className="lc-model-ollama__log" aria-live="polite">
          {logLines.join("\n")}
        </pre>
      ) : null}
    </section>
  );
}
