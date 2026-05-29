import { cn } from "@/lib/utils";
import ConstructArtboardToolbar from "@/features/lavashconstruct/artboard/ui/ConstructArtboardToolbar";
import ConstructArtboardToolPopoverPanel from "@/features/lavashconstruct/artboard/ui/ConstructArtboardToolPopoverPanel";
import ConstructRailSearchPanel from "@/features/lavashconstruct/workspace/ui/ConstructRailSearchPanel";
import ConstructBottomPanel from "@/features/lavashconstruct/workspace/ui/ConstructBottomPanel";
import ConstructArtboardBoard from "@/features/lavashconstruct/artboard/ui/ConstructArtboardBoard";
import ComponentEditPanel from "@/features/lavashconstruct/artboard/ui/ComponentEditPanel";
import ConstructProjectViewBar from "@/features/lavashconstruct/project/ui/ConstructProjectViewBar";
import ConstructWorkspaceBrowserSplit from "@/features/lavashconstruct/workspace/ui/ConstructWorkspaceBrowserSplit";
import type { ArtboardPanel } from "@/features/lavashconstruct/artboard/ui/types";
import type { ConstructEditableState } from "@/features/lavashconstruct/artboard/ui/types";
import type { EditCssVarsState } from "@/features/lavashconstruct/sync";
import { useI18n } from "@/i18n/context";
import {
  DEFAULT_EDIT_SOURCE,
  resolvePanelEditVisualKind,
} from "@/features/lavashconstruct/workspace/model/constructWorkspaceUtils";

export type ConstructWorkspaceArtboardShellProps = {
  className?: string;
  showProjectViewBar: boolean;
  showProjectCode: boolean;
  ideBrowserOpen: boolean;
  browserSplitRatio: number;
  onBrowserSplitRatioChange: (ratio: number) => void;
  browserOverlaySuppressed: boolean;
  searchOpen: boolean;
  layersOpen: boolean;
  markMode: boolean;
  onToggleSearch: () => void;
  onToggleLayers: () => void;
  onToggleMark: () => void;
  onRegenerate: () => void;
  constructState: ConstructEditableState;
  artboardPanels: ArtboardPanel[];
  selectedPanelId: string | null;
  selectedPanelIds: string[];
  chatMarkedPanelId: string | null;
  artboardZoom: number;
  artboardPanX: number;
  artboardPanY: number;
  artboardMiddlePanHeld: boolean;
  activeInteractionPanelId: string | null;
  isLibraryDragOverArtboard: boolean;
  artboardBoardRef: React.RefObject<HTMLDivElement | null>;
  onArtboardViewportPointerDownCapture: React.ComponentProps<
    typeof ConstructArtboardBoard
  >["onArtboardViewportPointerDownCapture"];
  onArtboardViewportLostPointerCapture: React.ComponentProps<
    typeof ConstructArtboardBoard
  >["onArtboardViewportLostPointerCapture"];
  onArtboardDragOver: React.ComponentProps<typeof ConstructArtboardBoard>["onArtboardDragOver"];
  onArtboardDragEnter: React.ComponentProps<typeof ConstructArtboardBoard>["onArtboardDragEnter"];
  onArtboardDragLeave: React.ComponentProps<typeof ConstructArtboardBoard>["onArtboardDragLeave"];
  onArtboardDrop: React.ComponentProps<typeof ConstructArtboardBoard>["onArtboardDrop"];
  onReplaceSelection: (ids: string[]) => void;
  onPanelPointerDown: React.ComponentProps<typeof ConstructArtboardBoard>["onPanelPointerDown"];
  onPanelMarkRequest: React.ComponentProps<typeof ConstructArtboardBoard>["onPanelMarkRequest"];
  onPanelResizePointerDown: React.ComponentProps<typeof ConstructArtboardBoard>["onPanelResizePointerDown"];
  onPanelRequestEdit: React.ComponentProps<typeof ConstructArtboardBoard>["onPanelRequestEdit"];
  onPanelContextMenu: React.ComponentProps<typeof ConstructArtboardBoard>["onPanelContextMenu"];
  onArtboardCanvasContextMenu: React.ComponentProps<typeof ConstructArtboardBoard>["onArtboardCanvasContextMenu"];
  onSelectPanel: (id: string) => void;
  onFocusPanel: (id: string) => void;
  onReorderPanels: (orderedIds: string[]) => void;
  onReorderCompositionPanels: (parentBoardId: string, orderedIds: string[]) => void;
  onToggleVisible: (id: string) => void;
  onToggleLocked: (id: string) => void;
  onLayerUp: (id: string) => void;
  onLayerDown: (id: string) => void;
  onLayerFront: (id: string) => void;
  onLayerBack: (id: string) => void;
  onRemovePanel: (id: string) => void;
  editingPanel: ArtboardPanel | null;
  editSourceCode: string;
  editCssVars: EditCssVarsState;
  editOpacity: number;
  editBlurPx: number;
  editBorderRadiusPx: number;
  editHoverScale: number;
  onEditSourceCodeChange: (value: string) => void;
  onCssVarChange: (name: string, value: string) => void;
  onOpacityChange: (value: number) => void;
  onBlurPxChange: (value: number) => void;
  onBorderRadiusPxChange: (value: number) => void;
  onHoverScaleChange: (value: number) => void;
  onApplyEdits: () => void;
  onCancelEdits: () => void;
};

