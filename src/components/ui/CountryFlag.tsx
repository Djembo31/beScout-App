'use client';

import React from 'react';
import { hasFlag } from 'country-flag-icons';
import { cn } from '@/lib/utils';

interface CountryFlagProps {
  /** ISO 3166-1 alpha-2 country code (e.g. "TR", "DE"). GB-subdivisions
   *  like "GB-ENG" are supported where a matching file exists. */
  code: string;
  /** Height in px (width = height * 1.5 for 3:2 aspect ratio) */
  size?: number;
  className?: string;
}

/**
 * Renders an SVG country flag via <img src="/flags/3x2/{CODE}.svg">.
 *
 * Slice 120: static-asset approach replaces the previous
 * `import * as Flags from 'country-flag-icons/react/3x2'` namespace import,
 * which bundled the full 235 kB flag-component library on every page.
 * SVGs are served from `public/flags/3x2/` (CDN cached, browser cached).
 *
 * Falls back to a text badge with the country code when `hasFlag(code)`
 * is false (unknown / non-standard code).
 */
export default function CountryFlag({ code, size = 16, className }: CountryFlagProps) {
  const upperCode = code?.toUpperCase() ?? '';

  if (!upperCode || !hasFlag(upperCode)) {
    return (
      <span
        className={cn(
          'inline-flex items-center justify-center rounded-sm bg-white/10 text-[8px] font-bold text-white/50',
          className
        )}
        style={{ width: size * 1.5, height: size }}
      >
        {upperCode}
      </span>
    );
  }

  // Filenames mirror the original package: "GB-ENG.svg" stays hyphenated,
  // unlike the React exports which use underscores. `hasFlag` accepts the
  // hyphenated form directly, so no conversion needed for the src path.
  return (
    <img
      src={`/flags/3x2/${upperCode}.svg`}
      alt={upperCode}
      title={upperCode}
      width={size * 1.5}
      height={size}
      loading="lazy"
      decoding="async"
      className={cn('rounded-sm shrink-0 inline-block', className)}
      style={{ height: size, width: size * 1.5 }}
    />
  );
}
