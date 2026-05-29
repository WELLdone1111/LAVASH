import { useI18n } from "@/i18n/context";
import ConstructContextMenuBase, {
  type ConstructContextMenuItemDef,
  type ConstructContextMenuSectionDef,
} from "@/features/lavashconstruct/artboard/ui/ConstructContextMenuBase";
import { isEditMenuActionEnabled, runEditMenuAction } from "@/features/edit-menu/model/editMenuBus";

export type ConstructArtboardCanvasContextMenuProps = {
  x: number;
  y: number;
  onAddCodePanel: () => void;
  onOpenUserLib: () => void;
  onFormat: () => void;
  canFormat: boolean;
  onClose: () => void;
};

export function ConstructArtboardCanvasContextMenu({
  x,
  y,
  onAddCodePanel,
  onOpenUserLib,
  onFormat,
  canFormat,
  onClose,
}: ConstructArtboardCanvasContextMenuProps) {
  const { t } = useI18n();

  const sections: ConstructContextMenuSectionDef[] = [
    {
      items: [
        {
          id: "undo",
          label: t("construct.contextMenu.undo"),
          shortcut: "Ctrl+Z",
          disabled: !isEditMenuActionEnabled("undo"),
          onSelect: () => runEditMenuAction("undo"),
        },
        {
          id: "redo",
          label: t("construct.contextMenu.redo"),
          shortcut: "Ctrl+⇧Z",
          disabled: !isEditMenuActionEnabled("redo"),
          onSelect: () => runEditMenuAction("redo"),
        },
        {
          id: "paste",
          label: t("construct.contextMenu.paste"),
          shortcut: "Ctrl+V",
          disabled: !isEditMenuActionEnabled("paste"),
          onSelect: () => runEditMenuAction("paste"),
        },
        {
          id: "format",
          label: t("construct.contextMenu.format"),
          shortcut: "Ctrl+⇧F",
          disabled: !canFormat,
          onSelect: onFormat,
        },
        {
          id: "add",
          label: t("construct.contextMenu.add"),
          children: [
            {
              id: "add-code",
              label: t("construct.contextMenu.addCodePanel"),
              onSelect: onAddCodePanel,
            },
            {
              id: "add-lib",
              label: t("construct.contextMenu.addFromUserLib"),
              onSelect: onOpenUserLib,
            },
          ],
        },
      ],
    },
  ];

  return (
    <ConstructContextMenuBase
      x={x}
      y={y}
      width={232}
      estimatedHeight={220}
      sections={sections}
      onClose={onClose}
    />
  );
}

export type ConstructArtboardPanelContextMenuProps = {
  x: number;
  y: number;
  elementName: string;
  isLocked: boolean;
  isMarked: boolean;
  canEditCode: boolean;
  canCopy: boolean;
  canCut: boolean;
  canCopyAsHtml: boolean;
  canCopyAsCode: boolean;
  canCopyAsImage: boolean;
  onCopy: () => void;
  onCopyAsHtml: () => void;
  onCopyAsCode: () => void;
  onCopyAsImage: () => void;
  onCut: () => void;
  onDuplicate: () => void;
  onFocus: () => void;
  onFavourite: () => void;
  onDelete: () => void;
  onGenerate: () => void;
  onMarkForChat: () => void;
  onViewDetails: () => void;
  onViewCode: () => void;
  onExport: () => void;
  onDownload: () => void;
  onRefresh: () => void;
  onLock: () => void;
  onClose: () => void;
};

