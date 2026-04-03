/** Football pitch icon for compact player rows (matches stat display). */

interface IconProps {
  className?: string;
  size?: number;
}

/** Football pitch — rectangle with center circle, halfway line, penalty areas */
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
