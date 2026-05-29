import type { ConstructEditableState } from "@/features/lavashconstruct/artboard/ui/types";
import { useConstructStore } from "@/features/lavashconstruct/artboard/model/store";

type ConstructWorkspaceArtboardSettingsSectionProps = {
  constructState: ConstructEditableState;
};

export default function ConstructWorkspaceArtboardSettingsSection({
  constructState,
}: ConstructWorkspaceArtboardSettingsSectionProps) {
  const commitConstructState = useConstructStore((s) => s.commitConstructState);

  return (
    <>
      <div className="lc-control-row">
        <span>Grid (dots)</span>
        <button
          type="button"
          className="lc-toggle-dot-button"
          aria-pressed={constructState.isArtboardGridDotsVisible}
          onClick={() =>
            commitConstructState("Toggle artboard grid dots", {
              isArtboardGridDotsVisible: !constructState.isArtboardGridDotsVisible,
            })
          }
        >
          <span className={`lc-toggle-dot${constructState.isArtboardGridDotsVisible ? " lc-toggle-dot--on" : ""}`} />
        </button>
      </div>
      <div className="lc-control-row">
        <span>Magnetic snap</span>
        <button
          type="button"
          className="lc-toggle-dot-button"
          aria-pressed={constructState.isPanelAlignmentSnapEnabled}
          onClick={() =>
            commitConstructState("Toggle panel alignment snap", {
              isPanelAlignmentSnapEnabled: !constructState.isPanelAlignmentSnapEnabled,
            })
          }
        >
          <span className={`lc-toggle-dot${constructState.isPanelAlignmentSnapEnabled ? " lc-toggle-dot--on" : ""}`} />
        </button>
      </div>
      <div className="setting-row">
        <div className="setting-row-head">
          <label htmlFor="lavash-artboard-threshold">Magnetic Threshold</label>
          <span>{constructState.magneticThreshold}px</span>
        </div>
        <input
          id="lavash-artboard-threshold"
          className="setting-range-input"
          type="range"
          min={1}
          max={50}
          value={constructState.magneticThreshold}
          disabled={!constructState.isPanelAlignmentSnapEnabled}
          onChange={(event) =>
            commitConstructState(
              "Adjust magnetic threshold",
              { magneticThreshold: Number(event.currentTarget.value) },
              { mergeKey: "magnetic-threshold", mergeWindowMs: 340 },
            )
          }
        />
      </div>
    </>
  );
}
