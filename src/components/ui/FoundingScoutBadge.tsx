'use client';

import React from 'react';

interface FoundingScoutBadgeProps {
  rank?: number;
  size?: 'sm' | 'md';
}

export default function FoundingScoutBadge({ rank, size = 'md' }: FoundingScoutBadgeProps) {
  const isSm = size === 'sm';

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-lg border border-[#FFD700]/30 bg-gradient-to-r from-[#FFD700]/15 to-amber-500/10 ${
        isSm ? 'px-2 py-0.5' : 'px-2.5 py-1'
      }`}
    >
      <span className={isSm ? 'text-xs' : 'text-sm'}>🌟</span>
      <span className={`font-black text-[#FFD700] ${isSm ? 'text-[10px]' : 'text-xs'}`}>
        Founding Scout
      </span>
      {rank && (
        <span className={`font-mono font-bold text-[#FFD700]/60 ${isSm ? 'text-[9px]' : 'text-[10px]'}`}>
          #{rank}
        </span>
      )}
    </div>
  );
}
