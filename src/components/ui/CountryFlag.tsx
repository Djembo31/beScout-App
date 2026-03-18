'use client';

import React from 'react';
import * as Flags3x2 from 'country-flag-icons/react/3x2';
import { hasFlag } from 'country-flag-icons';
import { cn } from '@/lib/utils';

interface CountryFlagProps {
  /** ISO 3166-1 alpha-2 country code (e.g. "TR", "DE") */
  code: string;
  /** Height in px (width = height * 1.5 for 3:2 aspect ratio) */
  size?: number;
  className?: string;
}

/**
 * Renders an SVG country flag from country-flag-icons.
 * Replaces emoji flags which don't render on Windows 10.
 * Falls back to a text badge with the country code if no flag is available.
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

  // The library types each flag as (props: HTMLAttributes & SVGAttributes) => JSX.Element
  // We cast to a generic component accepting common HTML/SVG attributes
  const FlagComponent = (Flags3x2 as Record<string, React.ComponentType<
    React.HTMLAttributes<HTMLElement> & React.SVGAttributes<SVGElement> & { style?: React.CSSProperties }
  >>)[upperCode];

  if (!FlagComponent) {
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

  return (
    <FlagComponent
      title={upperCode}
      className={cn('rounded-sm shrink-0', className)}
      style={{ height: size, width: size * 1.5 }}
    />
  );
}
