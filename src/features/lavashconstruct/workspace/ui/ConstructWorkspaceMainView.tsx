import { useState, type ComponentProps, type DragEvent as ReactDragEvent, type Dispatch, type ReactNode, type RefObject, type SetStateAction } from "react";
import type { ConstructSectionId } from "@/features/lavashconstruct/workspace/ui/ConstructSectionRail";
import ConstructArtboardBoard from "@/features/lavashconstruct/artboard/ui/ConstructArtboardBoard";
import ConstructWorkspaceArtboardShell from "@/features/lavashconstruct/workspace/ui/ConstructWorkspaceArtboardShell";
import type { ConstructUnifiedLayout } from "@/features/lavashconstruct/workspace/model/constructUnifiedLayoutStorage";
import { dockPulseDataAttr } from "@/features/dock/model/workspaceDockPulse";
import type { LavashConstructWorkspaceProps } from "@/features/lavashconstruct/shared/model/types";
import type { ConstructLibraryItem } from "@/features/lavashconstruct/shared/model/libraryItem";
import type { AnalyzedClipboardImport } from "@/features/lavashconstruct/artboard/model/import";
import { panelUsesAltEditMode } from "@/features/lavashconstruct/artboard/model/artboardPanelHitTest";
import type { ArtboardPanel, ConstructEditableState } from "@/features/lavashconstruct/artboard/ui/types";
import type { EditCssVarsState } from "@/features/lavashconstruct/sync";
import ConstructSettingsPanel from "@/features/lavashconstruct/settings/ui/ConstructSettingsPanel";
import type { ConstructSettingsSection } from "@/features/lavashconstruct/settings/ui/ConstructSettingsPanel";
import ConstructSettingsWorkspaceDrawer from "@/features/lavashconstruct/workspace/ui/ConstructSettingsWorkspaceDrawer";
import ConstructWorkspaceRail from "@/features/lavashconstruct/workspace/ui/ConstructWorkspaceRail";
import IdeExpandedTimerChip from "@/shared/components/IdeExpandedTimerChip";
import LavashDevToolsButton from "@/features/lavashconstruct/project/ui/LavashDevToolsButton";
import ConstructDevToolsPanel from "@/features/lavashconstruct/project/ui/ConstructDevToolsPanel";
import LavashResourcesButton from "@/features/resources/ui/LavashResourcesButton";
import "@/features/ide-browser/ui/ConstructIdeBrowserPanel.css";
import ConstructProjectCodePanel from "@/features/lavashconstruct/project/ui/ConstructProjectCodePanel";
import ConstructExternalChangeBanner from "@/features/lavashconstruct/project/ui/ConstructExternalChangeBanner";
import ConstructChatPanel from "@/features/lavashconstruct/chat/ui/ConstructChatPanel";
import {
  ConstructArtboardCanvasContextMenu,
  ConstructArtboardPanelContextMenu,
} from "@/features/lavashconstruct/artboard/ui/ConstructArtboardContextMenu";
import { canPanelEditSourceCode } from "@/features/lavashconstruct/artboard/model/artboardPanelScreenAnchor";
import ConstructArtboardFloatingCodeEditor from "@/features/lavashconstruct/artboard/ui/ConstructArtboardFloatingCodeEditor";
import ConstructWorkspaceSmartPasteDialog from "@/features/lavashconstruct/workspace/ui/ConstructWorkspaceSmartPasteDialog";
import {
  canCutSelection,
  copyPanelsFromSelection,
  resolveCurrentPanelIds,
} from "@/features/edit-menu/model/editMenuPanelActions";
import {
  cloneConstructLibraryItem,
  resolvePanelEditVisualKind,
} from "@/features/lavashconstruct/workspace/model/constructWorkspaceUtils";
import { dispatchConstructChatMarkState } from "@/features/lavashconstruct/workspace/model/constructMarkBus";
import { runEditMenuAction } from "@/features/edit-menu/model/editMenuBus";
import { useI18n } from "@/i18n/context";
import { cn } from "@/lib/utils";

