/**
 * Football stat icons for compact player rows.
 * All use currentColor outline style — consistent with each other,
 * readable at 10-12px on dark backgrounds.
 */

interface IconProps {
  className?: string;
  size?: number;
}

/** Football — identical SVG to GoalBadge in player/index.tsx */
export function GoalIcon({ className = '', size = 12 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="11" fill="white" stroke="#d4d4d4" strokeWidth="0.8" />
      <polygon points="12,6.5 15.3,9 14.2,12.8 9.8,12.8 8.7,9" fill="#1a1a1a" />
      <polygon points="12,1.2 13.8,5.2 10.2,5.2" fill="#1a1a1a" />
      <polygon points="21,8 16.5,8.2 15.8,5.5" fill="#1a1a1a" />
      <polygon points="19.5,17.5 15.5,14.5 17,11" fill="#1a1a1a" />
      <polygon points="4.5,17.5 7,11 8.5,14.5" fill="#1a1a1a" />
      <polygon points="3,8 8.2,5.5 7.5,8.2" fill="#1a1a1a" />
      <path d="M12,6.5 L12,1.2 M15.3,9 L21,8 M14.2,12.8 L19.5,17.5 M9.8,12.8 L4.5,17.5 M8.7,9 L3,8" stroke="#1a1a1a" strokeWidth="0.6" fill="none" />
      <path d="M9.8,12.8 L8.5,17 M14.2,12.8 L15.5,17" stroke="#1a1a1a" strokeWidth="0.6" fill="none" />
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
