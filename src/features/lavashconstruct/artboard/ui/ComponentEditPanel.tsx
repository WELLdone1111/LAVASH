import { HexColorPicker } from "react-colorful";
import { useI18n } from "@/i18n/context";
import ConstructMonacoEditor from "@/features/lavashconstruct/editor/ui/ConstructMonacoEditor";
import type { ImportedVisualKind } from "@/features/lavashconstruct/artboard/model/import";

type ComponentEditPanelProps = {
  isOpen: boolean;
  panelTitle: string;
  /** Вшиті shadcn lc-віджети: едітор сорсу схований (він не керує тілом віджета). */
  hideSourceSection?: boolean;
  sourceCode: string;
  sourceVisualKind?: ImportedVisualKind;
  sourceFilename?: string;
  documentId?: string;
  cssVars: Record<"--accent-color" | "--bg-color" | "--text-color", string>;
  opacity: number;
  blurPx: number;
  borderRadiusPx: number;
  hoverScale: number;
  onSourceCodeChange: (value: string) => void;
  onCssVarChange: (name: "--accent-color" | "--bg-color" | "--text-color", value: string) => void;
  onOpacityChange: (value: number) => void;
  onBlurPxChange: (value: number) => void;
  onBorderRadiusPxChange: (value: number) => void;
  onHoverScaleChange: (value: number) => void;
  onApply: () => void;
  onCancel: () => void;
};

function normalizeToHexColor(value: string): string {
  const trimmed = value.trim();
  if (/^#[\da-fA-F]{6}$/.test(trimmed)) return trimmed.toLowerCase();
  if (/^#[\da-fA-F]{3}$/.test(trimmed)) {
    const short = trimmed.slice(1);
    return `#${short[0]}${short[0]}${short[1]}${short[1]}${short[2]}${short[2]}`.toLowerCase();
  }
  if (/^rgba?\(/i.test(trimmed)) {
    const match = trimmed.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/i);
    if (match) {
      const hex = (n: number) => Math.min(255, Math.max(0, Math.round(n))).toString(16).padStart(2, "0");
      return `#${hex(Number(match[1]))}${hex(Number(match[2]))}${hex(Number(match[3]))}`;
    }
  }
  return "#ffb800";
}

export default function ComponentEditPanel(props: ComponentEditPanelProps) {
  const { t } = useI18n();
  return (
    <aside className="lc-component-edit-panel" data-open={props.isOpen ? "true" : "false"}>
      <div className="lc-component-edit-panel__header">
        <h3>{t("construct.edit.title", { name: props.panelTitle })}</h3>
      </div>

      <div className="lc-component-edit-panel__section">
        <h4>{t("construct.edit.cssVars")}</h4>
        <label className="lc-component-edit-panel__var-row">
          <span>--accent-color</span>
          <div className="lc-component-edit-panel__color-tools">
            <input
              type="text"
              value={props.cssVars["--accent-color"]}
              onChange={(event) => props.onCssVarChange("--accent-color", event.currentTarget.value)}
            />
            <HexColorPicker
              color={normalizeToHexColor(props.cssVars["--accent-color"])}
              onChange={(value) => props.onCssVarChange("--accent-color", value)}
            />
          </div>
        </label>
        <label className="lc-component-edit-panel__var-row">
          <span>--bg-color</span>
          <div className="lc-component-edit-panel__color-tools">
            <input
              type="text"
              value={props.cssVars["--bg-color"]}
              onChange={(event) => props.onCssVarChange("--bg-color", event.currentTarget.value)}
            />
            <HexColorPicker
              color={normalizeToHexColor(props.cssVars["--bg-color"])}
              onChange={(value) => props.onCssVarChange("--bg-color", value)}
            />
          </div>
        </label>
        <label className="lc-component-edit-panel__var-row">
          <span>--text-color</span>
          <div className="lc-component-edit-panel__color-tools">
            <input
              type="text"
              value={props.cssVars["--text-color"]}
              onChange={(event) => props.onCssVarChange("--text-color", event.currentTarget.value)}
            />
            <HexColorPicker
              color={normalizeToHexColor(props.cssVars["--text-color"])}
              onChange={(value) => props.onCssVarChange("--text-color", value)}
            />
          </div>
        </label>
      </div>

      <div className="lc-component-edit-panel__section">
        <h4>{t("construct.edit.sliders")}</h4>
        <label className="lc-component-edit-panel__slider-row">
          <span>{t("construct.edit.opacity")}</span>
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(props.opacity * 100)}
            onChange={(event) => props.onOpacityChange(Number(event.currentTarget.value) / 100)}
          />
        </label>
        <label className="lc-component-edit-panel__slider-row">
          <span>{t("construct.edit.blur")}</span>
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(props.blurPx)}
            onChange={(event) => props.onBlurPxChange(Number(event.currentTarget.value))}
          />
        </label>
        <label className="lc-component-edit-panel__slider-row">
          <span>{t("construct.edit.radius")}</span>
          <input
            type="range"
            min={0}
            max={50}
            value={Math.round(props.borderRadiusPx)}
            onChange={(event) => props.onBorderRadiusPxChange(Number(event.currentTarget.value))}
          />
        </label>
        <label className="lc-component-edit-panel__slider-row">
          <span>{t("construct.edit.hoverScale")}</span>
          <input
            type="range"
            min={100}
            max={120}
            value={Math.round(props.hoverScale * 100)}
            onChange={(event) => props.onHoverScaleChange(Number(event.currentTarget.value) / 100)}
          />
        </label>
      </div>

      {props.hideSourceSection ? null : (
        <div className="lc-component-edit-panel__section">
          <h4>{t("construct.edit.source")}</h4>
          <ConstructMonacoEditor
            className="lc-component-edit-panel__source lc-component-edit-panel__source--monaco"
            value={props.sourceCode}
            onChange={props.onSourceCodeChange}
            height="280px"
            documentId={props.documentId ?? `panel-${props.panelTitle}`}
            languageInput={{
              visualKind: props.sourceVisualKind,
              filename: props.sourceFilename,
            }}
          />
        </div>
      )}

      <div className="lc-component-edit-panel__actions">
        <button type="button" className="lc-pill-button lc-component-edit-panel__apply" onClick={props.onApply}>
          {t("construct.edit.apply")}
        </button>
        <button type="button" className="lc-pill-button" onClick={props.onCancel}>
          {t("construct.edit.cancel")}
        </button>
      </div>
    </aside>
  );
}
