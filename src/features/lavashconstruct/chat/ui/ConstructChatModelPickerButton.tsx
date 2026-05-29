import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { useI18n } from "@/i18n/context";
import { cn } from "@/lib/utils";
import {
  buildChatPickerCatalog,
  CONSTRUCT_CHAT_PICKER_CHANGED_EVENT,
  findChatPickerCatalogEntry,
  getEnabledChatPickerCatalog,
  type ConstructChatPickerModelRef,
} from "@/features/lavashconstruct/chat/model/constructChatPickerModels";
import { CUSTOM_CHAT_MODELS_CHANGED_EVENT } from "@/features/lavashconstruct/chat/model/constructCustomChatModels";
import type { ConstructChatProvider } from "@/features/lavashconstruct/chat/model/constructChatProviders";
import { getTabModelExplicit } from "@/features/lavashconstruct/chat/model/constructChatSettings";
import { ConstructChatProviderMark } from "@/features/lavashconstruct/chat/ui/ConstructChatProviderMark";
import { ComposerFloatingMenu, useComposerMenuDismiss } from "@/features/lavashconstruct/artboard/ui/composerFloatingMenu";

export type ConstructChatModelPickerButtonProps = {
  provider: ConstructChatProvider;
  models: Partial<Record<ConstructChatProvider, string>>;
  ollamaInstalled: readonly string[];
  disabled?: boolean;
  onSelect: (ref: ConstructChatPickerModelRef) => void;
};

export default function ConstructChatModelPickerButton({
  provider,
  models,
  ollamaInstalled,
  disabled = false,
  onSelect,
}: ConstructChatModelPickerButtonProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [pickerRevision, setPickerRevision] = useState(0);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const menuPortalRef = useRef<HTMLUListElement | null>(null);

  useEffect(() => {
    const onChanged = () => setPickerRevision((v) => v + 1);
    window.addEventListener(CONSTRUCT_CHAT_PICKER_CHANGED_EVENT, onChanged);
    window.addEventListener(CUSTOM_CHAT_MODELS_CHANGED_EVENT, onChanged);
    return () => {
      window.removeEventListener(CONSTRUCT_CHAT_PICKER_CHANGED_EVENT, onChanged);
      window.removeEventListener(CUSTOM_CHAT_MODELS_CHANGED_EVENT, onChanged);
    };
  }, []);

  useComposerMenuDismiss(wrapRef, open, () => setOpen(false), menuPortalRef);

  const enabledCatalog = useMemo(
    () => getEnabledChatPickerCatalog(ollamaInstalled, models),
    [ollamaInstalled, models, pickerRevision],
  );

  const explicitModelId = getTabModelExplicit({ models }, provider);
  const currentEntry = useMemo(() => {
    if (!explicitModelId) return null;
    const full = buildChatPickerCatalog(ollamaInstalled, models);
    return findChatPickerCatalogEntry(full, { provider, modelId: explicitModelId });
  }, [explicitModelId, models, ollamaInstalled, provider]);

  const hasSelection = Boolean(explicitModelId);
  const summary = hasSelection ? (currentEntry?.label ?? explicitModelId!) : null;

  const pick = useCallback(
    (ref: ConstructChatPickerModelRef) => {
      onSelect(ref);
      setOpen(false);
    },
    [onSelect],
  );

  return (
    <div ref={wrapRef} className="lc-chat-panel__mode-wrap lc-chat-panel__model-picker-wrap">
      <button
        type="button"
        className="lc-chat-panel__model-picker-trigger"
        aria-expanded={open}
        aria-haspopup="listbox"
        disabled={disabled}
        title={t("construct.chat.modelPickerHint")}
        aria-label={
          hasSelection
            ? t("construct.chat.modelPickerAria", { model: summary ?? "" })
            : t("construct.chat.modelPickerAriaNone")
        }
        onClick={() => setOpen((v) => !v)}
      >
        <ConstructChatProviderMark provider={provider} />
        <span
          className={cn(
            "lc-chat-panel__model-picker-label",
            !hasSelection && "lc-chat-panel__model-picker-label--placeholder",
          )}
        >
          {summary ?? t("construct.chat.modelPickerPlaceholder")}
        </span>
        <ChevronDown size={13} strokeWidth={2} aria-hidden />
      </button>
      <ComposerFloatingMenu
        ref={menuPortalRef}
        open={open}
        anchorRef={wrapRef}
        className="lc-chat-panel__model-menu lc-chat-panel__model-menu--composer lc-chat-panel__model-menu--floating"
        role="listbox"
        ariaLabel={t("construct.chat.modelPickerMenuAria")}
        minWidth={260}
      >
        {enabledCatalog.length === 0 ? (
          <li className="lc-chat-panel__model-menu__li" role="presentation">
            <p className="lc-chat-panel__model-picker-empty">{t("construct.chat.modelPickerEmpty")}</p>
          </li>
        ) : (
          enabledCatalog.map((entry) => {
            const active = entry.ref.provider === provider && entry.ref.modelId === explicitModelId;
            return (
              <li key={entry.key} className="lc-chat-panel__model-menu__li" role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={active}
                  className={cn(
                    "lc-chat-panel__model-menu-item lc-chat-panel__model-menu-item--picker",
                    active && "lc-chat-panel__model-menu-item--active",
                  )}
                  onClick={() => pick(entry.ref)}
                >
                  <span className="lc-chat-panel__model-picker-item-provider">{entry.providerLabel}</span>
                  <span className="lc-chat-panel__model-picker-item-label">{entry.label}</span>
                </button>
              </li>
            );
          })
        )}
      </ComposerFloatingMenu>
    </div>
  );
}
