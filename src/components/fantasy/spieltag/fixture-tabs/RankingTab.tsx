'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { PlayerPhoto, GoalBadge } from '@/components/player';
import { ClubLogo } from '../ClubLogo';
import { posColor, getPosAccent, ratingHeatStyle, getRating } from '../helpers';
import { GoalIcon, AssistIcon, YellowCardIcon, RedCardIcon, MvpCrownIcon } from '../MatchIcons';
import { cn, fmtScout } from '@/lib/utils';
import type { FixtureTabSharedProps, FixturePlayerStat, ClubLookup, Pos } from './shared';

const mvpRowShadow = { boxShadow: '0 0 12px rgba(255,215,0,0.06), inset 0 1px 0 rgba(255,255,255,0.04)' } as const;
const normalRowShadow = { boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)' } as const;

/** Ranking row for a single player */
function RankingRow({ stat, isMvp, floorPrice }: {
  stat: FixturePlayerStat;
  isMvp: boolean;
  floorPrice?: number;
}) {
  const rating = getRating(stat);
  const href = stat.player_id ? `/player/${stat.player_id}` : '#';

  return (
    <Link
      href={href}
      aria-label={`${(stat.player_first_name || '?').charAt(0)}. ${stat.player_last_name || '?'} — Rating ${rating.toFixed(1)}`}
      className={cn(
        'flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs transition-colors min-h-[44px] active:scale-[0.97] motion-reduce:active:scale-100 border-l-2',
        isMvp
          ? 'bg-gold/[0.06] border border-gold/15 hover:bg-gold/[0.10]'
          : 'bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.04]',
      )}
      style={{
        ...(isMvp ? mvpRowShadow : normalRowShadow),
        borderLeftColor: getPosAccent(stat.player_position),
      }}
    >
      {/* MVP Crown */}
      {isMvp && <MvpCrownIcon size={14} />}

      {/* Player Photo */}
      <div className="relative flex-shrink-0">
        <PlayerPhoto
          imageUrl={stat.player_image_url}
          first={stat.player_first_name || '?'}
          last={stat.player_last_name || '?'}
          pos={stat.player_position as Pos}
          size={36}
        />
      </div>

      {/* Position badge */}
      <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-bold flex-shrink-0', posColor(stat.player_position))}>
        {stat.player_position}
      </span>

      {/* Name */}
      <span className="flex-1 text-[13px] font-semibold text-white/90 truncate min-w-0">
        <span className="md:hidden">{stat.player_last_name || '?'}</span>
        <span className="hidden md:inline">{(stat.player_first_name || '?').charAt(0)}. {stat.player_last_name || '?'}</span>
      </span>

      {/* Minutes — hidden on mobile to save space */}
      <span className="hidden md:inline text-[11px] font-mono text-white/25 tabular-nums flex-shrink-0">{stat.minutes_played}&apos;</span>

      {/* Goals */}
      {stat.goals > 0 && (
        <span className="flex items-center gap-0.5 flex-shrink-0">
          <GoalIcon size={14} />
          {stat.goals > 1 && <span className="text-[10px] font-mono text-white/50">{stat.goals}</span>}
        </span>
      )}

      {/* Assists */}
      {stat.assists > 0 && (
        <span className="flex items-center gap-0.5 flex-shrink-0">
          <AssistIcon size={14} />
          {stat.assists > 1 && <span className="text-[10px] font-mono text-white/50">{stat.assists}</span>}
        </span>
      )}

      {/* Cards */}
      {stat.yellow_card && <YellowCardIcon size={12} />}
      {stat.red_card && <RedCardIcon size={12} />}

      {/* Rating badge */}
      <span
        className="min-w-[2rem] px-1.5 py-0.5 rounded-md text-[10px] font-black font-mono tabular-nums text-center flex-shrink-0 shadow-sm"
        style={ratingHeatStyle(rating)}
      >
        {rating.toFixed(1)}
      </span>

      {/* Floor price — hidden on mobile */}
      {floorPrice != null && floorPrice > 0 && (
        <span className="hidden md:inline text-[11px] font-mono text-white/50 tabular-nums flex-shrink-0">
          {fmtScout(floorPrice / 100)}
        </span>
      )}

      {/* Chevron */}
      <ChevronRight aria-hidden="true" className="size-3.5 text-white/25 flex-shrink-0" />
    </Link>
  );
}

