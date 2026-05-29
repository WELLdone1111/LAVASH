type ConstructModelRailIconProps = {
  size?: number;
  className?: string;
};

/** Схема «вузлів навколо ядра» — власний контур, не копія референсу. */
export default function ConstructModelRailIcon({ size = 20, className }: ConstructModelRailIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden
    >
      <path
        d="M12 5.25 17.2 8.25v6.5L12 17.75 6.8 14.75v-6.5L12 5.25Z"
        stroke="currentColor"
        strokeWidth="1.45"
        strokeLinejoin="round"
      />
      <path
        d="M12 8.6 14.35 10v4L12 15.4 9.65 14V10L12 8.6Z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
        opacity="0.92"
      />
      <circle cx="12" cy="12" r="1.05" fill="currentColor" />
      <path
        d="M12 2.75v2.1M12 19.15v2.1M21.25 12h-2.1M4.85 12h-2.1"
        stroke="currentColor"
        strokeWidth="1.15"
        strokeLinecap="round"
        opacity="0.55"
      />
      <circle cx="12" cy="3.1" r="1.2" fill="currentColor" />
      <circle cx="19.4" cy="8.1" r="1.2" fill="currentColor" />
      <circle cx="19.4" cy="15.9" r="1.2" fill="currentColor" />
      <circle cx="12" cy="20.9" r="1.2" fill="currentColor" />
      <circle cx="4.6" cy="15.9" r="1.2" fill="currentColor" />
      <circle cx="4.6" cy="8.1" r="1.2" fill="currentColor" />
      <path
        d="M12 5.8 12 3.1M16.5 7.5 18.5 6.2M16.5 16.5 18.5 17.8M12 18.2 12 20.9M7.5 16.5 5.5 17.8M7.5 7.5 5.5 6.2"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
        strokeDasharray="1.6 2.2"
        opacity="0.42"
      />
    </svg>
  );
}
