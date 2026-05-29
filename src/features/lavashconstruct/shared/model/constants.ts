import type { AdvancedExportKind, ExportFormat, ConstructEditMode } from "@/features/lavashconstruct/shared/model/types";

export const CONSTRUCT_SETTINGS_STORAGE_KEY = "lavash.construct.settings.v1";
/** v3: порожній артборд за замовчуванням; збереження з v2 при першому відкритті скидають панелі один раз. */
export const CONSTRUCT_SETTINGS_SCHEMA_VERSION = 3;

export const DEFAULT_CONSTRUCT_MODE: ConstructEditMode = "main";
export const DEFAULT_MAGNETIC_THRESHOLD = 18;

/** Діапазон зуму артборду (×1.5 від базових 0.35…2.75). */
export const ARTBOARD_ZOOM_MIN = 0.35 / 1.5;
export const ARTBOARD_ZOOM_MAX = 2.75 * 1.5;
/** Множник wheel-дельти для pinch / Ctrl+wheel зума (натуральний scale). */
export const ARTBOARD_ZOOM_WHEEL_FACTOR = 0.00185;
/** Пікселів на «лінію», коли WheelEvent у режимі DOM_DELTA_LINE (клік колеса). */
export const ARTBOARD_PAN_WHEEL_LINE_PX = 24;

/** Паддінг (world px) навколо панелей при «вмістити в екран». */
export const ARTBOARD_PAD_PX = 120;
/** Мінімальний спан осі (world px), коли контент крихітний (одна мала панель). */
export const ARTBOARD_MIN_SPAN_PX = 400;
/** Фолбек сайз артборду, коли панелей нуль (world px). */
export const ARTBOARD_EMPTY_FALLBACK_W = 1600;
export const ARTBOARD_EMPTY_FALLBACK_H = 1000;
/** Інсет всередині в’юпорту при fit всіх панелей (screen px). */
export const ARTBOARD_FIT_MARGIN_PX = 48;

/**
 * Фіксований «інфініт»-спан артборду (world px, квадрат). Pan клампиться, щоб поле
 * заповнювало в’юпорт; шар крапок має збігатись з (--lavash-artboard-dot-field в CSS).
 */
export const ARTBOARD_INFINITE_PX = 8192;

export const DEFAULT_PRESET_VERSIONS = ["v1.0.0", "v1.0.1", "v1.1.0"] as const;

export const DEFAULT_EXPORT_FORMAT: ExportFormat = ".lavash-theme";
export const DEFAULT_ADVANCED_EXPORT: AdvancedExportKind = "OBS Studio Plugin";