type ArtboardMenuState =
  | { kind: "canvas"; x: number; y: number; worldX: number; worldY: number }
  | { kind: "panel"; x: number; y: number; panelId: string }
  | null;

export type ConstructWorkspaceMainViewProps = {
  animationState: LavashConstructWorkspaceProps["animationState"];
  dockPulseKey: LavashConstructWorkspaceProps["dockPulseKey"];
  workspaceRef: RefObject<HTMLElement | null>;
  shellRef: RefObject<HTMLDivElement | null>;
  constructLayout: ConstructUnifiedLayout;
  onChatSplitPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void;
  userLibOpen: boolean;
  projectOpen: boolean;
  isArtboardSettingsOpen: boolean;
  userLibraryItems: ConstructLibraryItem[];
  handleSelectSection: (id: ConstructSectionId) => void;
  setIsArtboardSettingsOpen: Dispatch<SetStateAction<boolean>>;
  handleNewLavashDocument: () => void;
  handleOpenLavashDocumentPicker: () => void;
  handleOpenProjectFolder: () => void;
  handleOpenLavashDocumentFromProject: (relativePath: string) => void;
  setUserLibraryItems: Dispatch<SetStateAction<ConstructLibraryItem[]>>;
  handleAddLibraryPanel: (item: ConstructLibraryItem, targetWorld?: { x: number; y: number }) => void;
  showProjectCode: boolean;
  showProjectDesign: boolean;
  showProjectViewBar: boolean;
  handleReloadLavashDocument: () => void;
  ideBrowserOpen: boolean;
  browserSplitRatio: number;
  setBrowserSplitRatio: (ratio: number) => void;
  searchOpen: boolean;
  layersOpen: boolean;
  markMode: boolean;
  handleToggleSearch: () => void;
  handleToggleLayers: () => void;
  handleToggleMark: () => void;
  handleRegenerate: () => void;
  constructState: ConstructEditableState;
  artboardPanels: ArtboardPanel[];
  selectedPanelId: string | null;
  selectedPanelIds: string[];
  chatMarkedPanelId: string | null;
  artboardZoom: number;
  artboardPan: { x: number; y: number };
  middlePanHeld: boolean;
  activeInteractionPanelId: string | null;
  isLibraryDragOverArtboard: boolean;
  artboardBoardRef: RefObject<HTMLDivElement | null>;
  onArtboardViewportPointerDownCapture: ComponentProps<
    typeof ConstructWorkspaceArtboardShell
  >["onArtboardViewportPointerDownCapture"];
  onArtboardViewportLostPointerCapture: ComponentProps<
    typeof ConstructWorkspaceArtboardShell
  >["onArtboardViewportLostPointerCapture"];
  handleArtboardDragOver: (event: ReactDragEvent<HTMLDivElement>) => void;
  handleArtboardDragEnter: (event: ReactDragEvent<HTMLDivElement>) => void;
  handleArtboardDragLeave: (event: ReactDragEvent<HTMLDivElement>) => void;
  handleArtboardDrop: (event: ReactDragEvent<HTMLDivElement>) => void;
  setSelectedPanelId: (id: string | null) => void;
  setSelectedPanelIds: (ids: string[] | ((current: string[]) => string[])) => void;
  focusPanelInView: (panelId: string) => void;
  reorderArtboardPanels: (orderedIds: string[]) => void;
  reorderCompositionPanels: (parentBoardId: string, orderedIds: string[]) => void;
  toggleArtboardPanelVisible: (panelId: string) => void;
  toggleArtboardPanelLocked: (panelId: string) => void;
  moveArtboardPanelLayerUp: (panelId: string) => void;
  moveArtboardPanelLayerDown: (panelId: string) => void;
  moveArtboardPanelToFront: (panelId: string) => void;
  moveArtboardPanelToBack: (panelId: string) => void;
  removeArtboardPanel: (panelId: string) => void;
  handleMarkPanel: (panel: ArtboardPanel) => void;
  onPanelPointerDown: ComponentProps<typeof ConstructArtboardBoard>["onPanelPointerDown"];
  onPanelResizePointerDown: ComponentProps<typeof ConstructArtboardBoard>["onPanelResizePointerDown"];
  artboardMenu: ArtboardMenuState;
  setArtboardMenu: Dispatch<SetStateAction<ArtboardMenuState>>;
  handleArtboardCanvasContextMenu: (clientX: number, clientY: number) => void;
  editingPanel: ArtboardPanel | null;
  editSourceCode: string;
  editCssVars: EditCssVarsState;
  editOpacity: number;
  editBlurPx: number;
  editBorderRadiusPx: number;
  editHoverScale: number;
  setEditSourceCode: (code: string) => void;
  setEditCssVars: Dispatch<SetStateAction<EditCssVarsState>>;
  setEditOpacity: (value: number) => void;
  setEditBlurPx: (value: number) => void;
  setEditBorderRadiusPx: (value: number) => void;
  setEditHoverScale: (value: number) => void;
  applyComponentEdits: () => void;
  cancelComponentEdits: () => void;
  settingsSection: ConstructSettingsSection;
  setSettingsSection: (section: ConstructSettingsSection) => void;
  artboardSettingsSection: ReactNode;
  smartPaste: AnalyzedClipboardImport | null;
  smartPasteMarkupDraft: string;
  smartPasteTextareaRef: RefObject<HTMLTextAreaElement | null>;
  setSmartPaste: Dispatch<SetStateAction<AnalyzedClipboardImport | null>>;
  setSmartPasteMarkupDraft: Dispatch<SetStateAction<string>>;
  pasteImportedItemsToArtboardRef: RefObject<
    (items: ConstructLibraryItem[], targetWorld?: { x: number; y: number }) => void
  >;
  handleFormatCanvasSelection: () => void;
  handleAddCodePanelAtMenu: () => void;
  openUserLibDrawer: () => void;
  closeArtboardMenu: () => void;
  contextMenuPanel: ArtboardPanel | null;
  handleContextMenuDuplicate: (panelId: string) => void;
  handleContextMenuDelete: (panelId: string) => void;
  handleAskLavashFromContextMenu: (panel: ArtboardPanel) => void;
  handleExportPanelSource: (panel: ArtboardPanel) => Promise<void>;
  handleCopyPanelAsImage: (panelId: string) => Promise<void>;
  handleDownloadPanelSource: (panel: ArtboardPanel) => void;
  handleRefreshPanelPreview: (panelId: string) => void;
  openEditPanel: (panelId: string) => void;
  openFloatingEditor: (panelId: string, anchor?: { x: number; y: number }) => void;
  expandChatPanel: () => void;
  floatingEdit: { panelId: string; anchorX: number; anchorY: number } | null;
  floatingPanel: ArtboardPanel | null;
  resolvePanelSourceForEdit: (panel: ArtboardPanel) => string;
  handleFloatingCodeChange: (panelId: string, newCode: string) => void;
  setFloatingEdit: Dispatch<
    SetStateAction<{ panelId: string; anchorX: number; anchorY: number } | null>
  >;
};

