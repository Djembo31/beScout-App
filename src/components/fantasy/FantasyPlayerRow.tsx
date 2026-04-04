'use client';

import React from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { cn, fmtScout } from '@/lib/utils';
import { getClub } from '@/lib/clubs';
import { posTintColors } from '@/components/player/PlayerRow';
import { PositionBadge } from '@/components/player/index';
import { FormBars } from '@/components/player';
import FDRBadge from './FDRBadge';
import type { Pos } from '@/types';

interface FantasyPlayerRowProps {
  player: {
    id: string;
    first: string;
    last: string;
    pos: Pos;
    club: string;
    imageUrl?: string | null;
    ticket: number;
    status: string;
    perfL5: number;
    perfL15: number;
    matches: number;
    goals: number;
    assists: number;
    floorPrice: number;
    dpcOwned: number;
    dpcAvailable: number;
    eventsUsing: number;
  };
  formEntries: { score: number; status: 'played' | 'bench' | 'not_in_squad' }[];
  nextFixture?: {
    opponentShort: string;
    opponentName: string;
    isHome: boolean;
  } | null;
  opponentAvgL5: number;
  synergyPct: number | null;
  rowState: 'default' | 'selected' | 'locked' | 'deployed' | 'injured' | 'suspended';
  onClick: () => void;
}

const rowStateStyles: Record<FantasyPlayerRowProps['rowState'], string> = {
  default: 'bg-transparent',
  selected: 'bg-green-500/[0.08] border-l-2 border-l-green-500',
  locked: 'bg-emerald-500/[0.05]',
  deployed: 'opacity-40',
  injured: 'bg-red-500/[0.05] opacity-70',
  suspended: 'bg-amber-500/[0.05] opacity-70',
};

function StatusDot({ status }: { status: string }) {
  if (status === 'fit') return null;
  if (status === 'injured') return <span className="size-2 rounded-full bg-red-500 shrink-0" />;
  if (status === 'suspended') return <span className="size-2 rounded-full bg-amber-500 shrink-0" />;
  if (status === 'doubtful') return <span className="size-2 rounded-full bg-yellow-400 shrink-0" />;
  return null;
}

const FantasyPlayerRow = React.memo(function FantasyPlayerRow({
  player, formEntries, nextFixture, opponentAvgL5, synergyPct, rowState, onClick,
}: FantasyPlayerRowProps) {
  const t = useTranslations('fantasy');
  const tint = posTintColors[player.pos];
  const clubData = getClub(player.club);
  const opponentClub = nextFixture ? getClub(nextFixture.opponentShort) : null;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full text-left px-3 py-2.5 transition-colors',
        'border-l-2 border-l-transparent',
        rowStateStyles[rowState],
      )}
      aria-label={`${player.first} ${player.last}`}
    >
      <div className="flex gap-3">
        {/* Photo */}
        <div className="shrink-0 relative">
          <div
            className="size-12 rounded-full overflow-hidden border-2"
            style={{ borderColor: `${tint}99` }}
          >
            {player.imageUrl ? (
              <img
                src={player.imageUrl}
                alt=""
                className="size-full object-cover"
                loading="lazy"
              />
            ) : (
              <div
                className="size-full flex items-center justify-center text-sm font-black text-white/60"
                style={{ backgroundColor: `${tint}22` }}
              >
                {player.first.charAt(0)}{player.last.charAt(0)}
              </div>
            )}
          </div>
          <StatusDot status={player.status} />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          {/* Line 1: Name + Shirt + Form + L5 */}
          <div className="flex items-center gap-1.5">
            <span className="font-black text-sm text-white truncate">
              {player.last.toUpperCase()}
            </span>
            <span className="font-mono text-xs text-white/30 tabular-nums shrink-0">
              #{player.ticket}
            </span>
            <div className="ml-auto flex items-center gap-2 shrink-0">
              <FormBars entries={formEntries} />
              <div
                className="size-8 rounded-full flex items-center justify-center border-[1.5px]"
                style={{ backgroundColor: `${tint}33`, borderColor: `${tint}99` }}
              >
                <span className="font-mono font-black text-sm tabular-nums text-white/90">
                  {player.perfL5}
                </span>
              </div>
            </div>
          </div>

          {/* Line 2: Position + Club */}
          <div className="flex items-center gap-1.5 mt-0.5">
            <PositionBadge pos={player.pos} size="sm" />
            {clubData?.logo && (
              <Image src={clubData.logo} alt="" width={16} height={16}
                className="size-4 shrink-0" aria-hidden="true" />
            )}
            <span className="text-xs text-white/50">{player.club}</span>
          </div>

          {/* Line 3: Next fixture + stats */}
          <div className="flex items-center gap-1.5 mt-0.5 text-xs text-white/40">
            {nextFixture ? (
              <>
                <span>{t('vsLabel')}</span>
                {opponentClub?.logo && (
                  <Image src={opponentClub.logo} alt="" width={14} height={14}
                    className="size-3.5 shrink-0" aria-hidden="true" />
                )}
                <span className="text-white/50">{nextFixture.opponentShort}</span>
                <FDRBadge opponentAvgL5={opponentAvgL5} />
              </>
            ) : (
              <span className="text-white/30">--</span>
            )}
            <span className="ml-auto font-mono tabular-nums text-white/50 shrink-0">
              {player.matches}{t('matchesShort')}{' '}
              {player.goals}{t('goalsShort')}{' '}
              {player.assists}{t('assistsShort')}
            </span>
          </div>

          {/* Line 4: Price + SC + Synergy */}
          <div className="flex items-center gap-2 mt-1 pt-1 border-t border-white/[0.06] text-[11px] text-white/40">
            <span className="font-mono tabular-nums">
              {fmtScout(player.floorPrice)} {t('crLabel')}
            </span>
            <span className="text-white/20">|</span>
            <span className="font-mono tabular-nums">
              {player.dpcAvailable}/{player.dpcOwned} {t('scLabel')}
            </span>
            {synergyPct !== null && synergyPct > 0 && (
              <>
                <span className="text-white/20">|</span>
                <span className="text-emerald-400 font-mono tabular-nums">
                  +{synergyPct}% {t('synergyLabel')}
                </span>
              </>
            )}
            {rowState === 'locked' && (
              <span className="ml-auto text-emerald-400 font-black text-[10px] animate-pulse motion-reduce:animate-none">
                {t('liveLabel')}
              </span>
            )}
            {rowState === 'deployed' && (
              <span className="ml-auto text-white/30 text-[10px]">
                {t('deployed')}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
});

export default FantasyPlayerRow;
