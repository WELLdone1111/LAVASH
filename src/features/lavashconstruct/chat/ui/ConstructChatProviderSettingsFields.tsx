import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, RefreshCw } from "lucide-react";
import { isTauri } from "@tauri-apps/api/core";
import { useI18n } from "@/i18n/context";
import { cn } from "@/lib/utils";
import { openExternalUrl } from "@/lib/openExternalUrl";
import type {
  ConstructModelOption,
  ConstructModelTier,
} from "@/features/lavashconstruct/chat/model/constructChatModelCatalog";
import {
  buildOllamaModelSelectOptions,
  geminiModelSelectOptions,
  readConstructChatApiKey,
  readConstructChatModel,
  writeConstructChatApiKey,
  writeConstructChatModel,
  writeConstructChatProvider,
} from "@/features/lavashconstruct/chat/model/constructChatSettings";
import {
  CONSTRUCT_CHAT_PROVIDERS,
  getConstructProviderDef,
  modelOptionsForProvider,
  type ConstructChatProvider,
} from "@/features/lavashconstruct/chat/model/constructChatProviders";
import { ConstructChatProviderMark } from "@/features/lavashconstruct/chat/ui/ConstructChatProviderMark";

type ModelMenuRow =
  | { kind: "tier"; tier: ConstructModelTier }
  | { kind: "option"; option: ConstructModelOption };

function tierLabelKey(tier: ConstructModelTier): string {
  if (tier === "premium") return "construct.model.tier.premium";
  if (tier === "freemium") return "construct.model.tier.freemium";
  return "construct.model.tier.free";
}

function buildModelMenuRows(options: readonly ConstructModelOption[]): ModelMenuRow[] {
  const hasTiers = options.some((o) => o.tier);
  if (!hasTiers) {
    return options.map((option) => ({ kind: "option", option }));
  }
  const rows: ModelMenuRow[] = [];
  let lastTier: ConstructModelTier | undefined;
  for (const option of options) {
    if (option.tier && option.tier !== lastTier) {
      rows.push({ kind: "tier", tier: option.tier });
      lastTier = option.tier;
    }
    rows.push({ kind: "option", option });
  }
  return rows;
}

