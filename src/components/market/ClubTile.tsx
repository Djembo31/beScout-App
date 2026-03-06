'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { Flame } from 'lucide-react';
import CountdownBadge from './CountdownBadge';
import { fmtScout, cn } from '@/lib/utils';
import type { ClubLookup } from '@/lib/clubs';

interface ClubTileProps {
  club: ClubLookup;
  dpcCount: number;
  avgPrice: number;
  earliestEnd: string | null;
  isHot?: boolean;
  isExpanded: boolean;
  onToggle: () => void;
}

export default function ClubTile({ club, dpcCount, avgPrice, earliestEnd, isHot, isExpanded, onToggle }: ClubTileProps) {
  const t = useTranslations('market');
  const primaryColor = club.colors.primary;

  return (
    <button
      onClick={onToggle}
      className={cn(
        'relative w-full text-left rounded-xl border p-3 transition-colors group min-h-[44px]',
        isExpanded
          ? 'bg-white/[0.06] border-white/[0.15]'
          : 'bg-surface-base border-white/[0.08] hover:border-white/[0.12]'
      )}
      style={{
        borderLeftWidth: 3,
        borderLeftColor: primaryColor,
        backgroundImage: `linear-gradient(135deg, ${primaryColor}12, transparent 60%)`,
      }}
    >
      {isHot && (
        <div className="absolute top-2 right-2 flex items-center gap-0.5 px-1.5 py-0.5 bg-vivid-red/15 rounded text-[9px] font-black text-vivid-red">
          <Flame className="size-2.5" aria-hidden="true" />
          HOT
        </div>
      )}

      <div className="flex items-center gap-2 mb-2">
        {club.logo ? (
          <img src={club.logo} alt="" className="size-7 rounded-full object-cover flex-shrink-0" />
        ) : (
          <div className="size-7 rounded-full flex-shrink-0 border border-white/10" style={{ backgroundColor: primaryColor }} />
        )}
        <div className="min-w-0 flex-1">
          <div className="font-bold text-sm text-white truncate">{club.name}</div>
          <div className="text-[9px] text-white/30 truncate">{club.league}</div>
        </div>
      </div>

      <div className="flex items-center justify-between text-[10px] tabular-nums">
        <span className="text-white/50">
          {dpcCount} {t('dpcAvailable', { defaultMessage: 'DPCs' })}
        </span>
        {avgPrice > 0 && (
          <span className="font-mono font-bold text-gold">
            {t('avgSymbol', { defaultMessage: 'Ø' })} {fmtScout(avgPrice)}
          </span>
        )}
      </div>

      {earliestEnd && (
        <div className="mt-1.5">
          <CountdownBadge targetDate={earliestEnd} compact />
        </div>
      )}
    </button>
  );
}
