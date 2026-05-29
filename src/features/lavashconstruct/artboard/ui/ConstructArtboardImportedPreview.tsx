import type { PointerEvent as ReactPointerEvent } from "react";
import { useI18n } from "@/i18n/context";
import { buildImportedSandboxDocument } from "@/features/lavashconstruct/artboard/model/import";
import type { ArtboardPanel } from "@/features/lavashconstruct/artboard/ui/types";
import {
  IMPORTED_PREVIEW_IFRAME_SANDBOX,
  importedIframeKey,
} from "@/features/lavashconstruct/artboard/ui/artboardBoardPointerUtils";

export function buildImportedHtmlPreviewDoc(panel: ArtboardPanel): string | null {
  return buildImportedSandboxDocument(panel);
}

type ConstructArtboardImportedPreviewProps = {
  panel: ArtboardPanel;
};

export default function ConstructArtboardImportedPreview({
  panel,
}: ConstructArtboardImportedPreviewProps) {
  const { t } = useI18n();
  const importedDoc = buildImportedHtmlPreviewDoc(panel);

  const stopPointerPropagation = (event: ReactPointerEvent) => {
    event.stopPropagation();
  };

  if (importedDoc) {
    return (
      <div
        className="lc-real-component-wrap lc-imported-content-wrap"
        onPointerDown={stopPointerPropagation}
      >
        <iframe
          key={importedIframeKey(panel.id, importedDoc)}
          className="lc-imported-sandbox-frame"
          data-panel-id={panel.id}
          aria-label={t("construct.artboard.preview", { title: panel.title })}
          referrerPolicy="no-referrer"
          sandbox={IMPORTED_PREVIEW_IFRAME_SANDBOX}
          srcDoc={importedDoc}
        />
      </div>
    );
  }

  return (
    <div
      className="lc-real-component-wrap lc-imported-content-wrap"
      onPointerDown={stopPointerPropagation}
    >
      <pre className="lc-imported-text">{panel.importedTextContent?.trim() || "—"}</pre>
    </div>
  );
}
