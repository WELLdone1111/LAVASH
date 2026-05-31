import { useMemo } from "react";
import { useI18n } from "@/i18n/context";
import {
  ARTBOARD_ZOOM_MAX,
  ARTBOARD_ZOOM_MIN,
} from "@/features/lavashconstruct/shared/model/constants";

type ConstructArtboardZoomBadgeProps = {
  artboardZoom: number;
};

export function formatArtboardZoomPercent(artboardZoom: number): string {
  const z = Math.max(ARTBOARD_ZOOM_MIN, Math.min(ARTBOARD_ZOOM_MAX, artboardZoom));
  const pct = Math.round(((z - ARTBOARD_ZOOM_MIN) / (1 - ARTBOARD_ZOOM_MIN)) * 100);
  return `${Math.max(0, pct)}%`;
}

function artboardZoomDisplayPercent(artboardZoom: number): number {
  const z = Math.max(ARTBOARD_ZOOM_MIN, Math.min(ARTBOARD_ZOOM_MAX, artboardZoom));
  return Math.max(0, Math.round(((z - ARTBOARD_ZOOM_MIN) / (1 - ARTBOARD_ZOOM_MIN)) * 100));
}

/** Статус масштабу артборда (pill у правому нижньому куті). */
export default function ConstructArtboardZoomBadge({ artboardZoom }: ConstructArtboardZoomBadgeProps) {
  const { t } = useI18n();
  const label = useMemo(() => formatArtboardZoomPercent(artboardZoom), [artboardZoom]);
  const pct = useMemo(() => artboardZoomDisplayPercent(artboardZoom), [artboardZoom]);

  return (
    <div className="lavash-artboard-zoom-badge" role="status" aria-live="polite" aria-label={t("construct.artboard.zoomPct", { pct })}>
      {label}
    </div>
  );
}
