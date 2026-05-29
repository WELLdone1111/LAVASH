import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useI18n, type Locale } from "@/i18n/context";
import {
  COLOR_THEME_IDS,
  WALLPAPER_BACKGROUNDS,
  WALLPAPER_IDS,
  type ColorThemeId,
  type WallpaperId,
} from "@/features/lavashconstruct/shared/model/appearanceCatalog";
import {
  applyColorTheme,
  applyWallpaper,
  readStoredColorThemeId,
  readStoredWallpaperId,
} from "@/features/lavashconstruct/shared/model/applyAppearance";
import {
  BasicsSettingsCard,
  BasicsSettingsRow,
  BasicsSettingsSection,
  BasicsSettingsSelect,
} from "@/features/lavashconstruct/settings/ui/ConstructBasicsSettings";
import ConstructModelPanel from "@/features/lavashconstruct/settings/ui/ConstructModelPanel";
import "./ConstructBasicsSettings.css";
import "./ConstructModelPanel.css";

export type ConstructSettingsSection = "basics" | "models" | "account";

type ConstructSettingsPanelProps = {
  artboardSection: ReactNode;
  section: ConstructSettingsSection;
  onSectionChange: (section: ConstructSettingsSection) => void;
};

const SECTIONS: ConstructSettingsSection[] = ["basics", "models", "account"];

const LOCALE_OPTIONS: { id: Locale; labelKey: string }[] = [
  { id: "uk", labelKey: "settings.language.uk" },
  { id: "en", labelKey: "settings.language.en" },
  { id: "ru", labelKey: "settings.language.ru" },
];

export default function ConstructSettingsPanel({
  artboardSection,
  section,
  onSectionChange,
}: ConstructSettingsPanelProps) {
  const { t, locale, setLocale } = useI18n();
  const [colorThemeId, setColorThemeId] = useState<ColorThemeId>(() => readStoredColorThemeId());
  const [wallpaperId, setWallpaperId] = useState<WallpaperId>(() => readStoredWallpaperId());

  const sectionLabel = (id: ConstructSettingsSection) => {
    switch (id) {
      case "basics":
        return t("construct.settings.section.basics");
      case "models":
        return t("construct.model.title");
      case "account":
        return t("construct.settings.section.account");
    }
  };

  const themeOptions = COLOR_THEME_IDS.map((id) => ({
    value: id,
    label: t(`appearance.theme.${id}`),
  }));

  const languageOptions = LOCALE_OPTIONS.map((opt) => ({
    value: opt.id,
    label: t(opt.labelKey),
  }));

  return (
    <div className={cn("lc-settings-panel", section === "models" && "lc-settings-panel--models")}>
      <nav className="lc-settings-panel__nav" aria-label={t("construct.settings.sectionsAria")}>
        {SECTIONS.map((id) => (
          <button
            key={id}
            type="button"
            className={cn(
              "lc-settings-panel__nav-btn",
              section === id && "lc-settings-panel__nav-btn--active",
            )}
            aria-current={section === id ? "true" : undefined}
            onClick={() => onSectionChange(id)}
          >
            {sectionLabel(id)}
          </button>
        ))}
      </nav>
      <div className="lc-settings-panel__content">
        {section === "basics" ? (
          <BasicsSettingsSection>
            <BasicsSettingsCard>
              <BasicsSettingsRow
                label={t("settings.basics.theme")}
                description={t("settings.basics.themeDesc")}
              >
                <BasicsSettingsSelect
                  id="lc-settings-theme"
                  value={colorThemeId}
                  ariaLabel={t("settings.basics.theme")}
                  options={themeOptions}
                  onChange={(next) => {
                    setColorThemeId(next);
                    applyColorTheme(next);
                  }}
                />
              </BasicsSettingsRow>
              <BasicsSettingsRow
                label={t("settings.basics.language")}
                description={t("settings.basics.languageDesc")}
              >
                <BasicsSettingsSelect
                  id="lc-settings-language"
                  value={locale}
                  ariaLabel={t("settings.basics.language")}
                  options={languageOptions}
                  onChange={setLocale}
                />
              </BasicsSettingsRow>
            </BasicsSettingsCard>

            <BasicsSettingsCard>
              <BasicsSettingsRow
                label={t("construct.settings.section.wallpapers")}
                description={t("appearance.wallpapers.lead")}
                stack
              >
                <div className="lc-settings-swatch-grid lc-settings-swatch-grid--wallpapers" role="list">
                  {WALLPAPER_IDS.map((id) => {
                    const active = wallpaperId === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        role="listitem"
                        className={cn("lc-settings-swatch", active && "lc-settings-swatch--active")}
                        aria-pressed={active}
                        title={t(`appearance.wallpaper.${id}`)}
                        onClick={() => {
                          setWallpaperId(id);
                          applyWallpaper(id);
                        }}
                      >
                        <span
                          className="lc-settings-swatch__preview lc-settings-swatch__preview--wallpaper"
                          style={{ background: WALLPAPER_BACKGROUNDS[id] }}
                          aria-hidden
                        />
                        <span className="lc-settings-swatch__label">{t(`appearance.wallpaper.${id}`)}</span>
                      </button>
                    );
                  })}
                </div>
              </BasicsSettingsRow>
            </BasicsSettingsCard>

            <BasicsSettingsCard className="lc-basics-settings__card--artboard">
              <BasicsSettingsRow
                label={t("construct.settings.section.artboard")}
                description={t("settings.basics.artboardDesc")}
                stack
              >
                <div className="lavash-artboard-settings-list">{artboardSection}</div>
              </BasicsSettingsRow>
            </BasicsSettingsCard>
          </BasicsSettingsSection>
        ) : null}

        {section === "models" ? (
          <div className="lc-settings-panel__models">
            <ConstructModelPanel />
          </div>
        ) : null}

        {section === "account" ? (
          <BasicsSettingsSection>
            <BasicsSettingsCard>
              <p className="lc-settings-section__lead lc-settings-section__lead--in-card">
                {t("construct.settings.account.empty")}
              </p>
            </BasicsSettingsCard>
          </BasicsSettingsSection>
        ) : null}
      </div>
    </div>
  );
}
