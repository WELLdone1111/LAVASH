import type { DragEvent, ReactNode } from "react";
import { Eye, EyeOff, Lock, Trash2, Unlock } from "lucide-react";

import WindowDragSpacer from "@/components/WindowDragSpacer";
import { useI18n } from "@/i18n/context";
import { getPanelStackEdges } from "@/features/lavashconstruct/artboard/model/layerStack";
import { isBoardContainerPanel } from "@/features/lavashconstruct/artboard/model/panelHierarchy";
import type { ArtboardPanel } from "@/features/lavashconstruct/artboard/ui/types";

const LAYER_ID_KEY = "text/layer-id";
const LAYER_SCOPE_KEY = "text/layer-scope";
const LAYER_COMPOSITION_PARENT_KEY = "text/layer-composition-parent";

type LayerScope = "root" | "composition";

type ConstructBottomPanelProps = {
  artboardPanels: ArtboardPanel[];
  selectedPanelId: string | null;
  onSelectPanel: (id: string) => void;
  onReorderPanels: (orderedIds: string[]) => void;
  onReorderCompositionPanels: (parentBoardId: string, orderedIds: string[]) => void;
  onToggleVisible: (id: string) => void;
  onToggleLocked: (id: string) => void;
  onLayerUp: (id: string) => void;
  onLayerDown: (id: string) => void;
  onLayerFront: (id: string) => void;
  onLayerBack: (id: string) => void;
  onRemovePanel: (id: string) => void;
  onFocusPanel: (id: string) => void;
};

type LayerRowItemProps = {
  panel: ArtboardPanel;
  artboardPanels: ArtboardPanel[];
  depth: number;
  layerScope: LayerScope | null;
  selectedPanelId: string | null;
  onSelectPanel: (id: string) => void;
  onToggleVisible: (id: string) => void;
  onToggleLocked: (id: string) => void;
  onLayerUp: (id: string) => void;
  onLayerDown: (id: string) => void;
  onLayerFront: (id: string) => void;
  onLayerBack: (id: string) => void;
  onRemovePanel: (id: string) => void;
  onFocusPanel: (id: string) => void;
  onReorderDragOver: (event: DragEvent<HTMLDivElement>) => void;
  onReorderDrop: (event: DragEvent<HTMLDivElement>, panel: ArtboardPanel) => void;
};

