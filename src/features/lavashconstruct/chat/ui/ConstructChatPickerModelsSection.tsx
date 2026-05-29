import { useCallback, useEffect, useMemo, useState } from "react";
import { useI18n } from "@/i18n/context";
import { cn } from "@/lib/utils";
import {
  buildChatPickerCatalog,
  CONSTRUCT_CHAT_PICKER_CHANGED_EVENT,
  readChatPickerEnabledKeys,
  setChatPickerModelEnabled,
  type ChatPickerCatalogEntry,
} from "@/features/lavashconstruct/chat/model/constructChatPickerModels";
import {
  CONSTRUCT_CHAT_PROVIDERS,
  type ConstructChatProvider,
} from "@/features/lavashconstruct/chat/model/constructChatProviders";
import { ConstructChatProviderMark } from "@/features/lavashconstruct/chat/ui/ConstructChatProviderMark";

type ProviderGroup = {
  provider: ConstructChatProvider;
  providerLabel: string;
  entries: ChatPickerCatalogEntry[];
};

function groupCatalogByProvider(catalog: ChatPickerCatalogEntry[]): ProviderGroup[] {
  const byProvider = new Map<ConstructChatProvider, ChatPickerCatalogEntry[]>();
  for (const entry of catalog) {
    const list = byProvider.get(entry.ref.provider) ?? [];
    list.push(entry);
    byProvider.set(entry.ref.provider, list);
  }
  return CONSTRUCT_CHAT_PROVIDERS.map((p) => ({
    provider: p.id,
    providerLabel: p.label,
    entries: byProvider.get(p.id) ?? [],
  })).filter((g) => g.entries.length > 0);
}

export type ConstructChatPickerModelsSectionProps = {
  ollamaInstalled: readonly string[];
  models: Partial<Record<ConstructChatProvider, string>>;
};

export default function ConstructChatPickerModelsSection({
  ollamaInstalled,
  models,
}: ConstructChatPickerModelsSectionProps) {
  const { t } = useI18n();
  const [enabledRevision, setEnabledRevision] = useState(0);

  useEffect(() => {
    const onChanged = () => setEnabledRevision((v) => v + 1);
    window.addEventListener(CONSTRUCT_CHAT_PICKER_CHANGED_EVENT, onChanged);
    return () => window.removeEventListener(CONSTRUCT_CHAT_PICKER_CHANGED_EVENT, onChanged);
  }, []);

  const catalog = useMemo(
    () => buildChatPickerCatalog(ollamaInstalled, models),
    [ollamaInstalled, models],
  );
  const groups = useMemo(() => groupCatalogByProvider(catalog), [catalog]);
  const enabledKeys = useMemo(() => readChatPickerEnabledKeys(), [enabledRevision]);

  const toggle = useCallback((entry: ChatPickerCatalogEntry, next: boolean) => {
    setChatPickerModelEnabled(entry.ref, next);
  }, []);

  if (groups.length === 0) {
    return <p className="lc-model-panel__picker-empty">{t("construct.model.chatPicker.empty")}</p>;
  }

  return (
    <div className="lc-model-panel__picker" role="group" aria-label={t("construct.model.chatPicker.groupAria")}>
      {groups.map((group) => (
        <div key={group.provider} className="lc-model-panel__picker-group">
          <div className="lc-model-panel__picker-group-head">
            <ConstructChatProviderMark provider={group.provider} />
            <span>{group.providerLabel}</span>
          </div>
          <ul className="lc-model-panel__picker-list">
            {group.entries.map((entry) => {
              const checked = enabledKeys.has(entry.key);
              const inputId = `lc-chat-picker-${entry.key.replace(/[^\w-]/g, "_")}`;
              return (
                <li key={entry.key}>
                  <label
                    htmlFor={inputId}
                    className={cn(
                      "lc-model-panel__picker-check",
                      checked && "lc-model-panel__picker-check--on",
                    )}
                  >
                    <input
                      id={inputId}
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => toggle(entry, e.target.checked)}
                    />
                    <span className="lc-model-panel__picker-check-box" aria-hidden />
                    <span className="lc-model-panel__picker-check-label">{entry.label}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