export function ConstructArtboardPanelContextMenu({
  x,
  y,
  elementName,
  isLocked,
  isMarked,
  canEditCode,
  canCopy,
  canCut,
  canCopyAsHtml,
  canCopyAsCode,
  canCopyAsImage,
  onCopy,
  onCopyAsHtml,
  onCopyAsCode,
  onCopyAsImage,
  onCut,
  onDuplicate,
  onFocus,
  onFavourite,
  onDelete,
  onGenerate,
  onMarkForChat,
  onViewDetails,
  onViewCode,
  onExport,
  onDownload,
  onRefresh,
  onLock,
  onClose,
}: ConstructArtboardPanelContextMenuProps) {
  const { t } = useI18n();

  const copyAsChildren: ConstructContextMenuItemDef[] = [
    {
      id: "copy-html",
      label: t("construct.contextMenu.copyAsHtml"),
      disabled: !canCopyAsHtml,
      onSelect: onCopyAsHtml,
    },
    {
      id: "copy-code",
      label: t("construct.contextMenu.copyAsCode"),
      disabled: !canCopyAsCode,
      onSelect: onCopyAsCode,
    },
    {
      id: "copy-image",
      label: t("construct.contextMenu.copyAsImage"),
      disabled: !canCopyAsImage,
      onSelect: onCopyAsImage,
    },
  ];

  const sections: ConstructContextMenuSectionDef[] = [
    {
      items: [
        {
          id: "copy",
          label: t("construct.contextMenu.copy"),
          shortcut: "Ctrl+C",
          disabled: !canCopy,
          onSelect: onCopy,
        },
        {
          id: "copy-as",
          label: t("construct.contextMenu.copyAs"),
          children: copyAsChildren,
        },
        {
          id: "cut",
          label: t("construct.contextMenu.cut"),
          shortcut: "Ctrl+X",
          disabled: !canCut,
          onSelect: onCut,
        },
        {
          id: "duplicate",
          label: t("construct.contextMenu.duplicate"),
          shortcut: "Ctrl+D",
          onSelect: onDuplicate,
        },
        {
          id: "focus",
          label: t("construct.contextMenu.focus"),
          shortcut: "F",
          onSelect: onFocus,
        },
        {
          id: "favourite",
          label: isMarked ? t("construct.contextMenu.unmark") : t("construct.contextMenu.favourite"),
          shortcut: "⇧F",
          accent: !isMarked,
          onSelect: onFavourite,
        },
        {
          id: "delete",
          label: t("construct.contextMenu.delete"),
          shortcut: "⌫",
          danger: true,
          disabled: isLocked,
          onSelect: onDelete,
        },
      ],
    },
    {
      heading: t("construct.contextMenu.sectionGenerate"),
      items: [
        {
          id: "generate",
          label: t("construct.contextMenu.generate"),
          accent: true,
          onSelect: onGenerate,
        },
        {
          id: "mark-chat",
          label: t("construct.contextMenu.markForChat"),
          onSelect: onMarkForChat,
        },
      ],
    },
    {
      items: [
        {
          id: "details",
          label: t("construct.contextMenu.viewDetails"),
          shortcut: "I",
          onSelect: onViewDetails,
        },
        {
          id: "view-code",
          label: t("construct.contextMenu.viewCode"),
          shortcut: "⇧C",
          disabled: !canEditCode,
          onSelect: onViewCode,
        },
        {
          id: "export",
          label: t("construct.contextMenu.export"),
          shortcut: "Ctrl+⇧E",
          disabled: !canEditCode,
          onSelect: onExport,
        },
        {
          id: "download",
          label: t("construct.contextMenu.download"),
          shortcut: "⇧D",
          disabled: !canEditCode,
          onSelect: onDownload,
        },
        {
          id: "refresh",
          label: t("construct.contextMenu.refresh"),
          shortcut: "Ctrl+R",
          onSelect: onRefresh,
        },
        {
          id: "lock",
          label: isLocked ? t("construct.contextMenu.unlock") : t("construct.contextMenu.lock"),
          onSelect: onLock,
        },
      ],
    },
  ];

  return (
    <ConstructContextMenuBase
      x={x}
      y={y}
      width={268}
      estimatedHeight={420}
      title={<span>{elementName}</span>}
      sections={sections}
      onClose={onClose}
    />
  );
}

/** @deprecated Use ConstructArtboardPanelContextMenu */
export { ConstructArtboardPanelContextMenu as default };