function LayerRowItem({
  panel,
  artboardPanels,
  depth,
  layerScope,
  selectedPanelId,
  onSelectPanel,
  onToggleVisible,
  onToggleLocked,
  onLayerUp,
  onLayerDown,
  onLayerFront,
  onLayerBack,
  onRemovePanel,
  onFocusPanel,
  onReorderDragOver,
  onReorderDrop,
}: LayerRowItemProps) {
  const { t } = useI18n();
  const stack = getPanelStackEdges(artboardPanels, panel.id);
  const disableStack = stack.isOnlyPanel;
  const disableFrontUp = disableStack || stack.isAtFront;
  const disableBackDown = disableStack || stack.isAtBack;
  const parent = panel.parentId ? artboardPanels.find((p) => p.id === panel.parentId) : undefined;

  const metaSecondary = [
    `z:${panel.zIndex}`,
    parent ? t("construct.layers.onParent", { name: parent.title }) : null,
    panel.isLocked ? t("construct.layers.metaLocked") : null,
    panel.isVisible ? null : t("construct.layers.metaHidden"),
  ]
    .filter(Boolean)
    .join(" • ");

  const draggable = layerScope !== null;

  return (
    <div
      className={`lc-layer-row${selectedPanelId === panel.id ? " lc-layer-row--active" : ""}${depth > 0 ? " lc-layer-row--nested" : ""}`}
      style={depth > 0 ? { marginLeft: depth * 14 } : undefined}
      onClick={() => onSelectPanel(panel.id)}
      onDoubleClick={() => onFocusPanel(panel.id)}
      draggable={draggable}
      onDragStart={
        draggable
          ? (event) => {
              event.dataTransfer.setData(LAYER_ID_KEY, panel.id);
              event.dataTransfer.setData(LAYER_SCOPE_KEY, layerScope!);
              if (layerScope === "composition" && panel.parentId) {
                event.dataTransfer.setData(LAYER_COMPOSITION_PARENT_KEY, panel.parentId);
              } else {
                event.dataTransfer.setData(LAYER_COMPOSITION_PARENT_KEY, "");
              }
              event.dataTransfer.effectAllowed = "move";
            }
          : undefined
      }
      onDragOver={onReorderDragOver}
      onDrop={(event) => onReorderDrop(event, panel)}
    >
      <div className="lc-layer-meta">
        <strong>{panel.title}</strong>
        <span>{metaSecondary}</span>
      </div>
      <div className="lc-layer-actions">
        <button
          type="button"
          aria-label={panel.isVisible ? t("construct.layers.hide") : t("construct.layers.show")}
          onClick={(event) => {
            event.stopPropagation();
            onToggleVisible(panel.id);
          }}
        >
          {panel.isVisible ? (
            <Eye className="lc-layer-action-icon" size={14} strokeWidth={2} aria-hidden />
          ) : (
            <EyeOff className="lc-layer-action-icon" size={14} strokeWidth={2} aria-hidden />
          )}
        </button>
        <button
          type="button"
          aria-pressed={panel.isLocked}
          aria-label={panel.isLocked ? t("construct.layers.unlock") : t("construct.layers.lock")}
          onClick={(event) => {
            event.stopPropagation();
            onToggleLocked(panel.id);
          }}
        >
          {panel.isLocked ? (
            <Lock className="lc-layer-action-icon" size={14} strokeWidth={2} aria-hidden />
          ) : (
            <Unlock className="lc-layer-action-icon" size={14} strokeWidth={2} aria-hidden />
          )}
        </button>
        <button
          type="button"
          disabled={disableBackDown}
          aria-label={t("construct.layers.sendBack")}
          onClick={(event) => {
            event.stopPropagation();
            onLayerBack(panel.id);
          }}
        >
          {t("construct.layers.back")}
        </button>
        <button
          type="button"
          disabled={disableBackDown}
          aria-label={t("construct.layers.layerDown")}
          onClick={(event) => {
            event.stopPropagation();
            onLayerDown(panel.id);
          }}
        >
          {t("construct.layers.down")}
        </button>
        <button
          type="button"
          disabled={disableFrontUp}
          aria-label={t("construct.layers.layerUp")}
          onClick={(event) => {
            event.stopPropagation();
            onLayerUp(panel.id);
          }}
        >
          {t("construct.layers.up")}
        </button>
        <button
          type="button"
          disabled={disableFrontUp}
          aria-label={t("construct.layers.bringFront")}
          onClick={(event) => {
            event.stopPropagation();
            onLayerFront(panel.id);
          }}
        >
          {t("construct.layers.front")}
        </button>
        <button
          type="button"
          className="lc-layer-remove-button"
          disabled={panel.isLocked}
          aria-label={panel.isLocked ? t("construct.layers.unlockToRemove") : t("construct.layers.remove")}
          onClick={(event) => {
            event.stopPropagation();
            onRemovePanel(panel.id);
          }}
        >
          <Trash2 className="lc-layer-action-icon" size={14} strokeWidth={2} aria-hidden />
        </button>
      </div>
    </div>
  );
}

