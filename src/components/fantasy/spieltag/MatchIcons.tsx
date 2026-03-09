// Match event SVG icons — premium replacements for emoji/text badges
// All icons: aria-hidden, flex-shrink-0, viewBox-based scaling

import { useId } from 'react';

interface IconProps {
  size?: number;
  className?: string;
}

/** Classic soccer ball — black pentagons on white, scales from 10-24px */
export function GoalIcon({ size = 12, className = '' }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={`flex-shrink-0 ${className}`}
    >
      <circle cx="12" cy="12" r="11" fill="white" stroke="#d4d4d4" strokeWidth="0.8" />
      {/* Center pentagon */}
      <polygon points="12,6.5 15.3,9 14.2,12.8 9.8,12.8 8.7,9" fill="#1a1a1a" />
      {/* Top pentagon */}
      <polygon points="12,1.2 13.8,5.2 10.2,5.2" fill="#1a1a1a" />
      {/* Top-right pentagon */}
      <polygon points="21,8 16.5,8.2 15.8,5.5" fill="#1a1a1a" />
      {/* Bottom-right pentagon */}
      <polygon points="19.5,17.5 15.5,14.5 17,11" fill="#1a1a1a" />
      {/* Bottom-left pentagon */}
      <polygon points="4.5,17.5 7,11 8.5,14.5" fill="#1a1a1a" />
      {/* Top-left pentagon */}
      <polygon points="3,8 8.2,5.5 7.5,8.2" fill="#1a1a1a" />
      {/* Seam lines connecting pentagons */}
      <path
        d="M12,6.5 L12,1.2 M15.3,9 L21,8 M14.2,12.8 L19.5,17.5 M9.8,12.8 L4.5,17.5 M8.7,9 L3,8"
        stroke="#1a1a1a"
        strokeWidth="0.6"
        fill="none"
      />
      {/* Bottom seam */}
      <path d="M9.8,12.8 L8.5,17 M14.2,12.8 L15.5,17" stroke="#1a1a1a" strokeWidth="0.6" fill="none" />
    </svg>
  );
}

/** Football boot side profile — sky-400 default */
export function AssistIcon({ size = 12, className = '' }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={`flex-shrink-0 ${className}`}
    >
      <path
        d="M3 16.5C3 16.5 4 14 7 13.5C8.5 13.2 10 12 11.5 11L15 9L17.5 8.5L20 9.5L21 11.5L20.5 13.5L18 15H14L12 16.5H8L6 17.5H3V16.5Z"
        fill="#38bdf8"
        stroke="#38bdf8"
        strokeWidth="0.5"
        strokeLinejoin="round"
      />
      {/* Studs */}
      <rect x="5" y="17.5" width="1.5" height="2" rx="0.3" fill="#38bdf8" />
      <rect x="8" y="17" width="1.5" height="2" rx="0.3" fill="#38bdf8" />
      <rect x="11" y="16.5" width="1.5" height="2" rx="0.3" fill="#38bdf8" />
    </svg>
  );
}

/** Rounded rectangle tilted 8deg CW — yellow-400 fill */
export function YellowCardIcon({ size = 10, className = '' }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      width={size * 0.7}
      height={size}
      viewBox="0 0 14 20"
      className={`flex-shrink-0 ${className}`}
    >
      <rect
        x="1"
        y="1"
        width="12"
        height="18"
        rx="1.5"
        fill="#facc15"
        transform="rotate(8 7 10)"
      />
    </svg>
  );
}

/** Same shape as YellowCard — red-500 fill */
export function RedCardIcon({ size = 10, className = '' }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      width={size * 0.7}
      height={size}
      viewBox="0 0 14 20"
      className={`flex-shrink-0 ${className}`}
    >
      <rect
        x="1"
        y="1"
        width="12"
        height="18"
        rx="1.5"
        fill="#ef4444"
        transform="rotate(8 7 10)"
      />
    </svg>
  );
}

/** Small upward triangle — emerald-400 */
export function SubInIcon({ size = 12, className = '' }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={`flex-shrink-0 ${className}`}
    >
      <polygon points="12,4 22,20 2,20" fill="#34d399" />
    </svg>
  );
}

/** Small downward triangle — red-400 */
export function SubOutIcon({ size = 12, className = '' }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={`flex-shrink-0 ${className}`}
    >
      <polygon points="2,4 22,4 12,20" fill="#f87171" />
    </svg>
  );
}

/** Shield outline with checkmark — emerald-400 */
export function CleanSheetIcon({ size = 12, className = '' }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={`flex-shrink-0 ${className}`}
    >
      {/* Shield */}
      <path
        d="M12 2L4 6V11C4 16.25 7.4 21.05 12 22C16.6 21.05 20 16.25 20 11V6L12 2Z"
        fill="#34d399"
        fillOpacity="0.15"
        stroke="#34d399"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      {/* Checkmark */}
      <path
        d="M8.5 12.5L11 15L15.5 9.5"
        stroke="#34d399"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** 3-point crown — gold gradient fill */
export function MvpCrownIcon({ size = 12, className = '' }: IconProps) {
  const gradientId = useId();
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={`flex-shrink-0 ${className}`}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFE44D" />
          <stop offset="100%" stopColor="#E6B800" />
        </linearGradient>
      </defs>
      <path
        d="M2 18L4 8L8 12L12 4L16 12L20 8L22 18H2Z"
        fill={`url(#${gradientId})`}
        stroke="#E6B800"
        strokeWidth="0.8"
        strokeLinejoin="round"
      />
      {/* Jewel dots on crown points */}
      <circle cx="12" cy="4" r="1.2" fill="#FFE44D" />
      <circle cx="8" cy="12" r="0.9" fill="#FFE44D" />
      <circle cx="16" cy="12" r="0.9" fill="#FFE44D" />
    </svg>
  );
}
