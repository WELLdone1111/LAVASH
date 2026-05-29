import { useCallback } from "react";
import { ArrowUp, Copy, Plus } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useI18n } from "@/i18n/context";
import ConstructMonacoEditor from "@/features/lavashconstruct/editor/ui/ConstructMonacoEditor";
import { useConstructCodeScratchStore } from "@/features/lavashconstruct/editor/model/codeScratchStore";
import "./ConstructCodeEditorPanel.css";

type ConstructCodeEditorPanelProps = {
  /** Викликається при зміні тексту активної вкладки (для майбутнього зв’язку з артбордом). */
  onChange?: (value: string) => void;
  /** Поточний текст активної вкладки як імпортована панель на артборді (як з User Lib). */
  onPushToArtboard?: () => void;
};

export default function ConstructCodeEditorPanel(props: ConstructCodeEditorPanelProps) {
  const { onChange, onPushToArtboard } = props;
  const { t } = useI18n();
  const tabs = useConstructCodeScratchStore((s) => s.tabs);
  const activeTabId = useConstructCodeScratchStore((s) => s.activeTabId);
  const setActiveTabId = useConstructCodeScratchStore((s) => s.setActiveTabId);
  const setTabContent = useConstructCodeScratchStore((s) => s.setTabContent);
  const addTab = useConstructCodeScratchStore((s) => s.addTab);
  const removeTab = useConstructCodeScratchStore((s) => s.removeTab);

  const active = tabs.find((t) => t.id === activeTabId) ?? tabs[0];

  const copyActiveTab = useCallback(() => {
    const { tabs: tabList, activeTabId: id } = useConstructCodeScratchStore.getState();
    const tab = tabList.find((x) => x.id === id);
    void navigator.clipboard.writeText(tab?.content ?? "");
  }, []);

  return (
    <div className="lc-code-editor" aria-label={t("construct.code.aria")}>
      <div className="lc-code-editor__toolbar">
        <Tabs value={activeTabId} onValueChange={setActiveTabId} className="lc-code-editor__tabs-root">
          <TabsList className="lc-code-editor__tabs-list">
            {tabs.map((tab) => (
              <span key={tab.id} className="lc-code-editor__tab-item">
                <TabsTrigger value={tab.id} className="lc-code-editor__tab-trigger">
                  {tab.label}
                </TabsTrigger>
                {tabs.length > 1 ? (
                  <button
                    type="button"
                    className="lc-code-editor__tab-close"
                    aria-label={t("construct.code.closeTab", { label: tab.label })}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      removeTab(tab.id);
                    }}
                  >
                    ×
                  </button>
                ) : null}
              </span>
            ))}
          </TabsList>
        </Tabs>
        <button
          type="button"
          className="lc-code-editor__copy-code"
          aria-label={t("construct.code.copy")}
          disabled={!active?.content?.trim()}
          onClick={() => copyActiveTab()}
        >
          <Copy size={16} strokeWidth={2} />
        </button>
        {onPushToArtboard ? (
          <button
            type="button"
            className="lc-code-editor__to-artboard"
            aria-label={t("construct.code.toArtboard")}
            disabled={!active?.content?.trim()}
            onClick={() => onPushToArtboard()}
          >
            <ArrowUp size={16} strokeWidth={2} />
          </button>
        ) : null}
        <button
          type="button"
          className="lc-code-editor__add-tab"
          aria-label={t("construct.code.newTab")}
          onClick={() => addTab()}
        >
          <Plus size={16} strokeWidth={2} />
        </button>
      </div>
      <ConstructMonacoEditor
        key={active?.id}
        className="lc-code-editor__monaco"
        value={active?.content ?? ""}
        onChange={(next) => {
          if (active) setTabContent(active.id, next);
          onChange?.(next);
        }}
        height="100%"
        documentId={active?.id ?? "scratch-main"}
        languageInput={{ filename: `${active?.label ?? "draft"}.tsx` }}
      />
    </div>
  );
}
