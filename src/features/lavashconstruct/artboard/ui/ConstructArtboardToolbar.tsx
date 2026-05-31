import { Bookmark, Layers2, RefreshCw, Search } from "lucide-react";
import type { ComponentType } from "react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n/context";

type ToolDef = {
  id: "search" | "layers" | "mark" | "regenerate";
  labelKey: string;
  Icon: ComponentType<{ size?: number; strokeWidth?: number }>;
  accent?: boolean;
};

const TOOLS: ToolDef[] = [
  { id: "search", Icon: Search, labelKey: "construct.rail.search" },
  { id: "layers", Icon: Layers2, labelKey: "construct.rail.layers" },
  { id: "mark", Icon: Bookmark, labelKey: "construct.rail.mark" },
  { id: "regenerate", Icon: RefreshCw, labelKey: "construct.rail.regenerate" },
];

type ConstructArtboardToolbarProps = {
  searchOpen: boolean;
  layersOpen: boolean;
  markMode: boolean;
  onToggleSearch: () => void;
  onToggleLayers: () => void;
  onToggleMark: () => void;
  onRegenerate: () => void;
};

export default function ConstructArtboardToolbar({
  searchOpen,
  layersOpen,
  markMode,
  onToggleSearch,
  onToggleLayers,
  onToggleMark,
  onRegenerate,
}: ConstructArtboardToolbarProps) {
  const { t } = useI18n();

  return (
    <div className="lc-artboard-toolbar" role="toolbar" aria-label={t("construct.artboard.toolbarAria")}>
      {TOOLS.map(({ id, Icon, labelKey, accent }) => {
        const label = t(labelKey);
        const active =
          id === "search" ? searchOpen : id === "layers" ? layersOpen : id === "mark" ? markMode : false;
        const onClick =
          id === "search"
            ? onToggleSearch
            : id === "layers"
              ? onToggleLayers
              : id === "mark"
                ? onToggleMark
                : onRegenerate;
        return (
          <button
            key={id}
            type="button"
            className={cn(
              "lc-artboard-toolbar__btn",
              active && "lc-artboard-toolbar__btn--active",
              accent && "lc-artboard-toolbar__btn--accent",
            )}
            aria-label={label}
            aria-pressed={active}
            data-tooltip={label}
            onClick={onClick}
          >
            <Icon size={18} strokeWidth={1.75} aria-hidden />
          </button>
        );
      })}
    </div>
  );
}
