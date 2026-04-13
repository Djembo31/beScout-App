'use client';

import React, { memo } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface LeagueBadgeProps {
  logoUrl?: string | null;
  name: string;
  short: string;
  size?: 'xs' | 'sm';
  className?: string;
}

/**
 * Inline league badge with logo + label.
 * - xs (12px logo): for meta lines in PlayerIdentity, BestandRow, KaderRow
 * - sm (16px logo): for card headers, filter pills, event headers
 */
function LeagueBadgeInner({ logoUrl, name, short, size = 'xs', className }: LeagueBadgeProps) {
  const logoSize = size === 'xs' ? 12 : 16;
  const textClass = size === 'xs' ? 'text-[10px]' : 'text-xs';
  const label = size === 'xs' ? short : name;

  return (
    <span className={cn('inline-flex items-center gap-1 shrink-0', className)} title={name}>
      {logoUrl ? (
        <Image
          src={logoUrl}
          alt={name}
          width={logoSize}
          height={logoSize}
          className="rounded-sm object-contain shrink-0"
          unoptimized
        />
      ) : (
        <span
          className="rounded-sm bg-white/10 shrink-0 flex items-center justify-center font-mono font-bold text-white/40"
          style={{ width: logoSize, height: logoSize, fontSize: logoSize * 0.5 }}
          aria-hidden="true"
        >
          {short.charAt(0)}
        </span>
      )}
      <span className={cn('font-bold text-white/40 leading-none', textClass)}>{label}</span>
    </span>
  );
}

export const LeagueBadge = memo(LeagueBadgeInner);
export default LeagueBadge;
