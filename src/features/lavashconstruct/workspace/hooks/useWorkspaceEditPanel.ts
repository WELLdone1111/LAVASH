import { useCallback, useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import { useConstructStore } from "@/features/lavashconstruct/artboard/model/store";
import {
  normalizeArtboardPanelsHierarchy,
} from "@/features/lavashconstruct/artboard/model/panelHierarchy";
import {
  normalizeImportedTextForEditPalette,
  repairAssistantHtmlDocument,
} from "@/features/lavashconstruct/artboard/model/import";
import {
  buildImportedLiveEditPanelPatch,
  extractCssVarsFromEditSource,
  type EditCssVarsState,
} from "@/features/lavashconstruct/sync";
import type { ArtboardPanel } from "@/features/lavashconstruct/artboard/ui/types";
import {
  createPastedPanelClones,
  deleteSelectedPanels,
} from "@/features/edit-menu/model/editMenuPanelActions";
import {
  canPanelEditSourceCode,
  getPanelFloatingEditorAnchor,
} from "@/features/lavashconstruct/artboard/model/artboardPanelScreenAnchor";
import { captureArtboardPanelImage } from "@/features/lavashconstruct/artboard/model/captureArtboardPanel";
import { downloadBasenameForPanel } from "@/features/lavashconstruct/editor/model/panelEditFilename";
import {
  DEFAULT_EDIT_SOURCE,
  type EditPanelSnapshot,
  resolveEditVisualKind,
  resolvePanelEditVisualKind,
} from "@/features/lavashconstruct/workspace/model/constructWorkspaceUtils";

export type UseWorkspaceEditPanelParams = {
  artboardPanels: ArtboardPanel[];
  setArtboardPanels: ReturnType<typeof useConstructStore.getState>["setArtboardPanels"];
  commitArtboardPanels: ReturnType<typeof useConstructStore.getState>["commitArtboardPanels"];
  setSelectedPanelId: (id: string | null) => void;
  setSelectedPanelIds: (ids: string[] | ((current: string[]) => string[])) => void;
  artboardBoardRef: RefObject<HTMLDivElement | null>;
  artboardZoom: number;
  artboardPan: { x: number; y: number };
  focusPanelInView: (panelId: string) => void;
};

export function useWorkspaceEditPanel({
  artboardPanels,
  setArtboardPanels,
  commitArtboardPanels,
  setSelectedPanelId,
  setSelectedPanelIds,
  artboardBoardRef,
  artboardZoom,
  artboardPan,
  focusPanelInView,
}: UseWorkspaceEditPanelParams) {
  const [editingPanelId, setEditingPanelId] = useState<string | null>(null);
  const [floatingEdit, setFloatingEdit] = useState<{
    panelId: string;
    anchorX: number;
    anchorY: number;
  } | null>(null);
  const [editSourceCode, setEditSourceCode] = useState("");
  const [editCssVars, setEditCssVars] = useState<EditCssVarsState>({
    "--accent-color": "#ffb800",
    "--bg-color": "transparent",
    "--text-color": "#1f2937",
  });
  const [editOpacity, setEditOpacity] = useState(1);
  const [editBlurPx, setEditBlurPx] = useState(0);
  const [editBorderRadiusPx, setEditBorderRadiusPx] = useState(12);
  const [editHoverScale, setEditHoverScale] = useState(1.02);

  const editSnapshotRef = useRef<EditPanelSnapshot | null>(null);
  const openEditPanelRef = useRef<(panelId: string) => void>(() => {});

  const editingPanel = editingPanelId
    ? artboardPanels.find((panel) => panel.id === editingPanelId) ?? null
    : null;
  const floatingPanel = floatingEdit
    ? artboardPanels.find((panel) => panel.id === floatingEdit.panelId) ?? null
    : null;

  function resolvePanelSourceForEdit(panel: ArtboardPanel): string {
    const vk = resolvePanelEditVisualKind(
      panel,
      panel.importedTextContent?.trim() || DEFAULT_EDIT_SOURCE,
    );
    const editNorm = normalizeImportedTextForEditPalette(
      panel.importedTextContent,
      vk,
      panel.importWarnings,
    );
    return editNorm.text?.trim() || DEFAULT_EDIT_SOURCE;
  }

  function closeEditPanel() {
    setEditingPanelId(null);
    setEditSourceCode("");
    editSnapshotRef.current = null;
  }

  function openFloatingEditor(panelId: string, anchor?: { x: number; y: number }) {
    const panel = artboardPanels.find((item) => item.id === panelId);
    if (!panel || !canPanelEditSourceCode(panel)) return;
    closeEditPanel();
    const board = artboardBoardRef.current;
    let anchorX = anchor?.x ?? 0;
    let anchorY = anchor?.y ?? 0;
    if (board) {
      const pt = getPanelFloatingEditorAnchor(panel, artboardPanels, board, {
        zoom: artboardZoom,
        panX: artboardPan.x,
        panY: artboardPan.y,
      });
      if (anchor) {
        anchorX = anchor.x;
        anchorY = anchor.y;
      } else {
        anchorX = pt.x;
        anchorY = pt.y;
      }
    }
    setFloatingEdit({ panelId, anchorX, anchorY });
  }

  const handleFloatingCodeChange = useCallback(
    (panelId: string, newCode: string) => {
      const source = newCode.trim() || DEFAULT_EDIT_SOURCE;
      setArtboardPanels((items) => {
        let changed = false;
        const next = items.map((panel) => {
          if (panel.id !== panelId) return panel;
          const visualKind = resolvePanelEditVisualKind(panel, source);
          if (panel.constructWidgetId) {
            const extracted = extractCssVarsFromEditSource(visualKind, source);
            const accentRaw = extracted?.["--accent-color"]?.trim();
            const target = {
              ...panel,
              constructWidgetAccentColor: accentRaw?.slice(0, 120),
            };
            if (target.constructWidgetAccentColor === panel.constructWidgetAccentColor) return panel;
            changed = true;
            return target;
          }
          const vars: EditCssVarsState = {
            "--accent-color": "#ffb800",
            "--bg-color": panel.backgroundColor ?? "transparent",
            "--text-color": "#1f2937",
          };
          const extracted = extractCssVarsFromEditSource(visualKind, source);
          if (extracted?.["--accent-color"]) vars["--accent-color"] = extracted["--accent-color"];
          if (extracted?.["--bg-color"]) vars["--bg-color"] = extracted["--bg-color"];
          if (extracted?.["--text-color"]) vars["--text-color"] = extracted["--text-color"];
          const patch = buildImportedLiveEditPanelPatch(panel, {
            visualKind,
            source,
            vars,
            sliders: {
              opacity: panel.opacity ?? 1,
              blurPx: panel.blurPx ?? 0,
              borderRadiusPx: panel.borderRadiusPx ?? 12,
              hoverScale: panel.hoverScale ?? 1.02,
            },
          });
          if (!patch) return panel;
          changed = true;
          return patch;
        });
        return changed ? next : items;
      });
    },
    [setArtboardPanels],
  );

  function handleContextMenuDuplicate(panelId: string) {
    const panel = artboardPanels.find((item) => item.id === panelId);
    if (!panel) return;
    const { clones, nextIds } = createPastedPanelClones([panel], artboardPanels);
    commitArtboardPanels(
      "Duplicate panel",
      normalizeArtboardPanelsHierarchy([...artboardPanels, ...clones]),
    );
    setSelectedPanelId(nextIds[0] ?? null);
    setSelectedPanelIds(nextIds);
  }

  function handleContextMenuDelete(panelId: string) {
    const result = deleteSelectedPanels(artboardPanels, [panelId]);
    if (!result) return;
    commitArtboardPanels("Delete panel", result.nextPanels);
    setSelectedPanelId(result.nextSelectedId);
    setSelectedPanelIds(result.nextSelectedId ? [result.nextSelectedId] : []);
    if (floatingEdit?.panelId === panelId) setFloatingEdit(null);
  }

  const handleFormatCanvasSelection = useCallback(
    (selectedPanelIds: string[], selectedPanelId: string | null) => {
      const ids =
        selectedPanelIds.length > 0 ? selectedPanelIds : selectedPanelId ? [selectedPanelId] : [];
      const panel = artboardPanels.find((p) => p.id === ids[0]);
      const raw = panel?.importedTextContent?.trim();
      if (!panel || !raw) return;
      const { html, repaired } = repairAssistantHtmlDocument(raw);
      const norm = normalizeImportedTextForEditPalette(
        html,
        panel.importedVisualKind ?? "html",
        panel.importWarnings,
      );
      if (!repaired && norm.text === panel.importedTextContent) return;
      commitArtboardPanels(
        "Format panel source",
        artboardPanels.map((p) =>
          p.id === panel.id ? { ...p, importedTextContent: norm.text, importWarnings: norm.importWarnings } : p,
        ),
      );
    },
    [artboardPanels, commitArtboardPanels],
  );

  const handleRefreshPanelPreview = useCallback(
    (panelId: string) => {
      const panel = artboardPanels.find((p) => p.id === panelId);
      if (!panel?.importedTextContent) return;
      const nextText = `${panel.importedTextContent.replace(/\u200b/g, "")}\u200b`;
      commitArtboardPanels(
        "Refresh panel preview",
        artboardPanels.map((p) => (p.id === panelId ? { ...p, importedTextContent: nextText } : p)),
      );
    },
    [artboardPanels, commitArtboardPanels],
  );

  const handleDownloadPanelSource = useCallback((panel: ArtboardPanel) => {
    const text = resolvePanelSourceForEdit(panel);
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = downloadBasenameForPanel(panel);
    anchor.click();
    URL.revokeObjectURL(url);
  }, []);

  const handleExportPanelSource = useCallback(async (panel: ArtboardPanel) => {
    const text = resolvePanelSourceForEdit(panel);
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* clipboard may be blocked */
    }
  }, []);

  const handleCopyPanelAsImage = useCallback(async (panelId: string) => {
    const captured = await captureArtboardPanelImage(panelId);
    if (!captured) return;
    try {
      if (typeof ClipboardItem !== "undefined") {
        const res = await fetch(captured.dataUrl);
        const blob = await res.blob();
        await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
      }
    } catch {
      /* fallback: ignore */
    }
  }, []);

  useEffect(() => {
    if (!floatingEdit?.panelId || !artboardBoardRef.current) return;
    const panel = useConstructStore.getState().artboardPanels.find((p) => p.id === floatingEdit.panelId);
    if (!panel) return;
    const pt = getPanelFloatingEditorAnchor(panel, useConstructStore.getState().artboardPanels, artboardBoardRef.current, {
      zoom: artboardZoom,
      panX: artboardPan.x,
      panY: artboardPan.y,
    });
    setFloatingEdit((current) =>
      current && current.panelId === floatingEdit.panelId
        ? { ...current, anchorX: pt.x, anchorY: pt.y }
        : current,
    );
  }, [artboardPan.x, artboardPan.y, artboardZoom, floatingEdit?.panelId, artboardBoardRef]);

  function openEditPanel(panelId: string) {
    const panel = artboardPanels.find((item) => item.id === panelId);
    if (!panel) return;
    editSnapshotRef.current = {
      importedVisualKind: panel.importedVisualKind,
      importedTextContent: panel.importedTextContent,
      importedHtmlPreviewExtraCss: panel.importedHtmlPreviewExtraCss,
      backgroundColor: panel.backgroundColor,
      opacity: panel.opacity,
      blurPx: panel.blurPx,
      borderRadiusPx: panel.borderRadiusPx,
      hoverScale: panel.hoverScale,
      rotationDeg: panel.rotationDeg,
      constructWidgetAccentColor: panel.constructWidgetAccentColor,
    };
    setEditingPanelId(panelId);
    const vk = resolvePanelEditVisualKind(
      panel,
      panel.importedTextContent?.trim() || DEFAULT_EDIT_SOURCE,
    );
    const editNorm = normalizeImportedTextForEditPalette(
      panel.importedTextContent,
      vk,
      panel.importWarnings,
    );
    setEditSourceCode(editNorm.text?.trim() || DEFAULT_EDIT_SOURCE);
    setEditCssVars({
      "--accent-color": panel.constructWidgetId
        ? (panel.constructWidgetAccentColor?.trim() || "#ffb800")
        : "#ffb800",
      "--bg-color": panel.backgroundColor ?? "transparent",
      "--text-color": "#1f2937",
    });
    setEditOpacity(panel.opacity ?? 1);
    setEditBlurPx(panel.blurPx ?? 0);
    setEditBorderRadiusPx(panel.borderRadiusPx ?? 12);
    setEditHoverScale(panel.hoverScale ?? 1.02);
    window.requestAnimationFrame(() => {
      focusPanelInView(panelId);
    });
  }
  openEditPanelRef.current = openEditPanel;

  function applyComponentEdits() {
    closeEditPanel();
  }

  function cancelComponentEdits() {
    if (!editingPanelId || !editSnapshotRef.current) {
      closeEditPanel();
      return;
    }
    const snapshot = editSnapshotRef.current;
    setArtboardPanels((items) =>
      items.map((panel) =>
        panel.id === editingPanelId
          ? {
              ...panel,
              importedVisualKind: snapshot.importedVisualKind ?? panel.importedVisualKind,
              importedTextContent: snapshot.importedTextContent,
              importedHtmlPreviewExtraCss: snapshot.importedHtmlPreviewExtraCss,
              backgroundColor: snapshot.backgroundColor,
              opacity: snapshot.opacity,
              blurPx: snapshot.blurPx,
              borderRadiusPx: snapshot.borderRadiusPx,
              hoverScale: snapshot.hoverScale,
              rotationDeg: snapshot.rotationDeg,
              constructWidgetAccentColor: snapshot.constructWidgetAccentColor,
            }
          : panel,
      ),
    );
    closeEditPanel();
  }

  useEffect(() => {
    if (!editingPanelId) return;
    const source = editSourceCode.trim() || DEFAULT_EDIT_SOURCE;
    const panel = artboardPanels.find((item) => item.id === editingPanelId);
    if (!panel) return;
    const visualKind = resolvePanelEditVisualKind(panel, source);
    const sliders = {
      opacity: editOpacity,
      blurPx: editBlurPx,
      borderRadiusPx: editBorderRadiusPx,
      hoverScale: editHoverScale,
    };

    setArtboardPanels((items) => {
      let changed = false;
      const next = items.map((item) => {
        if (item.id !== editingPanelId) return item;
        if (item.constructWidgetId) {
          const accentRaw = editCssVars["--accent-color"].trim();
          const labAccent = accentRaw.length > 0 ? accentRaw.slice(0, 120) : undefined;
          const target = {
            ...item,
            constructWidgetAccentColor: labAccent,
            backgroundColor: editCssVars["--bg-color"],
            opacity: sliders.opacity,
            blurPx: sliders.blurPx,
            borderRadiusPx: sliders.borderRadiusPx,
            hoverScale: sliders.hoverScale,
          };
          const same =
            item.constructWidgetAccentColor === target.constructWidgetAccentColor &&
            item.backgroundColor === target.backgroundColor &&
            item.opacity === target.opacity &&
            item.blurPx === target.blurPx &&
            item.borderRadiusPx === target.borderRadiusPx &&
            item.hoverScale === target.hoverScale;
          if (same) return item;
          changed = true;
          return target;
        }
        const patch = buildImportedLiveEditPanelPatch(item, {
          visualKind,
          source,
          vars: editCssVars,
          sliders,
        });
        if (!patch) return item;
        changed = true;
        return patch;
      });
      return changed ? next : items;
    });
  }, [
    editingPanelId,
    editSourceCode,
    editCssVars,
    editOpacity,
    editBlurPx,
    editBorderRadiusPx,
    editHoverScale,
    setArtboardPanels,
    artboardPanels,
  ]);

  useEffect(() => {
    if (!editingPanelId) return;
    const raw = editSourceCode;
    const panelId = editingPanelId;
    const handle = window.setTimeout(() => {
      const panel = useConstructStore.getState().artboardPanels.find((p) => p.id === panelId);
      if (panel?.constructWidgetId) return;
      const visualKind = panel
        ? resolvePanelEditVisualKind(panel, raw.trim() || DEFAULT_EDIT_SOURCE)
        : resolveEditVisualKind(raw.trim() || DEFAULT_EDIT_SOURCE);
      const extracted = extractCssVarsFromEditSource(visualKind, raw);
      if (!extracted) return;
      setEditCssVars((prev) => {
        let hit = false;
        const next = { ...prev };
        for (const key of ["--accent-color", "--bg-color", "--text-color"] as const) {
          const v = extracted[key];
          if (typeof v === "string" && prev[key] !== v) {
            next[key] = v;
            hit = true;
          }
        }
        return hit ? next : prev;
      });
    }, 320);
    return () => window.clearTimeout(handle);
  }, [editingPanelId, editSourceCode]);

  return {
    editingPanel,
    floatingEdit,
    setFloatingEdit,
    floatingPanel,
    editSourceCode,
    setEditSourceCode,
    editCssVars,
    setEditCssVars,
    editOpacity,
    setEditOpacity,
    editBlurPx,
    setEditBlurPx,
    editBorderRadiusPx,
    setEditBorderRadiusPx,
    editHoverScale,
    setEditHoverScale,
    openEditPanel,
    openEditPanelRef,
    openFloatingEditor,
    applyComponentEdits,
    cancelComponentEdits,
    handleFloatingCodeChange,
    resolvePanelSourceForEdit,
    handleContextMenuDuplicate,
    handleContextMenuDelete,
    handleFormatCanvasSelection,
    handleRefreshPanelPreview,
    handleDownloadPanelSource,
    handleExportPanelSource,
    handleCopyPanelAsImage,
  };
}
