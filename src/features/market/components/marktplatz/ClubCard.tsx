'use client';

import React, { useMemo } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { PlayerPhoto, getL5Color } from '@/components/player';
import { LeagueBadge } from '@/components/ui/LeagueBadge';
import { getLeague } from '@/lib/leagues';
import type { Pos } from '@/types';
import CountdownBadge from './CountdownBadge';
import { cn } from '@/lib/utils';
import type { ClubLookup } from '@/lib/clubs';
import type { Player, DbIpo } from '@/types';

import { posDot as POS_DOT } from '@/components/player/positionColors';

const POS_LABEL: Record<Pos, string> = {
  GK: 'TW',
  DEF: 'DEF',
  MID: 'MID',
  ATT: 'STU',
};

interface ClubCardProps {
  club: ClubLookup;
  players: Player[];
  ipoMap: Map<string, DbIpo>;
  totalSold: number;
  totalOffered: number;
  earliestEnd: string | null;
  isExpanded: boolean;
  isFollowed: boolean;
  onToggle: () => void;
}

export default function ClubCard({
  club, players, ipoMap, totalSold, totalOffered,
  earliestEnd, isExpanded, isFollowed, onToggle,
}: ClubCardProps) {
  const t = useTranslations('market');
  const pc = club.colors.primary;
  const progress = totalOffered > 0 ? (totalSold / totalOffered) * 100 : 0;

  // Position breakdown
  const posCounts = useMemo(() => {
    const counts: Partial<Record<Pos, number>> = {};
    for (const p of players) counts[p.pos] = (counts[p.pos] ?? 0) + 1;
    return counts;
  }, [players]);

  // Soonest-ending player
  const soonestPlayer = useMemo(() => {
    let best: { player: Player; endsAt: string } | null = null;
    for (const p of players) {
      const ipo = ipoMap.get(p.id);
      if (!ipo) continue;
      if (!best || new Date(ipo.ends_at).getTime() < new Date(best.endsAt).getTime()) {
        best = { player: p, endsAt: ipo.ends_at };
      }
    }
    return best;
  }, [players, ipoMap]);

  return (
    <button
      onClick={onToggle}
      aria-expanded={isExpanded}
      aria-label={t('clubCardLabel', {
        club: club.name,
        count: players.length,
        defaultMessage: '{club} — {count} Scout Cards verfügbar',
      })}
      className={cn(
        'relative w-full text-left rounded-xl border p-2.5 transition-colors min-h-[44px]',
        'focus-visible:ring-2 focus-visible:ring-gold/50 focus-visible:ring-offset-1 focus-visible:ring-offset-bg-main outline-none',
        'active:scale-[0.97]',
        isExpanded
          ? 'bg-white/[0.06] border-white/[0.15]'
          : 'bg-surface-base border-white/[0.08] hover:border-white/[0.12]'
      )}
      style={{
        backgroundImage: `linear-gradient(180deg, ${pc}10, transparent 40%)`,
      }}
    >
      {/* Badges */}
      {isFollowed && (
        <div className="flex items-center gap-1 mb-1.5">
          <span className="px-1 py-0.5 bg-gold/15 rounded text-[8px] font-black text-gold leading-none">
            {t('followedBadge', { defaultMessage: 'Mein Club' })}
          </span>
        </div>
      )}

      {/* Club identity */}
      <div className="flex items-center gap-2 mb-2">
        {club.logo ? (
          <Image src={club.logo} alt="" width={28} height={28} className="size-7 rounded-full object-cover flex-shrink-0 ring-1 ring-white/10" />
        ) : (
          <div className="size-7 rounded-full flex-shrink-0 border border-white/10" style={{ backgroundColor: pc }} />
        )}
        <div className="min-w-0 flex-1">
          <div className="font-black text-[10px] text-white truncate leading-tight">{club.name}</div>
          {(() => {
            const leagueMeta = getLeague(club.league);
            if (leagueMeta) {
              return (
                <div className="mt-0.5">
                  <LeagueBadge
                    logoUrl={leagueMeta.logoUrl}
                    name={leagueMeta.name}
                    short={leagueMeta.short}
                    size="xs"
                  />
                </div>
              );
            }
            return <div className="text-[9px] text-white/40 truncate leading-tight">{club.league}</div>;
          })()}
        </div>
      </div>

      {/* Stats: DPC count + position dots */}
      <div className="flex items-center gap-1.5 mb-2 flex-wrap">
        <span className="font-mono font-black text-[10px] text-gold tabular-nums">{players.length}</span>
        <span className="text-[9px] text-white/40">Scout Cards</span>
        <span className="text-white/10 mx-0.5">|</span>
        {(['GK', 'DEF', 'MID', 'ATT'] as Pos[]).map(pos => {
          const count = posCounts[pos];
          if (!count) return null;
          return (
            <span key={pos} className="flex items-center gap-0.5">
              <span className={cn('size-1.5 rounded-full', POS_DOT[pos])} />
              <span className="text-[9px] text-white/50 font-mono tabular-nums">{count}</span>
            </span>
          );
        })}
      </div>

      {/* Progress bar — compact */}
      <div className="mb-2">
        <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-vivid-green transition-colors"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
        <div className="flex items-center justify-between mt-0.5">
          <span className="text-[9px] text-white/40 tabular-nums font-mono">
            {totalSold}/{totalOffered}
          </span>
          <span className="text-[9px] text-white/40 tabular-nums font-mono font-bold">
            {totalOffered - totalSold} {t('available', { defaultMessage: 'verfügbar' })}
          </span>
        </div>
      </div>

      {/* Soonest-ending player preview + countdown */}
      {soonestPlayer && (
        <div className="flex items-center gap-1.5 pt-1.5 border-t border-divider">
          <PlayerPhoto
            imageUrl={soonestPlayer.player.imageUrl}
            first={soonestPlayer.player.first}
            last={soonestPlayer.player.last}
            pos={soonestPlayer.player.pos}
            size={18}
          />
          <span className="text-[9px] text-white/50 truncate flex-1 min-w-0">
            {soonestPlayer.player.last}
          </span>
          <span className={cn('font-mono font-bold text-[9px] tabular-nums', getL5Color(soonestPlayer.player.perf.l5))}>
            {soonestPlayer.player.perf.l5}
          </span>
          <CountdownBadge targetDate={soonestPlayer.endsAt} compact />
        </div>
      )}
    </button>
  );
}