/** Ranking list for one team */
function RankingList({ stats, color, label, mvpId, floorPrices, clubLogo, clubShort }: {
  stats: FixturePlayerStat[];
  color: string;
  label: string;
  mvpId: string | null;
  floorPrices: Map<string, number>;
  clubLogo?: ClubLookup | null;
  clubShort?: string;
}) {
  const ts = useTranslations('spieltag');
  const [showUnused, setShowUnused] = useState(false);

  // Sort by rating DESC, split into 3 groups in a single pass
  const { starters, substituted, unused } = useMemo(() => {
    const sorted = [...stats].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    const st: FixturePlayerStat[] = [];
    const sub: FixturePlayerStat[] = [];
    const un: FixturePlayerStat[] = [];
    for (const s of sorted) {
      if (s.minutes_played === 0) un.push(s);
      else if (s.is_starter) st.push(s);
      else sub.push(s);
    }
    return { starters: st, substituted: sub, unused: un };
  }, [stats]);

  return (
    <div>
      {/* Team header with club logo */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-[3px] h-5 rounded-full" style={{ backgroundColor: color }} />
        {clubLogo && <ClubLogo club={clubLogo} size={20} short={clubShort} />}
        <span className="text-xs font-black uppercase tracking-wide text-white/90">{label}</span>
      </div>

      {/* Starters */}
      {starters.length > 0 && (
        <div className="mb-3">
          <div className="text-[10px] font-bold text-white/25 uppercase tracking-wide mb-1.5 px-1">{ts('starters')}</div>
          <div className="space-y-1">
            {starters.map(s => (
              <RankingRow
                key={s.id}
                stat={s}
                isMvp={s.player_id === mvpId}
                floorPrice={s.player_id ? floorPrices.get(s.player_id) : undefined}
              />
            ))}
          </div>
        </div>
      )}

      {/* Substituted */}
      {substituted.length > 0 && (
        <div className="mb-3 pt-2 border-t border-white/[0.04]">
          <div className="text-[10px] font-bold text-white/25 uppercase tracking-wide mb-1.5 px-1">{ts('substitutesGroup')}</div>
          <div className="space-y-1">
            {substituted.map(s => (
              <RankingRow
                key={s.id}
                stat={s}
                isMvp={s.player_id === mvpId}
                floorPrice={s.player_id ? floorPrices.get(s.player_id) : undefined}
              />
            ))}
          </div>
        </div>
      )}

      {/* Unused — collapsed by default */}
      {unused.length > 0 && (
        <div className="pt-2 border-t border-white/[0.04]">
          <button
            onClick={() => setShowUnused(prev => !prev)}
            aria-expanded={showUnused}
            aria-label={`${ts('unused')} (${unused.length})`}
            className="flex items-center gap-1.5 text-[10px] font-bold text-white/25 uppercase tracking-wide mb-1 px-1 hover:text-white/50 transition-colors min-h-[44px]"
          >
            <ChevronDown
              aria-hidden="true"
              className={cn('size-3 transition-transform', showUnused && 'rotate-180')}
            />
            {ts('unused')} ({unused.length})
          </button>
          {showUnused && (
            <div className="space-y-1">
              {unused.map(s => (
                <RankingRow
                  key={s.id}
                  stat={s}
                  isMvp={false}
                  floorPrice={s.player_id ? floorPrices.get(s.player_id) : undefined}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Ranking tab — full player ranking for both teams side-by-side */
export default function RankingTab({
  homeStats,
  awayStats,
  fixture,
  mvpId,
  floorPrices,
  homeClub,
  awayClub,
  homeColor,
  awayColor,
}: FixtureTabSharedProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <RankingList
        stats={homeStats}
        color={homeColor}
        label={fixture.home_club_name}
        mvpId={mvpId}
        floorPrices={floorPrices}
        clubLogo={homeClub}
        clubShort={fixture.home_club_short}
      />
      <RankingList
        stats={awayStats}
        color={awayColor}
        label={fixture.away_club_name}
        mvpId={mvpId}
        floorPrices={floorPrices}
        clubLogo={awayClub}
        clubShort={fixture.away_club_short}
      />
    </div>
  );
}