export default function ConstructBottomPanel({
  artboardPanels,
  selectedPanelId,
  onSelectPanel,
  onReorderPanels,
  onReorderCompositionPanels,
  onToggleVisible,
  onToggleLocked,
  onLayerUp,
  onLayerDown,
  onLayerFront,
  onLayerBack,
  onRemovePanel,
  onFocusPanel,
}: ConstructBottomPanelProps) {
  const { t } = useI18n();
  const rootPanels = artboardPanels.filter((p) => !p.parentId);
  const orderedPanels = [...rootPanels].sort((a, b) => b.zIndex - a.zIndex);
  const totalCount = artboardPanels.length;

  function handleDropRoot(targetId: string, draggedId: string) {
    if (!draggedId || targetId === draggedId) return;
    const nextIds = orderedPanels.map((p) => p.id);
    const from = nextIds.indexOf(draggedId);
    const to = nextIds.indexOf(targetId);
    if (from < 0 || to < 0) return;
    nextIds.splice(from, 1);
    nextIds.splice(to, 0, draggedId);
    onReorderPanels(nextIds.reverse());
  }

  function handleDropComposition(parentBoardId: string, targetId: string, draggedId: string) {
    if (!draggedId || targetId === draggedId) return;
    const ordered = artboardPanels
      .filter((p) => p.parentId === parentBoardId)
      .sort((a, b) => b.zIndex - a.zIndex)
      .map((p) => p.id);
    const from = ordered.indexOf(draggedId);
    const to = ordered.indexOf(targetId);
    if (from < 0 || to < 0) return;
    const nextIds = [...ordered];
    nextIds.splice(from, 1);
    nextIds.splice(to, 0, draggedId);
    onReorderCompositionPanels(parentBoardId, nextIds.reverse());
  }

  function onReorderDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }

  function onReorderDrop(event: DragEvent<HTMLDivElement>, panel: ArtboardPanel) {
    event.preventDefault();
    const draggedId = event.dataTransfer.getData(LAYER_ID_KEY);
    const scope = event.dataTransfer.getData(LAYER_SCOPE_KEY) as LayerScope | "";
    const compositionParent = event.dataTransfer.getData(LAYER_COMPOSITION_PARENT_KEY);

    if (!draggedId || (scope !== "root" && scope !== "composition")) return;

    if (!panel.parentId) {
      if (scope !== "root") return;
      handleDropRoot(panel.id, draggedId);
      return;
    }

    if (scope !== "composition" || compositionParent !== panel.parentId) return;
    handleDropComposition(panel.parentId, panel.id, draggedId);
  }

  function renderCompositionChildren(boardId: string, depth: number): ReactNode[] {
    const kids = artboardPanels
      .filter((p) => p.parentId === boardId)
      .sort((a, b) => b.zIndex - a.zIndex);
    const nodes: ReactNode[] = [];
    for (const kid of kids) {
      nodes.push(
        <LayerRowItem
          key={kid.id}
          panel={kid}
          artboardPanels={artboardPanels}
          depth={depth}
          layerScope="composition"
          selectedPanelId={selectedPanelId}
          onSelectPanel={onSelectPanel}
          onToggleVisible={onToggleVisible}
          onToggleLocked={onToggleLocked}
          onLayerUp={onLayerUp}
          onLayerDown={onLayerDown}
          onLayerFront={onLayerFront}
          onLayerBack={onLayerBack}
          onRemovePanel={onRemovePanel}
          onFocusPanel={onFocusPanel}
          onReorderDragOver={onReorderDragOver}
          onReorderDrop={onReorderDrop}
        />,
      );
      if (isBoardContainerPanel(kid)) {
        nodes.push(...renderCompositionChildren(kid.id, depth + 1));
      }
    }
    return nodes;
  }

  return (
    <section className="lc-bottom-panel">
      <header className="lc-bottom-panel-header">
        <strong>{t("construct.layers.title")}</strong>
        <WindowDragSpacer className="lc-bottom-panel-header__drag" />
        <span>{t("construct.layers.items", { count: String(totalCount) })}</span>
      </header>
      <div className="lc-bottom-panel-body">
        {orderedPanels.flatMap((panel) => {
          const rootRow = (
            <LayerRowItem
              key={panel.id}
              panel={panel}
              artboardPanels={artboardPanels}
              depth={0}
              layerScope="root"
              selectedPanelId={selectedPanelId}
              onSelectPanel={onSelectPanel}
              onToggleVisible={onToggleVisible}
              onToggleLocked={onToggleLocked}
              onLayerUp={onLayerUp}
              onLayerDown={onLayerDown}
              onLayerFront={onLayerFront}
              onLayerBack={onLayerBack}
              onRemovePanel={onRemovePanel}
              onFocusPanel={onFocusPanel}
              onReorderDragOver={onReorderDragOver}
              onReorderDrop={onReorderDrop}
            />
          );

          if (!isBoardContainerPanel(panel)) {
            return [rootRow];
          }

          return [rootRow, ...renderCompositionChildren(panel.id, 1)];
        })}
      </div>
    </section>
  );
}
