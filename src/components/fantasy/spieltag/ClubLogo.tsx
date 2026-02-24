'use client';

import React from 'react';
import type { ClubLookup } from '@/lib/clubs';

/** Reusable club logo — <img> with fallback to colored circle */
export function ClubLogo({ club, size = 28, short }: { club: ClubLookup | null; size?: number; short?: string }) {
  if (club?.logo) {
    return (
      <img
        src={club.logo}
        alt={club.name}
        width={size}
        height={size}
        className="rounded-full object-cover flex-shrink-0"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className="rounded-full flex items-center justify-center font-black flex-shrink-0"
      style={{
        width: size,
        height: size,
        fontSize: Math.max(8, size * 0.32),
        backgroundColor: (club?.colors.primary ?? '#333') + '25',
        color: club?.colors.primary ?? '#fff',
      }}
    >
      {(short ?? club?.short ?? '???').slice(0, 3)}
    </div>
  );
}
