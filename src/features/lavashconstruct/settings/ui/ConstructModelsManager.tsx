import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ChevronDown, ChevronRight, KeyRound, Plus, Trash2 } from "lucide-react";
import { useI18n } from "@/i18n/context";
import { cn } from "@/lib/utils";
import { openExternalUrl } from "@/lib/openExternalUrl";
import {
  buildChatPickerCatalog,
  CONSTRUCT_CHAT_PICKER_CHANGED_EVENT,
  readChatPickerEnabledKeys,
  setChatPickerModelEnabled,
  type ChatPickerCatalogEntry,
} from "@/features/lavashconstruct/chat/model/constructChatPickerModels";
import {
  addCustomChatModel,
  CUSTOM_CHAT_MODELS_CHANGED_EVENT,
  removeCustomChatModel,
} from "@/features/lavashconstruct/chat/model/constructCustomChatModels";
import {
  CONSTRUCT_CHAT_PROVIDERS,
  getConstructProviderDef,
  type ConstructChatProvider,
} from "@/features/lavashconstruct/chat/model/constructChatProviders";
import {
  readConstructChatApiKey,
  writeConstructChatApiKey,
  getTabModel,
} from "@/features/lavashconstruct/chat/model/constructChatSettings";
import { applyConstructChatModelSelection } from "@/features/lavashconstruct/chat/model/constructChatModelSelection";
import { ConstructChatProviderMark } from "@/features/lavashconstruct/chat/ui/ConstructChatProviderMark";
import {
  BasicsSettingsCard,
  BasicsSettingsSection,
} from "@/features/lavashconstruct/settings/ui/ConstructBasicsSettings";

export type ConstructModelsManagerProps = {
  models: Partial<Record<ConstructChatProvider, string>>;
  ollamaInstalled: readonly string[];
  onUseModel: (ref: { provider: ConstructChatProvider; modelId: string }) => void;
};

type ModelGroupId = "builtin" | "local" | "custom";