function ConstructSettingsModelSelect(props: {
  value: string;
  options: readonly ConstructModelOption[];
  onPick: (id: string) => void;
}) {
  const { value, options, onPick } = props;
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const menuRows = useMemo(() => buildModelMenuRows(options), [options]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const active = options.find((o) => o.id === value);
  const summary = active?.label ?? value;

  return (
    <div className="lc-chat-panel__select-wrap" ref={wrapRef}>
      <button
        type="button"
        className={cn(
          "lc-chat-panel__settings-select",
          "lc-chat-panel__settings-select--chevron",
          open && "lc-chat-panel__settings-select--open",
        )}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {summary}
      </button>
      <ChevronDown
        className={cn("lc-chat-panel__select-chevron", open && "lc-chat-panel__select-chevron--open")}
        size={16}
        strokeWidth={2}
        aria-hidden
      />
      {open ? (
        <ul className="lc-chat-panel__model-menu" role="listbox">
          {menuRows.map((row, idx) => {
            if (row.kind === "tier") {
              return (
                <li
                  key={`tier-${row.tier}-${idx}`}
                  className="lc-chat-panel__model-menu__li lc-chat-panel__model-menu__li--tier"
                  role="presentation"
                >
                  <span className="lc-chat-panel__model-menu-tier">{t(tierLabelKey(row.tier))}</span>
                </li>
              );
            }
            const o = row.option;
            return (
              <li key={o.id || `opt-${idx}`} className="lc-chat-panel__model-menu__li" role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={o.id === value}
                  className={cn(
                    "lc-chat-panel__model-menu-item",
                    o.id === value && "lc-chat-panel__model-menu-item--active",
                  )}
                  disabled={!o.id}
                  onClick={() => {
                    if (!o.id) return;
                    onPick(o.id);
                    setOpen(false);
                  }}
                >
                  {o.label}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

export type ConstructChatProviderSettingsFieldsProps = {
  provider: ConstructChatProvider;
  models: Partial<Record<ConstructChatProvider, string>>;
  ollamaInstalled: readonly string[];
  ollamaLoading?: boolean;
  onRefreshOllama?: () => void;
  onProviderChange: (provider: ConstructChatProvider) => void;
  onModelsChange: (models: Partial<Record<ConstructChatProvider, string>>) => void;
  showLead?: boolean;
};

export function ConstructChatProviderSettingsFields({
  provider,
  models,
  ollamaInstalled,
  ollamaLoading = false,
  onRefreshOllama,
  onProviderChange,
  onModelsChange,
  showLead = false,
}: ConstructChatProviderSettingsFieldsProps) {
  const { t } = useI18n();
  const [apiKeyDraft, setApiKeyDraft] = useState(() => readConstructChatApiKey(provider));

  useEffect(() => {
    setApiKeyDraft(readConstructChatApiKey(provider));
  }, [provider]);

  const def = getConstructProviderDef(provider);
  const storedModel = models[provider] ?? readConstructChatModel(provider);

  const modelSelectOptions = useMemo(() => {
    const ollamaOpts = buildOllamaModelSelectOptions(
      ollamaInstalled,
      storedModel,
      t("construct.chat.ollamaNoModelsInstalled"),
    );
    return modelOptionsForProvider(
      provider,
      storedModel,
      geminiModelSelectOptions(storedModel),
      ollamaOpts,
    );
  }, [ollamaInstalled, provider, storedModel, t]);

  const selectProvider = useCallback(
    (next: ConstructChatProvider) => {
      onProviderChange(next);
      writeConstructChatProvider(next);
      setApiKeyDraft(readConstructChatApiKey(next));
    },
    [onProviderChange],
  );

  const selectModel = useCallback(
    (modelId: string) => {
      const nextModels = { ...models, [provider]: modelId };
      onModelsChange(nextModels);
      writeConstructChatModel(provider, modelId);
    },
    [models, onModelsChange, provider],
  );

  const commitApiKey = useCallback(() => {
    writeConstructChatApiKey(provider, apiKeyDraft.trim());
  }, [apiKeyDraft, provider]);

  return (
    <>
      {showLead ? <p className="lc-model-panel__lead">{t("construct.model.lead")}</p> : null}

      <div className="lc-chat-panel__settings-row lc-chat-panel__settings-row--provider">
        <span className="lc-chat-panel__settings-k">{t("construct.chat.provider")}</span>
        <div className="lc-chat-panel__provider-pills" role="group" aria-label={t("construct.chat.providerGroupAria")}>
          {CONSTRUCT_CHAT_PROVIDERS.map((p) => {
            const active = p.id === provider;
            return (
              <button
                key={p.id}
                type="button"
                className={cn("lc-chat-panel__provider-pill", active && "lc-chat-panel__provider-pill--active")}
                aria-pressed={active}
                onClick={() => selectProvider(p.id)}
              >
                <ConstructChatProviderMark provider={p.id} />
                <span className="lc-chat-panel__provider-pill__text">
                  {p.label}
                  {p.freeTier ? (
                    <span className="lc-chat-panel__provider-pill__tag lc-chat-panel__provider-pill__tag--free">
                      {t("construct.chat.provider.freeTierBadge")}
                    </span>
                  ) : null}
                  {p.noApiKey ? (
                    <span className="lc-chat-panel__provider-pill__tag">{t("construct.chat.provider.noKeyBadge")}</span>
                  ) : null}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {def.noApiKey ? (
        <p className="lc-chat-panel__settings-hint">{t("construct.model.ollamaChatHint")}</p>
      ) : def.freeTier ? (
        <p className="lc-chat-panel__settings-hint">{t("construct.chat.provider.freeTierHint")}</p>
      ) : null}

      <div
        className={cn(
          "lc-chat-panel__settings-row",
          def.kind === "local" ? "lc-chat-panel__settings-row--stack" : undefined,
        )}
      >
        <span className="lc-chat-panel__settings-k">
          {def.kind === "local" ? t("construct.chat.ollamaModel") : t("construct.chat.model")}
        </span>
        <div className="lc-model-panel__model-row">
          <ConstructSettingsModelSelect value={storedModel} options={modelSelectOptions} onPick={selectModel} />
          {provider === "ollama" && isTauri() && onRefreshOllama ? (
            <button
              type="button"
              className="lc-model-panel__refresh"
              aria-label={t("construct.model.refreshOllama")}
              title={t("construct.model.refreshOllama")}
              disabled={ollamaLoading}
              onClick={() => onRefreshOllama()}
            >
              <RefreshCw size={15} className={ollamaLoading ? "lc-project-panel__spin" : undefined} aria-hidden />
            </button>
          ) : null}
        </div>
      </div>

      {def.needsApiKey ? (
        <div className="lc-chat-panel__settings-row lc-chat-panel__settings-row--stack">
          <label className="lc-chat-panel__settings-k" htmlFor="lc-chat-provider-api-key">
            {t("construct.chat.apiKeyLabel", { provider: def.label })}
          </label>
          <input
            id="lc-chat-provider-api-key"
            type="password"
            className="lc-chat-panel__settings-input"
            value={apiKeyDraft}
            autoComplete="off"
            spellCheck={false}
            placeholder={def.keyPlaceholder ?? ""}
            onChange={(e) => setApiKeyDraft(e.target.value)}
            onBlur={commitApiKey}
          />
          {def.signupUrl ? (
            <a
              className="lc-chat-panel__settings-link"
              href={def.signupUrl}
              target="_blank"
              rel="noreferrer noopener"
              onClick={(event) => {
                event.preventDefault();
                void openExternalUrl(def.signupUrl!);
              }}
            >
              {t("construct.chat.getApiKey", { provider: def.label })}
            </a>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
