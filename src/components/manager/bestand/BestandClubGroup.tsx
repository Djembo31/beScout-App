'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { getClub } from '@/lib/clubs';
import { cn } from '@/lib/utils';

interface BestandClubGroupProps {
  clubId: string;
  clubName: string;
  playerCount: number;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

export default function BestandClubGroup({ clubId, clubName, playerCount, isExpanded, onToggle, children }: BestandClubGroupProps) {
  const t = useTranslations('market');
  const clubData = getClub(clubId);

  return (
    <div className="border border-white/[0.06] rounded-xl overflow-hidden">
      <button
        onClick={onToggle}
        aria-expanded={isExpanded}
        className="w-full flex items-center gap-3 px-4 py-3 bg-surface-minimal hover:bg-white/[0.04] transition-colors text-left"
      >
        {clubData?.logo ? (
          <img src={clubData.logo} alt="" className="size-6 rounded-full object-cover shrink-0" />
        ) : clubData?.colors?.primary ? (
          <div className="size-6 rounded-full shrink-0" style={{ backgroundColor: clubData.colors.primary }} />
        ) : (
          <div className="size-6 rounded-full bg-white/10 shrink-0" />
        )}
        <span className="font-bold text-sm flex-1">{clubName}</span>
        <span className="text-[11px] text-white/40 font-mono tabular-nums">{t('bestandPlayersCount', { count: playerCount })}</span>
        {isExpanded
          ? <ChevronDown className="size-4 text-white/30" aria-hidden="true" />
          : <ChevronRight className="size-4 text-white/30" aria-hidden="true" />
        }
      </button>
      {isExpanded && (
        <div className={cn('p-2 space-y-1.5 anim-dropdown')}>
          {children}
        </div>
      )}
    </div>
  );
}
