import type { ConstructEditMode } from "@/features/lavashconstruct/shared/model/types";

export type MainPanelDensity = "compact" | "balanced" | "spacious";

export type ConstructEditableState = {
  constructEditMode: ConstructEditMode;
  magneticThreshold: number;
  isPreviewAttachmentEnabled: boolean;
  isDockZonesHighlightEnabled: boolean;
  isCollisionAvoidanceEnabled: boolean;
  isMiniPlayerIdle: boolean;
  /** Поле крапок на безкінечному артборді. */
  isArtboardGridDotsVisible: boolean;
  /** Магнітне прилипання до інших панелей під час драгу. */
  isPanelAlignmentSnapEnabled: boolean;
  isMiniShapeMorphingEnabled: boolean;
  isMiniReactiveBackgroundEnabled: boolean;
  isMiniAutoSnapEdgesEnabled: boolean;
  isMainAdaptiveLayoutEnabled: boolean;
  isMainCinematicBackdropEnabled: boolean;
  isMainDockAutoSnapEnabled: boolean;
  mainPanelDensity: MainPanelDensity;
};

export type ArtboardPanel = {
  id: string;
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  isVisible: boolean;
  isLocked: boolean;
  lockAspectRatio: boolean;
  opacity?: number;
  blurPx?: number;
  borderRadiusPx?: number;
  backgroundColor?: string;
  isNeonGlowEnabled?: boolean;
  neonGlow?: number;
  neonGlowColor?: string;
  isShadowEnabled?: boolean;
  shadowX?: number;
  shadowY?: number;
  shadowBlur?: number;
  shadowSpread?: number;
  shadowOpacity?: number;
  shadowColor?: string;
  edgeGlow?: number;
  hoverScale?: number;
  /** Градуси; крутимо на слоті артборду (не пишемо в pasted JSX). */
  rotationDeg?: number;
  transitionMs?: number;
  transitionCurve?: "ease" | "ease-in-out" | "linear" | "cubic-bezier(0.22, 1, 0.36, 1)" | "cubic-bezier(0.22, 1, 0.42, 1)";
  importedSourceKind?: "text" | "image" | "file";
  importedVisualKind?: "plain-text" | "html" | "css" | "jsx";
  importedMimeType?: string;
  importedTextContent?: string;
  importedDataUrl?: string;
  importedSandboxHtmlDoc?: string;
  importWarnings?: string[];
  importedCssPreviewMarkup?: string;
  importedHtmlPreviewExtraCss?: string;
  /** id батьківської панелі, коли всередині PlayerBoard (тільки один рівень вкладеності). */
  parentId?: string;
  /** Позначає root-панель як контейнер композиційної дошки. */
  isBoardContainer?: boolean;
  /** Позиція всередині inner-зони дошки, коли заданий `parentId`. */
  localX?: number;
  localY?: number;
  /** Кліпати дочірні панелі по межах inner дошки (візуал). */
  clipChildren?: boolean;
  /** Вбудований lc-віджет (типу shadcn/ui); див. `constructShadcnWidgetRegistry`. */
  constructWidgetId?: string;
  /** Акцент для shadcn lc-віджетів (кнопки, слайдер, таби); якщо пусто — тягнемо з теми. */
  constructWidgetAccentColor?: string;
  /** Якщо задано, `importedTextContent` синкається з Code scratch-вкладкою з цим id (лайв під час редагу). */
  linkedScratchTabId?: string;
  /** Відносний шлях у відкритому проєкті; синкається з редактором файлу проєкту. */
  linkedProjectFilePath?: string;
};
