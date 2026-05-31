import { useCallback, useRef, useState } from "react";
import "./LavashConstructWorkspace.css";
import {
  DEFAULT_ADVANCED_EXPORT,
  DEFAULT_EXPORT_FORMAT,
} from "@/features/lavashconstruct/shared/model/constants";
import type {
  AdvancedExportKind,
  ExportFormat,
  LavashConstructWorkspaceProps,
} from "@/features/lavashconstruct/shared/model/types";
import { useConstructStore } from "@/features/lavashconstruct/artboard/model/store";
import type { ArtboardPanel } from "@/features/lavashconstruct/artboard/ui/types";
import { useConstructArtboardInteraction } from "@/features/lavashconstruct/artboard/ui/useConstructArtboardInteraction";
import { useProjectWorkspaceStore } from "@/features/lavashconstruct/project/model/projectWorkspaceStore";
import { isProjectFilePreviewable } from "@/features/lavashconstruct/project/model/projectArtboardLink";
import { useConstructUnifiedLayoutDrag } from "@/features/lavashconstruct/workspace/hooks/useConstructUnifiedLayoutDrag";
import { useConstructWorkspaceRail } from "@/features/lavashconstruct/workspace/hooks/useConstructWorkspaceRail";
import { useConstructWorkspaceBrowserSplit } from "@/features/lavashconstruct/workspace/hooks/useConstructWorkspaceBrowserSplit";
import { useWorkspaceLifecycle } from "@/features/lavashconstruct/workspace/hooks/useWorkspaceLifecycle";
import { useWorkspacePasteImport } from "@/features/lavashconstruct/workspace/hooks/useWorkspacePasteImport";
import { useWorkspaceEditPanel } from "@/features/lavashconstruct/workspace/hooks/useWorkspaceEditPanel";
import { useWorkspaceFileMenu } from "@/features/lavashconstruct/workspace/hooks/useWorkspaceFileMenu";
import { useWorkspaceArtboardMenu } from "@/features/lavashconstruct/workspace/hooks/useWorkspaceArtboardMenu";
import { useWorkspaceChatMark } from "@/features/lavashconstruct/workspace/hooks/useWorkspaceChatMark";
import { useWorkspaceKeyboardShortcuts } from "@/features/lavashconstruct/workspace/hooks/useWorkspaceKeyboardShortcuts";
import ConstructWorkspaceMainView from "@/features/lavashconstruct/workspace/ui/ConstructWorkspaceMainView";
import ConstructWorkspaceArtboardSettingsSection from "@/features/lavashconstruct/workspace/ui/ConstructWorkspaceArtboardSettingsSection";

