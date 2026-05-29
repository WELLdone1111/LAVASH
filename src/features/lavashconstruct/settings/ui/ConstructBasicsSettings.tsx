import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import "./ConstructBasicsSettings.css";

export function BasicsSettingsSection(props: {
  title?: ReactNode;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
}) {
  return (
    <section className={cn("lc-basics-settings", props.className)}>
      {props.title ? (
        <div className="lc-basics-settings__head">
          <h3 className="lc-basics-settings__title">{props.title}</h3>
          {props.action}
        </div>
      ) : null}
      {props.children}
    </section>
  );
}

export function BasicsSettingsCard(props: { children: ReactNode; className?: string }) {
  return <div className={cn("lc-basics-settings__card", props.className)}>{props.children}</div>;
}

export function BasicsSettingsRow(props: {
  label: string;
  description?: string;
  children: ReactNode;
  stack?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("lc-basics-settings__row", props.stack && "lc-basics-settings__row--stack", props.className)}>
      <div className="lc-basics-settings__row-text">
        <span className="lc-basics-settings__label">{props.label}</span>
        {props.description ? <p className="lc-basics-settings__desc">{props.description}</p> : null}
      </div>
      <div className="lc-basics-settings__control">{props.children}</div>
    </div>
  );
}

export function BasicsSettingsSelect<T extends string>(props: {
  id?: string;
  value: T;
  onChange: (value: T) => void;
  options: readonly { value: T; label: string }[];
  ariaLabel: string;
  disabled?: boolean;
}) {
  return (
    <div className="lc-basics-settings__select-wrap">
      <select
        id={props.id}
        className="lc-basics-settings__select"
        value={props.value}
        aria-label={props.ariaLabel}
        disabled={props.disabled}
        onChange={(e) => props.onChange(e.target.value as T)}
      >
        {props.options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown size={14} strokeWidth={2} className="lc-basics-settings__select-chevron" aria-hidden />
    </div>
  );
}

export function BasicsSettingsInput(props: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  type?: "text" | "password";
  placeholder?: string;
  ariaLabel: string;
}) {
  return (
    <input
      id={props.id}
      type={props.type ?? "text"}
      className="lc-basics-settings__input"
      value={props.value}
      placeholder={props.placeholder}
      aria-label={props.ariaLabel}
      autoComplete="off"
      spellCheck={false}
      onChange={(e) => props.onChange(e.target.value)}
      onBlur={props.onBlur}
    />
  );
}
