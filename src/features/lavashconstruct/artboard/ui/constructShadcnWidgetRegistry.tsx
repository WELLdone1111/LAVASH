import type { ReactNode } from "react";
import { translateBare } from "@/i18n/translateBare";

/** Раніше тут були демо-віджети; каталог прибрано — плеєрний UI згодом з локального ШІ / webview. */
export const CONSTRUCT_SHADCN_WIDGET_IDS = [] as const;

export type ConstructShadcnWidgetId = (typeof CONSTRUCT_SHADCN_WIDGET_IDS)[number];

const SHADCN_WIDGET_SET: ReadonlySet<string> = new Set(CONSTRUCT_SHADCN_WIDGET_IDS);

export function isConstructShadcnWidgetId(id: string | undefined): id is ConstructShadcnWidgetId {
  return typeof id === "string" && SHADCN_WIDGET_SET.has(id);
}

export function renderConstructShadcnWidget(widgetId: string, _instanceKey?: string): ReactNode {
  return (
    <div className="lc-real-component-note" aria-label={widgetId}>
      {translateBare("construct.widget.unavailable")}
    </div>
  );
}
