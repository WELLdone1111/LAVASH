type MonitorActivityIconProps = {
  size?: number;
  className?: string;
};

/** Монітор з трьома стовпчиками — як у Trae Resources Explorer. */
export default function MonitorActivityIcon({ size = 14, className }: MonitorActivityIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <rect
        x="1.5"
        y="2"
        width="13"
        height="9.5"
        rx="1.25"
        stroke="currentColor"
        strokeWidth="1.2"
      />
      <path d="M6 14h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M8 11.5V14" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <rect x="4.2" y="7.1" width="1.3" height="2.2" rx="0.35" fill="currentColor" opacity="0.55" />
      <rect x="7.35" y="5.4" width="1.3" height="3.9" rx="0.35" fill="currentColor" />
      <rect x="10.5" y="6.5" width="1.3" height="2.8" rx="0.35" fill="currentColor" opacity="0.75" />
    </svg>
  );
}
