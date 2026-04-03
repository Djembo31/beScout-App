/**
 * Football stat icons for compact player rows.
 * All use currentColor outline style — consistent with each other,
 * readable at 10-12px on dark backgrounds.
 */

interface IconProps {
  className?: string;
  size?: number;
}

/** Football — clean outline, pentagon + 5 seam lines */
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
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.2" />
      <polygon points="8,4.2 10,5.6 9.3,8 6.7,8 6,5.6" stroke="currentColor" strokeWidth="0.8" fill="none" strokeLinejoin="round" />
      <path d="M8,4.2 L8,1.8 M10,5.6 L12.8,4.8 M9.3,8 L11.5,10.8 M6.7,8 L4.5,10.8 M6,5.6 L3.2,4.8" stroke="currentColor" strokeWidth="0.7" />
    </svg>
  );
}

/** Football boot — clean outline, recognizable side profile */
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
        d="M5.5 3.5L4.5 7L3.5 9.5L3 11H13L13 9.5C13 9.5 11.5 8 9.5 7.5L7 7L6 5L5.5 3.5Z"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinejoin="round"
      />
      <line x1="3" y1="12.5" x2="13" y2="12.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
      <path d="M5 12.5V13.5M7.5 12.5V13.5M10 12.5V13.5" stroke="currentColor" strokeWidth="0.9" strokeLinecap="round" />
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
