/**
 * Tiny football stat icons (10-12px) for compact player rows.
 * Designed to be readable at small sizes on dark backgrounds.
 */

interface IconProps {
  className?: string;
  size?: number;
}

/** Classic football / soccer ball — pentagon pattern on circle */
export function GoalIcon({ className = '', size = 12 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.2" />
      <path
        d="M8 3L10.5 5L9.5 8L6.5 8L5.5 5Z"
        fill="currentColor"
        opacity="0.9"
      />
      <path d="M8 1.5V3M13 5.5L10.5 5M12.5 11L9.5 8M3.5 11L6.5 8M3 5.5L5.5 5" stroke="currentColor" strokeWidth="0.8" />
    </svg>
  );
}

/** Football boot / cleat — side profile */
export function AssistIcon({ className = '', size = 12 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M2 11.5L3.5 6L7 5L10 5.5L13 7L14 9L14 11L12 12H3L2 11.5Z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <path d="M3 12V13.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      <path d="M5.5 12V13.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      <path d="M8 12V13.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      <path d="M10.5 11.5V13" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
}

/** Football pitch — rectangle with center circle and line */
export function MatchIcon({ className = '', size = 12 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <rect x="1" y="3" width="14" height="10" rx="1" stroke="currentColor" strokeWidth="1.2" />
      <line x1="8" y1="3" x2="8" y2="13" stroke="currentColor" strokeWidth="0.8" />
      <circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="0.8" />
      <rect x="1" y="5.5" width="2.5" height="5" stroke="currentColor" strokeWidth="0.7" />
      <rect x="12.5" y="5.5" width="2.5" height="5" stroke="currentColor" strokeWidth="0.7" />
    </svg>
  );
}