export default function LavashConstructWorkspace({ animationState, dockPulseKey }: LavashConstructWorkspaceProps) {
  const workspaceRef = useRef<HTMLElement | null>(null);
  const shellRef = useRef<HTMLDivElement | null>(null);
  const { constructLayout, onChatSplitPointerDown, expandChatPanel } = useConstructUnifiedLayoutDrag(shellRef);

  const {
    constructState,
    artboardPanels,
    selectedPanelId,
    setConstructStateDirect,
    setArtboardPanelsDirect,
    setArtboardPanels,
    moveArtboardPanel,
    commitArtboardPanels,
    bringArtboardPanelToFront,
    resizeArtboardPanel,
    setSelectedPanelId,
    moveArtboardPanelLayerUp,
    moveArtboardPanelLayerDown,
    moveArtboardPanelToFront,
    moveArtboardPanelToBack,
    reorderArtboardPanels,
    reorderCompositionPanels,
    toggleArtboardPanelVisible,
    toggleArtboardPanelLocked,
    removeArtboardPanel,
  } = useConstructStore();

  const [selectedExportFormat, setSelectedExportFormat] = useState<ExportFormat>(DEFAULT_EXPORT_FORMAT);
  const [selectedAdvancedExport, setSelectedAdvancedExport] = useState<AdvancedExportKind>(DEFAULT_ADVANCED_EXPORT);
  const [selectedPanelIds, setSelectedPanelIds] = useState<string[]>([]);
  const [copiedPanels, setCopiedPanels] = useState<ArtboardPanel[]>([]);

  const rail = useConstructWorkspaceRail();
  const { ideBrowserOpen, browserSplitRatio, setBrowserSplitRatio } = useConstructWorkspaceBrowserSplit();

  const {
    artboardZoom,
    artboardPan,
    middlePanHeld,
    activeInteractionPanelId,
    artboardBoardRef,
    onArtboardViewportPointerDownCapture,
    onArtboardViewportLostPointerCapture,
    onPanelPointerDown,
    onPanelResizePointerDown,
    focusPanelInView,
  } = useConstructArtboardInteraction({
    animationState,
    artboardPanels,
    moveArtboardPanel,
    resizeArtboardPanel,
    commitArtboardPanels,
    bringArtboardPanelToFront,
    setSelectedPanelId,
  });

  const paste = useWorkspacePasteImport({
    constructState,
    artboardPanels,
    commitArtboardPanels,
    setSelectedPanelId,
    artboardBoardRef,
    artboardZoom,
    artboardPan,
  });

  const edit = useWorkspaceEditPanel({
    artboardPanels,
    setArtboardPanels,
    commitArtboardPanels,
    setSelectedPanelId,
    setSelectedPanelIds,
    artboardBoardRef,
    artboardZoom,
    artboardPan,
    focusPanelInView,
  });

  const lifecycle = useWorkspaceLifecycle({
    constructState,
    artboardPanels,
    selectedPanelId,
    selectedExportFormat,
    selectedAdvancedExport,
    userLibraryItems: paste.userLibraryItems,
    setConstructStateDirect,
    setArtboardPanelsDirect,
    setSelectedPanelId,
    setSelectedExportFormat,
    setSelectedAdvancedExport,
    setUserLibraryItems: paste.setUserLibraryItems,
    openEditPanelRef: edit.openEditPanelRef,
    pasteImportedItemsToArtboardRef: paste.pasteImportedItemsToArtboardRef,
  });

  useWorkspaceFileMenu({
    constructState,
    artboardPanels,
    selectedPanelId,
    selectedPanelIds,
    copiedPanels,
    userLibraryItems: paste.userLibraryItems,
    selectedExportFormat,
    selectedAdvancedExport,
    setConstructStateDirect,
    setArtboardPanelsDirect,
    setSelectedPanelId,
    setSelectedExportFormat,
    setSelectedAdvancedExport,
    setUserLibraryItems: paste.setUserLibraryItems,
    setCopiedPanels,
    setSelectedPanelIds,
    commitArtboardPanels,
    onImportFiles: paste.handleImportFiles,
  });

  const menu = useWorkspaceArtboardMenu({
    artboardPanels,
    artboardBoardRef,
    artboardZoom,
    artboardPan,
    handleAddLibraryPanelRef: paste.handleAddLibraryPanelRef,
  });

  const chatMark = useWorkspaceChatMark({
    setSelectedPanelId,
    setSelectedPanelIds,
    expandChatPanel,
    setMarkMode: rail.setMarkMode,
  });

  useWorkspaceKeyboardShortcuts({
    artboardPanels,
    selectedPanelId,
    selectedPanelIds,
    commitArtboardPanels,
    setSelectedPanelId,
    setSelectedPanelIds,
  });

  const pickProjectFolder = useProjectWorkspaceStore((s) => s.pickAndOpenFolder);
  const handleOpenProjectFolder = useCallback(() => {
    void pickProjectFolder().then((root) => {
      if (root) rail.setProjectOpen(true);
    });
  }, [pickProjectFolder, rail.setProjectOpen]);

  const projectOpenFile = useProjectWorkspaceStore((s) => s.openFile);
  const projectViewMode = useProjectWorkspaceStore((s) => s.viewMode);
  const showProjectCode =
    Boolean(projectOpenFile) && (projectViewMode === "split" || projectViewMode === "code");
  const showProjectDesign =
    !projectOpenFile || projectViewMode === "split" || projectViewMode === "design";
  const showProjectViewBar =
    projectOpenFile != null && isProjectFilePreviewable(projectOpenFile.path);

  const handleFormatCanvasSelection = useCallback(() => {
    edit.handleFormatCanvasSelection(selectedPanelIds, selectedPanelId);
  }, [edit.handleFormatCanvasSelection, selectedPanelId, selectedPanelIds]);

  const artboardSettingsSection = (
    <ConstructWorkspaceArtboardSettingsSection constructState={constructState} />
  );

  return (
    <ConstructWorkspaceMainView
      animationState={animationState}
      dockPulseKey={dockPulseKey}
      workspaceRef={workspaceRef}
      shellRef={shellRef}
      constructLayout={constructLayout}
      onChatSplitPointerDown={onChatSplitPointerDown}
      userLibOpen={rail.userLibOpen}
      projectOpen={rail.projectOpen}
      isArtboardSettingsOpen={rail.isArtboardSettingsOpen}
      userLibraryItems={paste.userLibraryItems}
      handleSelectSection={rail.handleSelectSection}
      setIsArtboardSettingsOpen={rail.setIsArtboardSettingsOpen}
      handleNewLavashDocument={lifecycle.handleNewLavashDocument}
      handleOpenLavashDocumentPicker={lifecycle.handleOpenLavashDocumentPicker}
      handleOpenProjectFolder={handleOpenProjectFolder}
      handleOpenLavashDocumentFromProject={lifecycle.handleOpenLavashDocumentFromProject}
      setUserLibraryItems={paste.setUserLibraryItems}
      handleAddLibraryPanel={paste.handleAddLibraryPanel}
      showProjectCode={showProjectCode}
      showProjectDesign={showProjectDesign}
      showProjectViewBar={showProjectViewBar}
      handleReloadLavashDocument={lifecycle.handleReloadLavashDocument}
      ideBrowserOpen={ideBrowserOpen}
      browserSplitRatio={browserSplitRatio}
      setBrowserSplitRatio={setBrowserSplitRatio}
      searchOpen={rail.searchOpen}
      layersOpen={rail.layersOpen}
      markMode={rail.markMode}
      handleToggleSearch={rail.handleToggleSearch}
      handleToggleLayers={rail.handleToggleLayers}
      handleToggleMark={rail.handleToggleMark}
      handleRegenerate={chatMark.handleRegenerate}
      constructState={constructState}
      artboardPanels={artboardPanels}
      selectedPanelId={selectedPanelId}
      selectedPanelIds={selectedPanelIds}
      chatMarkedPanelId={chatMark.chatMarkedPanelId}
      artboardZoom={artboardZoom}
      artboardPan={artboardPan}
      middlePanHeld={middlePanHeld}
      activeInteractionPanelId={activeInteractionPanelId}
      isLibraryDragOverArtboard={paste.isLibraryDragOverArtboard}
      artboardBoardRef={artboardBoardRef}
      onArtboardViewportPointerDownCapture={onArtboardViewportPointerDownCapture}
      onArtboardViewportLostPointerCapture={onArtboardViewportLostPointerCapture}
      handleArtboardDragOver={paste.handleArtboardDragOver}
      handleArtboardDragEnter={paste.handleArtboardDragEnter}
      handleArtboardDragLeave={paste.handleArtboardDragLeave}
      handleArtboardDrop={paste.handleArtboardDrop}
      setSelectedPanelId={setSelectedPanelId}
      setSelectedPanelIds={setSelectedPanelIds}
      focusPanelInView={focusPanelInView}
      reorderArtboardPanels={reorderArtboardPanels}
      reorderCompositionPanels={reorderCompositionPanels}
      toggleArtboardPanelVisible={toggleArtboardPanelVisible}
      toggleArtboardPanelLocked={toggleArtboardPanelLocked}
      moveArtboardPanelLayerUp={moveArtboardPanelLayerUp}
      moveArtboardPanelLayerDown={moveArtboardPanelLayerDown}
      moveArtboardPanelToFront={moveArtboardPanelToFront}
      moveArtboardPanelToBack={moveArtboardPanelToBack}
      removeArtboardPanel={removeArtboardPanel}
      handleMarkPanel={chatMark.handleMarkPanel}
      onPanelPointerDown={onPanelPointerDown}
      onPanelResizePointerDown={onPanelResizePointerDown}
      artboardMenu={menu.artboardMenu}
      setArtboardMenu={menu.setArtboardMenu}
      handleArtboardCanvasContextMenu={menu.handleArtboardCanvasContextMenu}
      editingPanel={edit.editingPanel}
      editSourceCode={edit.editSourceCode}
      editCssVars={edit.editCssVars}
      editOpacity={edit.editOpacity}
      editBlurPx={edit.editBlurPx}
      editBorderRadiusPx={edit.editBorderRadiusPx}
      editHoverScale={edit.editHoverScale}
      setEditSourceCode={edit.setEditSourceCode}
      setEditCssVars={edit.setEditCssVars}
      setEditOpacity={edit.setEditOpacity}
      setEditBlurPx={edit.setEditBlurPx}
      setEditBorderRadiusPx={edit.setEditBorderRadiusPx}
      setEditHoverScale={edit.setEditHoverScale}
      applyComponentEdits={edit.applyComponentEdits}
      cancelComponentEdits={edit.cancelComponentEdits}
      settingsSection={rail.settingsSection}
      setSettingsSection={rail.setSettingsSection}
      artboardSettingsSection={artboardSettingsSection}
      smartPaste={paste.smartPaste}
      smartPasteMarkupDraft={paste.smartPasteMarkupDraft}
      smartPasteTextareaRef={paste.smartPasteTextareaRef}
      setSmartPaste={paste.setSmartPaste}
      setSmartPasteMarkupDraft={paste.setSmartPasteMarkupDraft}
      pasteImportedItemsToArtboardRef={paste.pasteImportedItemsToArtboardRef}
      handleFormatCanvasSelection={handleFormatCanvasSelection}
      handleAddCodePanelAtMenu={menu.handleAddCodePanelAtMenu}
      openUserLibDrawer={rail.openUserLibDrawer}
      closeArtboardMenu={menu.closeArtboardMenu}
      contextMenuPanel={menu.contextMenuPanel}
      handleContextMenuDuplicate={edit.handleContextMenuDuplicate}
      handleContextMenuDelete={edit.handleContextMenuDelete}
      handleAskLavashFromContextMenu={chatMark.handleAskLavashFromContextMenu}
      handleExportPanelSource={edit.handleExportPanelSource}
      handleCopyPanelAsImage={edit.handleCopyPanelAsImage}
      handleDownloadPanelSource={edit.handleDownloadPanelSource}
      handleRefreshPanelPreview={edit.handleRefreshPanelPreview}
      openEditPanel={edit.openEditPanel}
      openFloatingEditor={edit.openFloatingEditor}
      expandChatPanel={expandChatPanel}
      floatingEdit={edit.floatingEdit}
      floatingPanel={edit.floatingPanel}
      resolvePanelSourceForEdit={edit.resolvePanelSourceForEdit}
      handleFloatingCodeChange={edit.handleFloatingCodeChange}
      setFloatingEdit={edit.setFloatingEdit}
    />
  );
}