export default function ConstructWorkspaceMainView(props: ConstructWorkspaceMainViewProps) {
  const { t } = useI18n();
  const [devToolsOpen, setDevToolsOpen] = useState(false);
  const {
    animationState,
    dockPulseKey,
    workspaceRef,
    shellRef,
    constructLayout,
    onChatSplitPointerDown,
    userLibOpen,
    projectOpen,
    isArtboardSettingsOpen,
    userLibraryItems,
    handleSelectSection,
    setIsArtboardSettingsOpen,
    handleNewLavashDocument,
    handleOpenLavashDocumentPicker,
    handleOpenProjectFolder,
    handleOpenLavashDocumentFromProject,
    setUserLibraryItems,
    handleAddLibraryPanel,
    showProjectCode,
    showProjectDesign,
    showProjectViewBar,
    handleReloadLavashDocument,
    ideBrowserOpen,
    browserSplitRatio,
    setBrowserSplitRatio,
    searchOpen,
    layersOpen,
    markMode,
    handleToggleSearch,
    handleToggleLayers,
    handleToggleMark,
    handleRegenerate,
    constructState,
    artboardPanels,
    selectedPanelId,
    selectedPanelIds,
    chatMarkedPanelId,
    artboardZoom,
    artboardPan,
    middlePanHeld,
    activeInteractionPanelId,
    isLibraryDragOverArtboard,
    artboardBoardRef,
    onArtboardViewportPointerDownCapture,
    onArtboardViewportLostPointerCapture,
    handleArtboardDragOver,
    handleArtboardDragEnter,
    handleArtboardDragLeave,
    handleArtboardDrop,
    setSelectedPanelId,
    setSelectedPanelIds,
    focusPanelInView,
    reorderArtboardPanels,
    reorderCompositionPanels,
    toggleArtboardPanelVisible,
    toggleArtboardPanelLocked,
    moveArtboardPanelLayerUp,
    moveArtboardPanelLayerDown,
    moveArtboardPanelToFront,
    moveArtboardPanelToBack,
    removeArtboardPanel,
    handleMarkPanel,
    onPanelPointerDown,
    onPanelResizePointerDown,
    artboardMenu,
    setArtboardMenu,
    handleArtboardCanvasContextMenu,
    editingPanel,
    editSourceCode,
    editCssVars,
    editOpacity,
    editBlurPx,
    editBorderRadiusPx,
    editHoverScale,
    setEditSourceCode,
    setEditCssVars,
    setEditOpacity,
    setEditBlurPx,
    setEditBorderRadiusPx,
    setEditHoverScale,
    applyComponentEdits,
    cancelComponentEdits,
    settingsSection,
    setSettingsSection,
    artboardSettingsSection,
    smartPaste,
    smartPasteMarkupDraft,
    smartPasteTextareaRef,
    setSmartPaste,
    setSmartPasteMarkupDraft,
    pasteImportedItemsToArtboardRef,
    handleFormatCanvasSelection,
    handleAddCodePanelAtMenu,
    openUserLibDrawer,
    closeArtboardMenu,
    contextMenuPanel,
    handleContextMenuDuplicate,
    handleContextMenuDelete,
    handleAskLavashFromContextMenu,
    handleExportPanelSource,
    handleCopyPanelAsImage,
    handleDownloadPanelSource,
    handleRefreshPanelPreview,
    openEditPanel,
    openFloatingEditor,
    expandChatPanel,
    floatingEdit,
    floatingPanel,
    resolvePanelSourceForEdit,
    handleFloatingCodeChange,
    setFloatingEdit,
  } = props;

  return (
    <article
      ref={workspaceRef}
      className="lc-workspace"
      data-animation={animationState}
      {...dockPulseDataAttr(dockPulseKey)}
      onContextMenuCapture={(event) => {
        event.preventDefault();
      }}
    >
      <div
        ref={shellRef}
        className="lc-unified-shell"
        data-chat-collapsed={constructLayout.chatCollapsed ? "1" : undefined}
      >
        <ConstructWorkspaceRail
          userLibOpen={userLibOpen}
          projectOpen={projectOpen}
          isArtboardSettingsOpen={isArtboardSettingsOpen}
          userLibraryItems={userLibraryItems}
          onSelectSection={handleSelectSection}
          onToggleSettings={() => setIsArtboardSettingsOpen((open) => !open)}
          onNewDocument={handleNewLavashDocument}
          onOpenDocument={handleOpenLavashDocumentPicker}
          onOpenProjectFolder={handleOpenProjectFolder}
          onOpenLavashDocument={handleOpenLavashDocumentFromProject}
          onRemoveLibraryItem={(itemId) =>
            setUserLibraryItems((items) => items.filter((item) => item.id !== itemId))
          }
          onInsertLibraryItem={(item) => handleAddLibraryPanel(cloneConstructLibraryItem(item))}
        />

        <section
          className="lc-unified-cell lc-unified-shell__workspace lc-unified-shell__workspace--devtools-host"
          style={{ gridColumn: 2, gridRow: 1, minWidth: 0, minHeight: 0 }}
        >
          <div
            className={cn(
              "lc-unified-cell__body lc-unified-cell__body--flush",
              showProjectCode && showProjectDesign && "lc-design-code-split",
              showProjectCode && !showProjectDesign && "lc-design-code-split lc-design-code-split--code-only",
            )}
          >
            <ConstructExternalChangeBanner onReloadLavashDocument={handleReloadLavashDocument} />
            {showProjectDesign ? (
              <ConstructWorkspaceArtboardShell
                showProjectViewBar={showProjectViewBar}
                showProjectCode={showProjectCode}
                ideBrowserOpen={ideBrowserOpen}
                browserSplitRatio={browserSplitRatio}
                onBrowserSplitRatioChange={setBrowserSplitRatio}
                browserOverlaySuppressed={isArtboardSettingsOpen}
                searchOpen={searchOpen}
                layersOpen={layersOpen}
                markMode={markMode}
                onToggleSearch={handleToggleSearch}
                onToggleLayers={handleToggleLayers}
                onToggleMark={handleToggleMark}
                onRegenerate={handleRegenerate}
                constructState={constructState}
                artboardPanels={artboardPanels}
                selectedPanelId={selectedPanelId}
                selectedPanelIds={selectedPanelIds}
                chatMarkedPanelId={chatMarkedPanelId}
                artboardZoom={artboardZoom}
                artboardPanX={artboardPan.x}
                artboardPanY={artboardPan.y}
                artboardMiddlePanHeld={middlePanHeld}
                activeInteractionPanelId={activeInteractionPanelId}
                isLibraryDragOverArtboard={isLibraryDragOverArtboard}
                artboardBoardRef={artboardBoardRef}
                onArtboardViewportPointerDownCapture={onArtboardViewportPointerDownCapture}
                onArtboardViewportLostPointerCapture={onArtboardViewportLostPointerCapture}
                onArtboardDragOver={handleArtboardDragOver}
                onArtboardDragEnter={handleArtboardDragEnter}
                onArtboardDragLeave={handleArtboardDragLeave}
                onArtboardDrop={handleArtboardDrop}
                onSelectPanel={(id) => {
                  setSelectedPanelId(id);
                  setSelectedPanelIds([id]);
                }}
                onFocusPanel={focusPanelInView}
                onReorderPanels={reorderArtboardPanels}
                onReorderCompositionPanels={reorderCompositionPanels}
                onToggleVisible={toggleArtboardPanelVisible}
                onToggleLocked={toggleArtboardPanelLocked}
                onLayerUp={moveArtboardPanelLayerUp}
                onLayerDown={moveArtboardPanelLayerDown}
                onLayerFront={moveArtboardPanelToFront}
                onLayerBack={moveArtboardPanelToBack}
                onRemovePanel={removeArtboardPanel}
                onReplaceSelection={(ids) => {
                  setSelectedPanelIds(ids);
                  setSelectedPanelId(ids.length > 0 ? ids[ids.length - 1] : null);
                }}
                onPanelPointerDown={(event, panel, meta) => {
                  if (panelUsesAltEditMode(panel) && !meta?.moveModifierHeld && !markMode) {
                    if (!(event.ctrlKey || event.metaKey)) return;
                  }
                  if (markMode && !meta?.moveModifierHeld) {
                    handleMarkPanel(panel);
                    return;
                  }
                  onPanelPointerDown(event, panel, meta);
                  if (event.ctrlKey || event.metaKey || event.shiftKey) {
                    setSelectedPanelIds((current) => {
                      const exists = current.includes(panel.id);
                      if (exists) return current.filter((id) => id !== panel.id);
                      return [...current, panel.id];
                    });
                    setSelectedPanelId(panel.id);
                  } else if (meta?.moveModifierHeld || !panelUsesAltEditMode(panel)) {
                    setSelectedPanelIds([panel.id]);
                    setSelectedPanelId(panel.id);
                  }
                }}
                onPanelMarkRequest={handleMarkPanel}
                onPanelResizePointerDown={onPanelResizePointerDown}
                onPanelRequestEdit={(panel) => {
                  setSelectedPanelId(panel.id);
                  setSelectedPanelIds([panel.id]);
                  openEditPanel(panel.id);
                }}
                onPanelContextMenu={(event, panel) => {
                  setSelectedPanelId(panel.id);
                  setSelectedPanelIds([panel.id]);
                  setArtboardMenu({
                    kind: "panel",
                    x: event.clientX,
                    y: event.clientY,
                    panelId: panel.id,
                  });
                }}
                onArtboardCanvasContextMenu={handleArtboardCanvasContextMenu}
                editingPanel={editingPanel}
                editSourceCode={editSourceCode}
                editCssVars={editCssVars}
                editOpacity={editOpacity}
                editBlurPx={editBlurPx}
                editBorderRadiusPx={editBorderRadiusPx}
                editHoverScale={editHoverScale}
                onEditSourceCodeChange={setEditSourceCode}
                onCssVarChange={(name, value) => setEditCssVars((current) => ({ ...current, [name]: value }))}
                onOpacityChange={setEditOpacity}
                onBlurPxChange={setEditBlurPx}
                onBorderRadiusPxChange={setEditBorderRadiusPx}
                onHoverScaleChange={setEditHoverScale}
                onApplyEdits={applyComponentEdits}
                onCancelEdits={cancelComponentEdits}
              />
            ) : null}
            {showProjectCode ? <ConstructProjectCodePanel /> : null}
          </div>
          <footer className="lc-workspace-status" aria-label={t("status.ideExpandedShort")}>
            <IdeExpandedTimerChip expanded={animationState === "enter"} />
            <LavashDevToolsButton active={devToolsOpen} onToggle={() => setDevToolsOpen((open) => !open)} />
            <LavashResourcesButton />
          </footer>
          {devToolsOpen ? <ConstructDevToolsPanel onClose={() => setDevToolsOpen(false)} /> : null}
          <ConstructSettingsWorkspaceDrawer
            isOpen={isArtboardSettingsOpen}
            wide={settingsSection === "models"}
            onClose={() => setIsArtboardSettingsOpen(false)}
          >
            <ConstructSettingsPanel
              section={settingsSection}
              onSectionChange={setSettingsSection}
              artboardSection={artboardSettingsSection}
            />
          </ConstructSettingsWorkspaceDrawer>
        </section>

        <div
          role="separator"
          aria-orientation="vertical"
          aria-label={t("construct.split.chatWidth")}
          className="lc-unified-split lc-unified-split--col lc-unified-split--chat-seam"
          onPointerDown={onChatSplitPointerDown}
        />

        <section
          className="lc-unified-cell lc-unified-shell__chat"
          style={{
            minWidth: 0,
            minHeight: 0,
          }}
        >
          <div className="lc-unified-cell__body lc-unified-cell__body--flush">
            <ConstructChatPanel />
          </div>
        </section>
      </div>

      {smartPaste ? (
        <ConstructWorkspaceSmartPasteDialog
          smartPaste={smartPaste}
          markupDraft={smartPasteMarkupDraft}
          textareaRef={smartPasteTextareaRef}
          onMarkupDraftChange={setSmartPasteMarkupDraft}
          onClose={() => {
            setSmartPaste(null);
            setSmartPasteMarkupDraft("");
          }}
          onApplyItem={(item) => pasteImportedItemsToArtboardRef.current([item])}
        />
      ) : null}

      {artboardMenu?.kind === "canvas" ? (
        <ConstructArtboardCanvasContextMenu
          x={artboardMenu.x}
          y={artboardMenu.y}
          canFormat={Boolean(
            resolveCurrentPanelIds(selectedPanelIds, selectedPanelId).length > 0 &&
              artboardPanels.find((p) => p.id === resolveCurrentPanelIds(selectedPanelIds, selectedPanelId)[0])
                ?.importedTextContent?.trim(),
          )}
          onFormat={handleFormatCanvasSelection}
          onAddCodePanel={handleAddCodePanelAtMenu}
          onOpenUserLib={openUserLibDrawer}
          onClose={closeArtboardMenu}
        />
      ) : null}

      {artboardMenu?.kind === "panel" && contextMenuPanel ? (
        <ConstructArtboardPanelContextMenu
          x={artboardMenu.x}
          y={artboardMenu.y}
          elementName={contextMenuPanel.title}
          isLocked={Boolean(contextMenuPanel.isLocked)}
          isMarked={chatMarkedPanelId === contextMenuPanel.id}
          canEditCode={canPanelEditSourceCode(contextMenuPanel)}
          canCopy={copyPanelsFromSelection(artboardPanels, [contextMenuPanel.id]).length > 0}
          canCut={canCutSelection(artboardPanels, [contextMenuPanel.id])}
          canCopyAsHtml={Boolean(contextMenuPanel.importedTextContent?.trim())}
          canCopyAsCode={canPanelEditSourceCode(contextMenuPanel)}
          canCopyAsImage
          onCopy={() => {
            setSelectedPanelIds([contextMenuPanel.id]);
            setSelectedPanelId(contextMenuPanel.id);
            runEditMenuAction("copy");
          }}
          onCopyAsHtml={async () => {
            const text = contextMenuPanel.importedTextContent?.trim();
            if (!text) return;
            try {
              await navigator.clipboard.writeText(text);
            } catch {
              /* ignore */
            }
          }}
          onCopyAsCode={() => {
            void handleExportPanelSource(contextMenuPanel);
          }}
          onCopyAsImage={() => {
            void handleCopyPanelAsImage(contextMenuPanel.id);
          }}
          onCut={() => {
            setSelectedPanelIds([contextMenuPanel.id]);
            setSelectedPanelId(contextMenuPanel.id);
            runEditMenuAction("cut");
          }}
          onDuplicate={() => handleContextMenuDuplicate(contextMenuPanel.id)}
          onFocus={() => focusPanelInView(contextMenuPanel.id)}
          onFavourite={() => {
            if (chatMarkedPanelId === contextMenuPanel.id) {
              dispatchConstructChatMarkState({ panelId: null });
            } else {
              handleMarkPanel(contextMenuPanel);
            }
          }}
          onDelete={() => handleContextMenuDelete(contextMenuPanel.id)}
          onGenerate={() => {
            handleMarkPanel(contextMenuPanel);
            handleRegenerate();
            expandChatPanel();
          }}
          onMarkForChat={() => handleAskLavashFromContextMenu(contextMenuPanel)}
          onViewDetails={() => openEditPanel(contextMenuPanel.id)}
          onViewCode={() => {
            openFloatingEditor(contextMenuPanel.id, {
              x: artboardMenu.x + 12,
              y: artboardMenu.y - 20,
            });
          }}
          onExport={() => {
            void handleExportPanelSource(contextMenuPanel);
          }}
          onDownload={() => handleDownloadPanelSource(contextMenuPanel)}
          onRefresh={() => handleRefreshPanelPreview(contextMenuPanel.id)}
          onLock={() => toggleArtboardPanelLocked(contextMenuPanel.id)}
          onClose={closeArtboardMenu}
        />
      ) : null}

      {floatingEdit && floatingPanel && canPanelEditSourceCode(floatingPanel) ? (
        <ConstructArtboardFloatingCodeEditor
          elementId={floatingPanel.id}
          elementName={floatingPanel.title}
          code={resolvePanelSourceForEdit(floatingPanel)}
          visualKind={resolvePanelEditVisualKind(
            floatingPanel,
            resolvePanelSourceForEdit(floatingPanel),
          )}
          anchorX={floatingEdit.anchorX}
          anchorY={floatingEdit.anchorY}
          onChange={handleFloatingCodeChange}
          onClose={() => setFloatingEdit(null)}
        />
      ) : null}
    </article>
  );
}
