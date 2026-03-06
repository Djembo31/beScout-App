'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { ChevronDown, Flame } from 'lucide-react';
import { PlayerPhoto, getL5Color } from '@/components/player';
import CountdownBadge from './CountdownBadge';
import { fmtScout, cn } from '@/lib/utils';
import type { ClubLookup } from '@/lib/clubs';
import type { Player, DbIpo } from '@/types';
import { centsToBsd } from '@/lib/services/players';

interface ClubCardProps {
  club: ClubLookup;
  players: Player[];
  ipoMap: Map<string, DbIpo>;
  totalSold: number;
  totalOffered: number;
  earliestEnd: string | null;
  isHot: boolean;
  isExpanded: boolean;
  isFollowed: boolean;
  onToggle: () => void;
}

export default function ClubCard({
  club, players, ipoMap, totalSold, totalOffered,
  earliestEnd, isHot, isExpanded, isFollowed, onToggle,
}: ClubCardProps) {
  const t = useTranslations('market');
  const pc = club.colors.primary;
  const progress = totalOffered > 0 ? (totalSold / totalOffered) * 100 : 0;
  const topPlayers = players.slice(0, 3);

  return (
    <button
      onClick={onToggle}
      aria-expanded={isExpanded}
      aria-label={t('clubCardLabel', {
        club: club.name,
        count: players.length,
        defaultMessage: '{club} — {count} DPCs verfügbar',
      })}
      className={cn(
        'relative w-full text-left rounded-2xl border p-3.5 transition-all min-h-[44px]',
        'focus-visible:ring-2 focus-visible:ring-gold/50 focus-visible:ring-offset-1 focus-visible:ring-offset-bg-main outline-none',
        'active:scale-[0.98]',
        isExpanded
          ? 'bg-white/[0.06] border-white/[0.15]'
          : 'bg-surface-base border-white/[0.08] hover:border-white/[0.12]'
      )}
      style={{
        borderLeftWidth: 4,
        borderLeftColor: pc,
        backgroundImage: `linear-gradient(135deg, ${pc}18, transparent 50%)`,
      }}
    >
      {/* Top-right badges */}
      <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5">
        {isFollowed && (
          <span className="px-1.5 py-0.5 bg-gold/15 rounded text-[9px] font-black text-gold">
            {t('followedBadge', { defaultMessage: 'Mein Club' })}
          </span>
        )}
        {isHot && (
          <span className="flex items-center gap-0.5 px-1.5 py-0.5 bg-vivid-red/15 rounded text-[9px] font-black text-vivid-red">
            <Flame className="size-2.5" aria-hidden="true" />
            HOT
          </span>
        )}
      </div>

      {/* Club identity */}
      <div className="flex items-center gap-3 mb-3">
        {club.logo ? (
          <img src={club.logo} alt="" className="size-10 rounded-full object-cover flex-shrink-0 ring-2 ring-white/10" />
        ) : (
          <div className="size-10 rounded-full flex-shrink-0 border-2 border-white/10" style={{ backgroundColor: pc }} />
        )}
        <div className="min-w-0 flex-1">
          <div className="font-black text-sm text-white truncate">{club.name}</div>
          <div className="text-[10px] text-white/40 truncate">{club.league}</div>
        </div>
      </div>

      {/* Top players preview */}
      <div className="space-y-1 mb-3">
        {topPlayers.map(p => {
          const ipo = ipoMap.get(p.id);
          return (
            <div key={p.id} className="flex items-center gap-2 text-[11px]">
              <PlayerPhoto imageUrl={p.imageUrl} first={p.first} last={p.last} pos={p.pos} size={20} />
              <span className="text-white/70 truncate flex-1">{p.last}</span>
              <span className={cn('font-mono font-bold tabular-nums', getL5Color(p.perf.l5))}>{p.perf.l5}</span>
              {ipo && (
                <span className="font-mono font-bold text-gold tabular-nums">
                  {fmtScout(centsToBsd(ipo.price))}
                </span>
              )}
            </div>
          );
        })}
        {players.length > 3 && (
          <div className="text-[10px] text-white/30 pl-7">
            +{players.length - 3} {t('morePlayers', { defaultMessage: 'weitere' })}
          </div>
        )}
      </div>

      {/* Scarcity bar */}
      <div className="mb-2">
        <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-vivid-green transition-all"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
        <div className="flex items-center justify-between mt-0.5 text-[10px] tabular-nums font-mono">
          <span className="text-white/40">
            {totalSold}/{totalOffered} {t('sold', { defaultMessage: 'verkauft' })}
          </span>
          <span className="text-white/50">
            {totalOffered - totalSold} {t('available', { defaultMessage: 'verfügbar' })}
          </span>
        </div>
      </div>

      {/* Countdown + expand hint */}
      <div className="flex items-center justify-between">
        {earliestEnd ? (
          <CountdownBadge targetDate={earliestEnd} />
        ) : (
          <span />
        )}
        <ChevronDown
          className={cn(
            'size-4 text-white/30 transition-transform',
            isExpanded && 'rotate-180'
          )}
          aria-hidden="true"
        />
      </div>
    </button>
  );
}
