import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export type ImprovePromptIconMode = "idle" | "improving" | "undo" | "reverting";

const CLOUD_STROKE = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.65,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

type ConstructChatImprovePromptIconProps = {
  mode: ImprovePromptIconMode;
  className?: string;
};

/** Контурна хмаринка: випуклості зверху й знизу морфяться окремо. */
function ImproveCloudSvg({ className }: { className?: string }) {
  return (
    <svg
      viewBox="2 6.5 20 13.5"
      className={cn("lc-chat-improve-cloud", className)}
      aria-hidden
    >
      <g className="lc-chat-improve-cloud__base-wrap">
        <ellipse className="lc-chat-improve-cloud__base" cx="12" cy="16.6" rx="9.6" ry="3.15" {...CLOUD_STROKE} />
      </g>
      <g className="lc-chat-improve-cloud__bump lc-chat-improve-cloud__bump--bl">
        <ellipse cx="7.8" cy="17.9" rx="3.35" ry="2.15" {...CLOUD_STROKE} />
      </g>
      <g className="lc-chat-improve-cloud__bump lc-chat-improve-cloud__bump--br">
        <ellipse cx="16.2" cy="17.9" rx="3.35" ry="2.15" {...CLOUD_STROKE} />
      </g>
      <g className="lc-chat-improve-cloud__bump lc-chat-improve-cloud__bump--l">
        <ellipse cx="6.4" cy="13.4" rx="3.75" ry="3.25" {...CLOUD_STROKE} />
      </g>
      <g className="lc-chat-improve-cloud__bump lc-chat-improve-cloud__bump--m">
        <ellipse cx="12" cy="11" rx="4.85" ry="4.05" {...CLOUD_STROKE} />
      </g>
      <g className="lc-chat-improve-cloud__bump lc-chat-improve-cloud__bump--r">
        <ellipse cx="17.6" cy="13.2" rx="3.85" ry="3.15" {...CLOUD_STROKE} />
      </g>
      <g className="lc-chat-improve-cloud__bump lc-chat-improve-cloud__bump--t">
        <ellipse cx="15.2" cy="9.1" rx="2.65" ry="2.25" {...CLOUD_STROKE} />
      </g>
    </svg>
  );
}

/** Хмаринка → морф випуклостей → стрілка назад → знову хмаринка. */
export default function ConstructChatImprovePromptIcon({
  mode,
  className,
}: ConstructChatImprovePromptIconProps) {
  return (
    <span
      className={cn(
        "lc-chat-improve-icon",
        mode !== "idle" && `lc-chat-improve-icon--${mode}`,
        className,
      )}
      aria-hidden
    >
      <ImproveCloudSvg className="lc-chat-improve-icon__cloud" />
      <ArrowLeft size={18} strokeWidth={2.25} className="lc-chat-improve-icon__undo" />
    </span>
  );
}