export default function ConstructWorkspaceArtboardShell({
  className,
  showProjectViewBar,
  showProjectCode,
  ideBrowserOpen,
  browserSplitRatio,
  onBrowserSplitRatioChange,
  browserOverlaySuppressed,
  searchOpen,
  layersOpen,
  markMode,
  onToggleSearch,
  onToggleLayers,
  onToggleMark,
  onRegenerate,
  constructState,
  artboardPanels,
  selectedPanelId,
  selectedPanelIds,
  chatMarkedPanelId,
  artboardZoom,
  artboardPanX,
  artboardPanY,
  artboardMiddlePanHeld,
  activeInteractionPanelId,
  isLibraryDragOverArtboard,
  artboardBoardRef,
  onArtboardViewportPointerDownCapture,
  onArtboardViewportLostPointerCapture,
  onArtboardDragOver,
  onArtboardDragEnter,
  onArtboardDragLeave,
  onArtboardDrop,
  onReplaceSelection,
  onPanelPointerDown,
  onPanelMarkRequest,
  onPanelResizePointerDown,
  onPanelRequestEdit,
  onPanelContextMenu,
  onArtboardCanvasContextMenu,
  onSelectPanel,
  onFocusPanel,
  onReorderPanels,
  onReorderCompositionPanels,
  onToggleVisible,
  onToggleLocked,
  onLayerUp,
  onLayerDown,
  onLayerFront,
  onLayerBack,
  onRemovePanel,
  editingPanel,
  editSourceCode,
  editCssVars,
  editOpacity,
  editBlurPx,
  editBorderRadiusPx,
  editHoverScale,
  onEditSourceCodeChange,
  onCssVarChange,
  onOpacityChange,
  onBlurPxChange,
  onBorderRadiusPxChange,
  onHoverScaleChange,
  onApplyEdits,
  onCancelEdits,
}: ConstructWorkspaceArtboardShellProps) {
  const { t } = useI18n();

  return (
    <div
      className={cn(
        "lavash-artboard-edit-shell",
        editingPanel && "lavash-artboard-edit-shell--editing",
        showProjectCode && "lavash-artboard-edit-shell--split",
        markMode && "lavash-artboard-edit-shell--mark-mode",
        ideBrowserOpen && "lavash-artboard-edit-shell--browser-split",
        className,
      )}
    >
      {showProjectViewBar ? <ConstructProjectViewBar /> : null}
      <ConstructArtboardToolbar
        searchOpen={searchOpen}
        layersOpen={layersOpen}
        markMode={markMode}
        onToggleSearch={onToggleSearch}
        onToggleLayers={onToggleLayers}
        onToggleMark={onToggleMark}
        onRegenerate={onRegenerate}
      />
      <ConstructWorkspaceBrowserSplit
        open={ideBrowserOpen}
        splitRatio={browserSplitRatio}
        onSplitRatioChange={onBrowserSplitRatioChange}
        overlaySuppressed={browserOverlaySuppressed}
      >
        <ConstructArtboardToolPopoverPanel
          isOpen={searchOpen}
          title={t("construct.rail.searchTitle")}
          className="lc-artboard-tool-popover--search"
        >
          <ConstructRailSearchPanel panels={artboardPanels} onSelectPanel={onSelectPanel} onFocusPanel={onFocusPanel} />
        </ConstructArtboardToolPopoverPanel>
        <ConstructArtboardToolPopoverPanel
          isOpen={layersOpen}
          title={t("construct.layers.title")}
          className="lc-artboard-tool-popover--layers"
          bodyClassName="lc-layers-drawer__body"
        >
          <ConstructBottomPanel
            artboardPanels={artboardPanels}
            selectedPanelId={selectedPanelId}
            onSelectPanel={onSelectPanel}
            onReorderPanels={onReorderPanels}
            onReorderCompositionPanels={onReorderCompositionPanels}
            onToggleVisible={onToggleVisible}
            onToggleLocked={onToggleLocked}
            onLayerUp={onLayerUp}
            onLayerDown={onLayerDown}
            onLayerFront={onLayerFront}
            onLayerBack={onLayerBack}
            onRemovePanel={onRemovePanel}
            onFocusPanel={onFocusPanel}
          />
        </ConstructArtboardToolPopoverPanel>
        {markMode ? (
          <div className="lc-mark-mode-hint" role="status">
            {t("construct.rail.markModeHint")}
          </div>
        ) : null}
        <ConstructArtboardBoard
          isArtboardGridDotsVisible={constructState.isArtboardGridDotsVisible}
          artboardZoom={artboardZoom}
          artboardPanX={artboardPanX}
          artboardPanY={artboardPanY}
          artboardMiddlePanHeld={artboardMiddlePanHeld}
          onArtboardViewportPointerDownCapture={onArtboardViewportPointerDownCapture}
          onArtboardViewportLostPointerCapture={onArtboardViewportLostPointerCapture}
          isLibraryDragOverArtboard={isLibraryDragOverArtboard}
          onArtboardDragOver={onArtboardDragOver}
          onArtboardDragEnter={onArtboardDragEnter}
          onArtboardDragLeave={onArtboardDragLeave}
          onArtboardDrop={onArtboardDrop}
          artboardPanels={artboardPanels}
          selectedPanelId={selectedPanelId}
          selectedPanelIds={selectedPanelIds}
          markedPanelId={chatMarkedPanelId}
          markMode={markMode}
          activeInteractionPanelId={activeInteractionPanelId}
          artboardBoardRef={artboardBoardRef}
          onReplaceSelection={onReplaceSelection}
          onPanelPointerDown={onPanelPointerDown}
          onPanelMarkRequest={onPanelMarkRequest}
          onPanelResizePointerDown={onPanelResizePointerDown}
          isMainMode={false}
          mainPanelDensity={constructState.mainPanelDensity}
          isMainAdaptiveLayoutEnabled={constructState.isMainAdaptiveLayoutEnabled}
          isMainCinematicBackdropEnabled={constructState.isMainCinematicBackdropEnabled}
          showWindowDragRail={true}
          onPanelRequestEdit={onPanelRequestEdit}
          onPanelContextMenu={onPanelContextMenu}
          onArtboardCanvasContextMenu={onArtboardCanvasContextMenu}
        />
      </ConstructWorkspaceBrowserSplit>

      {editingPanel ? (
        <ComponentEditPanel
          isOpen
          panelTitle={editingPanel.title}
          hideSourceSection={Boolean(editingPanel.constructWidgetId)}
          sourceCode={editSourceCode}
          sourceVisualKind={resolvePanelEditVisualKind(
            editingPanel,
            editSourceCode.trim() || DEFAULT_EDIT_SOURCE,
          )}
          sourceFilename={editingPanel.title}
          documentId={editingPanel.id}
          cssVars={editCssVars}
          opacity={editOpacity}
          blurPx={editBlurPx}
          borderRadiusPx={editBorderRadiusPx}
          hoverScale={editHoverScale}
          onSourceCodeChange={onEditSourceCodeChange}
          onCssVarChange={onCssVarChange}
          onOpacityChange={onOpacityChange}
          onBlurPxChange={onBlurPxChange}
          onBorderRadiusPxChange={onBorderRadiusPxChange}
          onHoverScaleChange={onHoverScaleChange}
          onApply={onApplyEdits}
          onCancel={onCancelEdits}
        />
      ) : null}
    </div>
  );
}
