import { cn } from "@/lib/utils";

export type ConstructAgentToggleProps = {
  id: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
};

export function ConstructAgentSwitch(props: {
  id: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  const { id, checked, onChange, label, disabled = false } = props;
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      className={cn("lc-agent-switch lc-agent-switch--compact", checked && "lc-agent-switch--on")}
      onClick={() => onChange(!checked)}
    >
      <span className="lc-agent-switch__thumb" aria-hidden />
    </button>
  );
}

export function ConstructAgentToggle({
  id,
  checked,
  onChange,
  label,
  description,
  disabled = false,
}: ConstructAgentToggleProps) {
  return (
    <div className={cn("lc-agent-toggle-row", disabled && "lc-agent-toggle-row--disabled")}>
      <div className="lc-agent-toggle-row__text">
        <label htmlFor={id} className="lc-agent-toggle-row__label">
          {label}
        </label>
        {description ? <p className="lc-agent-toggle-row__desc">{description}</p> : null}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        className={cn("lc-agent-switch", checked && "lc-agent-switch--on")}
        onClick={() => onChange(!checked)}
      >
        <span className="lc-agent-switch__thumb" aria-hidden />
      </button>
    </div>
  );
}
