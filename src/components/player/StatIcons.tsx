/**
 * Premium football stat icons for compact player rows.
 * White fill on dark background — matches GoalBadge visual language.
 * Designed to be crisp and recognizable at 10-14px.
 */

interface IconProps {
  className?: string;
  size?: number;
}

/**
 * Football — simplified for 10-12px inline use.
 * White circle with pentagon outline only (no fill, no surrounding triangles).
 * Scales down cleanly unlike the full GoalBadge pattern.
 */
export function GoalIcon({ className = '', size = 12 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      className={className}
      aria-hidden="true"
    >
      <circle cx="8" cy="8" r="7" fill="white" stroke="#d4d4d4" strokeWidth="0.6" />
      <polygon points="8,4 10.4,5.8 9.5,8.5 6.5,8.5 5.6,5.8" fill="none" stroke="#1a1a1a" strokeWidth="1" strokeLinejoin="round" />
      <path d="M8,4 L8,1.5 M10.4,5.8 L13.5,5 M9.5,8.5 L11.5,12 M6.5,8.5 L4.5,12 M5.6,5.8 L2.5,5" stroke="#1a1a1a" strokeWidth="0.7" />
    </svg>
  );
}

/**
 * Football boot — premium side profile with studs and lacing detail.
 * White silhouette on dark background, same visual weight as GoalIcon.
 */
export function AssistIcon({ className = '', size = 12 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
    >
      {/* Boot body — ankle to toe */}
      <path
        d="M6 4C6 4 5 7 5 9L4 12L3 14.5L3.5 15.5L7 16L22 16L22 14C22 14 20 12 17 11L12 10L9 9L8 7L7 4.5Z"
        fill="white"
        stroke="#999"
        strokeWidth="0.4"
      />
      {/* Sole plate */}
      <path
        d="M3.5 15.5L3 17L4 18.5L7.5 19L20 19L22 18L22 16L7 16Z"
        fill="#e5e5e5"
        stroke="#999"
        strokeWidth="0.4"
      />
      {/* Studs */}
      <rect x="5" y="19" width="1.5" height="2" rx="0.4" fill="#1a1a1a" />
      <rect x="9" y="19" width="1.5" height="2" rx="0.4" fill="#1a1a1a" />
      <rect x="13" y="19" width="1.5" height="2" rx="0.4" fill="#1a1a1a" />
      <rect x="17" y="19" width="1.5" height="2" rx="0.4" fill="#1a1a1a" />
      {/* Lacing detail */}
      <path d="M8 6L10 7.5M7.5 7.5L9.5 9" stroke="#bbb" strokeWidth="0.6" strokeLinecap="round" />
      {/* Toe cap line */}
      <path d="M17 11.5C19 12.5 20.5 13.5 21 14.5" stroke="#ccc" strokeWidth="0.5" fill="none" />
    </svg>
  );
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