function ModelProviderApiKeyButton(props: {
  provider: ConstructChatProvider;
  hasKey: boolean;
  onSaved: () => void;
}) {
  const { provider, hasKey, onSaved } = props;
  const { t } = useI18n();
  const def = getConstructProviderDef(provider);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(() => readConstructChatApiKey(provider));
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    setDraft(readConstructChatApiKey(provider));
    const onPointerDown = (event: PointerEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("pointerdown", onPointerDown, true);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown, true);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, provider]);

  const commit = useCallback(() => {
    writeConstructChatApiKey(provider, draft.trim());
    onSaved();
    setOpen(false);
  }, [draft, onSaved, provider]);

  if (!def.needsApiKey) return null;

  return (
    <div className="lc-models-table__key-wrap" ref={wrapRef}>
      <button
        type="button"
        className={cn(
          "lc-models-table__key-btn",
          hasKey && "lc-models-table__key-btn--set",
          !hasKey && "lc-models-table__key-btn--missing",
        )}
        aria-label={t("construct.model.manager.apiKeyBtnAria", { provider: def.label })}
        title={
          hasKey
            ? t("construct.model.manager.apiKeyBtnTitleSet", { provider: def.label })
            : t("construct.model.manager.apiKeyBtnTitleMissing", { provider: def.label })
        }
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <KeyRound size={13} strokeWidth={2} aria-hidden />
      </button>
      {open ? (
        <div className="lc-models-table__key-popover" role="dialog" aria-label={t("construct.chat.apiKeyLabel", { provider: def.label })}>
          <label className="lc-models-table__key-label" htmlFor={`lc-model-api-key-${provider}`}>
            {t("construct.chat.apiKeyLabel", { provider: def.label })}
          </label>
          <input
            id={`lc-model-api-key-${provider}`}
            type="password"
            className="lc-models-table__key-input"
            value={draft}
            autoComplete="off"
            spellCheck={false}
            placeholder={def.keyPlaceholder ?? ""}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                commit();
              }
            }}
          />
          {def.signupUrl ? (
            <a
              className="lc-models-table__key-link"
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
          <div className="lc-models-table__key-actions">
            <button type="button" className="lc-models-table__key-cancel" onClick={() => setOpen(false)}>
              {t("construct.model.manager.cancel")}
            </button>
            <button type="button" className="lc-models-table__key-save" onClick={commit}>
              {t("construct.model.manager.apiKeySave")}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ModelChatCheckbox(props: {
  checked: boolean;
  inputId: string;
  label: string;
  onChange: (next: boolean) => void;
}) {
  const { checked, inputId, label, onChange } = props;
  return (
    <label
      htmlFor={inputId}
      className={cn("lc-models-table__check", checked && "lc-models-table__check--on")}
      title={label}
    >
      <input
        id={inputId}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="lc-models-table__check-box" aria-hidden />
    </label>
  );
}

function ModelsTable(props: {
  rows: ChatPickerCatalogEntry[];
  enabledKeys: Set<string>;
  models: Partial<Record<ConstructChatProvider, string>>;
  apiKeyRevision: number;
  onToggleChat: (entry: ChatPickerCatalogEntry, next: boolean) => void;
  onUse: (entry: ChatPickerCatalogEntry) => void;
  onApiKeySaved: () => void;
  onRemoveCustom?: (entry: ChatPickerCatalogEntry) => void;
}) {
  const { t } = useI18n();
  const {
    rows,
    enabledKeys,
    models,
    apiKeyRevision,
    onToggleChat,
    onUse,
    onApiKeySaved,
    onRemoveCustom,
  } = props;
  void apiKeyRevision;

  if (rows.length === 0) {
    return <p className="lc-models-table__empty">{t("construct.model.manager.emptyGroup")}</p>;
  }

  return (
    <div className="lc-models-table-wrap">
      <table className="lc-models-table">
        <thead>
          <tr>
            <th scope="col" className="lc-models-table__th lc-models-table__th--chat">
              {t("construct.model.manager.colChat")}
            </th>
            <th scope="col" className="lc-models-table__th">
              {t("construct.model.manager.colModel")}
            </th>
            <th scope="col" className="lc-models-table__th lc-models-table__th--provider">
              {t("construct.model.manager.colProvider")}
            </th>
            <th scope="col" className="lc-models-table__th lc-models-table__th--actions">
              {t("construct.model.manager.colActions")}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((entry) => {
            const checked = enabledKeys.has(entry.key);
            const isActive = entry.ref.modelId === getTabModel({ models }, entry.ref.provider);
            const inputId = `lc-model-chat-${entry.key.replace(/[^\w-]/g, "_")}`;
            const needsKey =
              getConstructProviderDef(entry.ref.provider).needsApiKey &&
              !readConstructChatApiKey(entry.ref.provider).trim();
            const hasKey = Boolean(readConstructChatApiKey(entry.ref.provider).trim());

            return (
              <tr key={entry.key} className={cn(isActive && "lc-models-table__row--active")}>
                <td className="lc-models-table__td lc-models-table__td--chat">
                  <ModelChatCheckbox
                    checked={checked}
                    inputId={inputId}
                    label={t("construct.model.manager.chatToggleAria", { model: entry.label })}
                    onChange={(next) => onToggleChat(entry, next)}
                  />
                </td>
                <td className="lc-models-table__td lc-models-table__td--model">
                  <div className="lc-models-table__model-cell">
                    <ConstructChatProviderMark provider={entry.ref.provider} />
                    <span className="lc-models-table__model-name" title={entry.label}>
                      {entry.label}
                    </span>
                    <ModelProviderApiKeyButton
                      provider={entry.ref.provider}
                      hasKey={hasKey}
                      onSaved={onApiKeySaved}
                    />
                  </div>
                </td>
                <td className="lc-models-table__td lc-models-table__td--provider">
                  <span className="lc-models-table__provider">{entry.providerLabel}</span>
                </td>
                <td className="lc-models-table__td lc-models-table__td--actions">
                  <div className="lc-models-table__actions">
                    {isActive ? (
                      <span className="lc-models-table__active-badge">
                        {t("construct.model.manager.activeBadge")}
                      </span>
                    ) : (
                      <button
                        type="button"
                        className="lc-models-table__use-btn"
                        disabled={needsKey}
                        title={
                          needsKey
                            ? t("construct.model.manager.needsApiKeyHint", {
                                provider: entry.providerLabel,
                              })
                            : t("construct.model.manager.useModel")
                        }
                        onClick={() => onUse(entry)}
                      >
                        {t("construct.model.manager.useModel")}
                      </button>
                    )}
                    {entry.custom && entry.customId && onRemoveCustom ? (
                      <button
                        type="button"
                        className="lc-models-table__delete-btn"
                        aria-label={t("construct.model.manager.removeCustom", { model: entry.label })}
                        onClick={() => onRemoveCustom(entry)}
                      >
                        <Trash2 size={14} strokeWidth={2} aria-hidden />
                      </button>
                    ) : null}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ModelGroupSection(props: {
  id: ModelGroupId;
  title: string;
  count: number;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <section className="lc-models-group" aria-labelledby={`lc-models-group-${props.id}`}>
      <button
        type="button"
        id={`lc-models-group-${props.id}`}
        className="lc-models-group__head"
        aria-expanded={props.open}
        onClick={props.onToggle}
      >
        {props.open ? (
          <ChevronDown size={16} strokeWidth={2} aria-hidden />
        ) : (
          <ChevronRight size={16} strokeWidth={2} aria-hidden />
        )}
        <span>{props.title}</span>
        <span className="lc-models-group__count">{props.count}</span>
      </button>
      {props.open ? <div className="lc-models-group__body">{props.children}</div> : null}
    </section>
  );
}

export default function ConstructModelsManager({
  models,
  ollamaInstalled,
  onUseModel,
}: ConstructModelsManagerProps) {
  const { t } = useI18n();
  const [revision, setRevision] = useState(0);
  const [builtinOpen, setBuiltinOpen] = useState(true);
  const [localOpen, setLocalOpen] = useState(true);
  const [customOpen, setCustomOpen] = useState(true);
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [customProvider, setCustomProvider] = useState<ConstructChatProvider>("openrouter");
  const [customModelId, setCustomModelId] = useState("");
  const [customLabel, setCustomLabel] = useState("");
  const [apiKeyRevision, setApiKeyRevision] = useState(0);

  useEffect(() => {
    const bump = () => setRevision((v) => v + 1);
    window.addEventListener(CONSTRUCT_CHAT_PICKER_CHANGED_EVENT, bump);
    window.addEventListener(CUSTOM_CHAT_MODELS_CHANGED_EVENT, bump);
    return () => {
      window.removeEventListener(CONSTRUCT_CHAT_PICKER_CHANGED_EVENT, bump);
      window.removeEventListener(CUSTOM_CHAT_MODELS_CHANGED_EVENT, bump);
    };
  }, []);

  const catalog = useMemo(
    () => buildChatPickerCatalog(ollamaInstalled, models),
    [ollamaInstalled, models, revision],
  );

  const builtinRows = useMemo(
    () => catalog.filter((e) => e.ref.provider !== "ollama" && !e.custom),
    [catalog],
  );
  const localRows = useMemo(
    () => catalog.filter((e) => e.ref.provider === "ollama"),
    [catalog],
  );
  const customRows = useMemo(() => catalog.filter((e) => e.custom), [catalog]);

  const enabledKeys = useMemo(() => readChatPickerEnabledKeys(), [revision]);

  const toggleChat = useCallback((entry: ChatPickerCatalogEntry, next: boolean) => {
    setChatPickerModelEnabled(entry.ref, next);
  }, []);

  const useModel = useCallback(
    (entry: ChatPickerCatalogEntry) => {
      applyConstructChatModelSelection(entry.ref);
      onUseModel(entry.ref);
    },
    [onUseModel],
  );

  const removeCustom = useCallback((entry: ChatPickerCatalogEntry) => {
    if (!entry.customId) return;
    removeCustomChatModel(entry.customId);
    setChatPickerModelEnabled(entry.ref, false);
  }, []);

  const cloudProviders = useMemo(
    () => CONSTRUCT_CHAT_PROVIDERS.filter((p) => p.id !== "ollama"),
    [],
  );

  const bumpApiKeyRevision = useCallback(() => {
    setApiKeyRevision((value) => value + 1);
  }, []);

  const submitCustom = useCallback(() => {
    const modelId = customModelId.trim();
    if (!modelId) return;
    const created = addCustomChatModel({
      provider: customProvider,
      modelId,
      label: customLabel.trim() || undefined,
    });
    setChatPickerModelEnabled({ provider: created.provider, modelId: created.modelId }, true);
    setCustomModelId("");
    setCustomLabel("");
    setShowAddCustom(false);
    setCustomOpen(true);
  }, [customLabel, customModelId, customProvider]);

  return (
    <BasicsSettingsSection
      title={t("construct.model.manager.title")}
      action={
        <button
          type="button"
          className="lc-basics-settings__head-action"
          onClick={() => {
            setShowAddCustom((v) => !v);
            setCustomOpen(true);
          }}
        >
          <Plus size={14} strokeWidth={2.25} aria-hidden />
          {t("construct.model.manager.addModel")}
        </button>
      }
    >
      <p className="lc-models-manager__lead">{t("construct.model.manager.lead")}</p>

      <BasicsSettingsCard className="lc-models-manager__card">
      {showAddCustom ? (
        <form
          className="lc-models-manager__add-form"
          onSubmit={(e) => {
            e.preventDefault();
            submitCustom();
          }}
        >
          <label className="lc-models-manager__field">
            <span>{t("construct.model.manager.customProvider")}</span>
            <select
              value={customProvider}
              onChange={(e) => setCustomProvider(e.target.value as ConstructChatProvider)}
            >
              {cloudProviders.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>
          <label className="lc-models-manager__field">
            <span>{t("construct.model.manager.customModelId")}</span>
            <input
              value={customModelId}
              onChange={(e) => setCustomModelId(e.target.value)}
              placeholder="meta-llama/llama-3.3-70b-instruct"
              spellCheck={false}
            />
          </label>
          <label className="lc-models-manager__field">
            <span>{t("construct.model.manager.customLabel")}</span>
            <input
              value={customLabel}
              onChange={(e) => setCustomLabel(e.target.value)}
              placeholder={t("construct.model.manager.customLabelPh")}
              spellCheck={false}
            />
          </label>
          <div className="lc-models-manager__add-actions">
            <button type="button" className="lc-models-manager__cancel-btn" onClick={() => setShowAddCustom(false)}>
              {t("construct.model.manager.cancel")}
            </button>
            <button type="submit" className="lc-models-manager__save-btn" disabled={!customModelId.trim()}>
              {t("construct.model.manager.saveCustom")}
            </button>
          </div>
        </form>
      ) : null}

      <ModelGroupSection
        id="builtin"
        title={t("construct.model.manager.groupBuiltin")}
        count={builtinRows.length}
        open={builtinOpen}
        onToggle={() => setBuiltinOpen((v) => !v)}
      >
        <ModelsTable
          rows={builtinRows}
          enabledKeys={enabledKeys}
          models={models}
          apiKeyRevision={apiKeyRevision}
          onToggleChat={toggleChat}
          onUse={useModel}
          onApiKeySaved={bumpApiKeyRevision}
        />
      </ModelGroupSection>

      <ModelGroupSection
        id="local"
        title={t("construct.model.manager.groupLocal")}
        count={localRows.length}
        open={localOpen}
        onToggle={() => setLocalOpen((v) => !v)}
      >
        <ModelsTable
          rows={localRows}
          enabledKeys={enabledKeys}
          models={models}
          apiKeyRevision={apiKeyRevision}
          onToggleChat={toggleChat}
          onUse={useModel}
          onApiKeySaved={bumpApiKeyRevision}
        />
      </ModelGroupSection>

      <ModelGroupSection
        id="custom"
        title={t("construct.model.manager.groupCustom")}
        count={customRows.length}
        open={customOpen}
        onToggle={() => setCustomOpen((v) => !v)}
      >
        <ModelsTable
          rows={customRows}
          enabledKeys={enabledKeys}
          models={models}
          apiKeyRevision={apiKeyRevision}
          onToggleChat={toggleChat}
          onUse={useModel}
          onApiKeySaved={bumpApiKeyRevision}
          onRemoveCustom={removeCustom}
        />
        {customRows.length === 0 && !showAddCustom ? (
          <p className="lc-models-table__empty lc-models-table__empty--inline">
            {t("construct.model.manager.customEmpty")}{" "}
            <button type="button" className="lc-models-manager__link" onClick={() => setShowAddCustom(true)}>
              {t("construct.model.manager.customEmptyLink")}
            </button>
          </p>
        ) : null}
      </ModelGroupSection>
      </BasicsSettingsCard>
    </BasicsSettingsSection>
  );
}
