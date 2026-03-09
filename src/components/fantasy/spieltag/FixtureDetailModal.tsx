'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Loader2, ChevronRight, ChevronDown } from 'lucide-react';
import { Modal } from '@/components/ui';
import { useTranslations } from 'next-intl';
import { getClub } from '@/lib/clubs';
import { getFixturePlayerStats, getFixtureSubstitutions, getFloorPricesForPlayers } from '@/lib/services/fixtures';
import type { Fixture, FixturePlayerStat, FixtureSubstitution, Pos } from '@/types';
import { PlayerPhoto, GoalBadge } from '@/components/player';
import { ClubLogo } from './ClubLogo';
import { posColor, scoreBadgeColor, getPosAccent, getPosDotColor, getRingFrameClass, ratingHeatStyle, getRating } from './helpers';
import { GoalIcon, AssistIcon, YellowCardIcon, RedCardIcon, CleanSheetIcon, MvpCrownIcon, SubInIcon, SubOutIcon } from './MatchIcons';
import { cn, fmtScout } from '@/lib/utils';

const goldTextStyle = {
  background: 'linear-gradient(180deg, #FFE44D, #E6B800)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  filter: 'drop-shadow(0 0 12px rgba(255,215,0,0.25))',
} as const;

const scoreHeaderBg = {
  background: 'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -1px 0 rgba(255,255,255,0.04)',
} as const;

const mvpRowShadow = { boxShadow: '0 0 12px rgba(255,215,0,0.06), inset 0 1px 0 rgba(255,255,255,0.04)' } as const;
const normalRowShadow = { boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)' } as const;

/** Split team stats into starters + bench using is_starter flag.
 *  - < 11 starters: promotes highest-minutes bench players to fill gaps.
 *  - > 11 starters: uses formation + grid_position to demote the correct excess player.
 *  @param dbFormation — formation string from DB (e.g. "4-3-3"), used for smart trimming */
function splitStartersBench(stats: FixturePlayerStat[], dbFormation?: string | null): {
  starters: FixturePlayerStat[];
  bench: FixturePlayerStat[];
  formation: string;
} {
  let starters: FixturePlayerStat[];
  let bench: FixturePlayerStat[];

  const hasStarterFlags = stats.some(s => s.is_starter);

  if (hasStarterFlags) {
    starters = stats.filter(s => s.is_starter);
    const rest = stats.filter(s => !s.is_starter);

    if (starters.length > 11 && dbFormation) {
      // API returned too many starters — use formation to find the overflow row
      const formParts = dbFormation.split('-').map(Number); // e.g. [4,3,3]
      const expected = [1, ...formParts]; // [1,4,3,3] — GK + outfield rows

      // Group starters by grid row
      const byRow = new Map<number, FixturePlayerStat[]>();
      for (const s of starters) {
        const row = s.grid_position ? parseInt(s.grid_position.split(':')[0], 10) : 0;
        const arr = byRow.get(row) || [];
        arr.push(s);
        byRow.set(row, arr);
      }

      // For each row, trim to expected count — demote lowest-minutes excess
      const demoted: FixturePlayerStat[] = [];
      const rows = Array.from(byRow.entries()).sort((a, b) => a[0] - b[0]);
      for (let i = 0; i < rows.length; i++) {
        const [, players] = rows[i];
        const limit = expected[i] ?? players.length;
        if (players.length > limit) {
          players.sort((a, b) => b.minutes_played - a.minutes_played);
          demoted.push(...players.splice(limit));
        }
      }
      starters = rows.flatMap(([, players]) => players);
      bench = [...demoted, ...rest].filter(s => s.minutes_played > 0);
    } else if (starters.length > 11) {
      // No formation — simple fallback: keep top 11 by minutes
      const sorted = [...starters].sort((a, b) => b.minutes_played - a.minutes_played);
      const demoted = sorted.splice(11);
      starters = sorted;
      bench = [...demoted, ...rest].filter(s => s.minutes_played > 0);
    } else if (starters.length < 11) {
      // Fill gaps: supplement with top-minutes non-starters
      const sorted = [...rest].sort((a, b) => b.minutes_played - a.minutes_played);
      const needed = 11 - starters.length;
      const promoted = sorted.splice(0, needed);
      starters = [...starters, ...promoted];
      bench = sorted.filter(s => s.minutes_played > 0);
    } else {
      bench = rest.filter(s => s.minutes_played > 0);
    }
  } else {
    // Fallback for old data without is_starter
    const sorted = [...stats].sort((a, b) => b.minutes_played - a.minutes_played);
    starters = sorted.slice(0, 11);
    bench = sorted.slice(11).filter(s => s.minutes_played > 0);
  }

  // GK sanity check: if no GK among starters, swap in a GK from bench
  const hasGk = starters.some(s => (s.match_position || s.player_position) === 'GK');
  if (!hasGk) {
    const benchGk = bench.find(s => (s.match_position || s.player_position) === 'GK' && s.minutes_played > 0);
    if (benchGk) {
      // Remove GK from bench, demote lowest-minutes starter
      bench = bench.filter(s => s !== benchGk);
      starters.sort((a, b) => b.minutes_played - a.minutes_played);
      const demoted = starters.pop()!;
      starters.push(benchGk);
      bench.push(demoted);
    }
  }

  const counts = { DEF: 0, MID: 0, ATT: 0 };
  for (const s of starters) {
    const pos = s.match_position || s.player_position || 'MID';
    if (pos in counts) counts[pos as keyof typeof counts]++;
  }
  const formation = `${counts.DEF}-${counts.MID}-${counts.ATT}`;

  return { starters, bench, formation };
}

function PlayerNode({ stat, isMvp }: { stat: FixturePlayerStat; isMvp?: boolean }) {
  const rating = getRating(stat);
  const hasAssists = stat.assists > 0;

  return (
    <div className="flex flex-col items-center relative w-[52px] md:w-[60px] lg:w-[72px]" aria-label={`${stat.player_last_name || '?'}, ${stat.player_position}, Rating ${rating.toFixed(1)}`} role="group">
      <div
        className="absolute -top-1.5 -right-1 md:-top-2 md:-right-2 z-20 min-w-[1.5rem] md:min-w-[1.7rem] px-1 py-0.5 rounded-md text-[10px] md:text-xs font-mono font-black text-center tabular-nums shadow-[0_2px_8px_rgba(0,0,0,0.4)] border border-white/[0.08]"
        style={ratingHeatStyle(rating)}
        aria-hidden="true"
      >
        {rating.toFixed(1)}
      </div>
      {/* Card badges — top-left */}
      {(stat.yellow_card || stat.red_card) && (
        <div className="absolute -top-1 -left-1 z-20 flex flex-col gap-0.5">
          {stat.yellow_card && <YellowCardIcon size={10} />}
          {stat.red_card && <RedCardIcon size={10} />}
        </div>
      )}
      <div className={cn(
        'relative rounded-full shadow-lg',
        getRingFrameClass(stat.player_position),
        isMvp && 'card-gold-frame mvp-crown-glow',
      )}>
        {isMvp && (
          <MvpCrownIcon size={14} className="absolute -top-2.5 left-1/2 -translate-x-1/2 z-30 drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]" />
        )}
        <PlayerPhoto
          imageUrl={stat.player_image_url}
          first={stat.player_first_name || '?'}
          last={stat.player_last_name || '?'}
          pos={stat.player_position as Pos}
          size={36}
          className="md:size-10 lg:size-12"
        />
        <GoalBadge goals={stat.goals} size={20} className="-bottom-0.5 -right-1" />
        {/* Assist badge — bottom-left */}
        {hasAssists && (
          <div
            className="absolute -bottom-0.5 -left-1 z-20 flex items-center justify-center shadow-md"
            aria-label={`${stat.assists} Assist${stat.assists > 1 ? 's' : ''}`}
          >
            <AssistIcon size={16} />
            {stat.assists > 1 && (
              <span className="absolute -top-1 -right-1 text-[8px] font-black text-white bg-sky-500 rounded-full size-3 flex items-center justify-center">
                {stat.assists}
              </span>
            )}
          </div>
        )}
      </div>
      <div className="text-[10px] md:text-xs mt-1 font-bold text-center truncate max-w-full text-white/90 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
        {stat.player_last_name || '?'}
      </div>
      <div className="hidden md:flex items-center justify-center gap-0.5 text-[10px] text-white/25">
        <span className="font-mono tabular-nums">{stat.minutes_played}&apos;</span>
        {stat.goals > 0 && <span className="flex items-center gap-0.5"><GoalIcon size={10} className="text-white/50" />{stat.goals > 1 && <span className="text-[9px] text-white/50 font-mono">{stat.goals}</span>}</span>}
        {stat.assists > 0 && <span className="flex items-center gap-0.5"><AssistIcon size={10} />{stat.assists > 1 && <span className="text-[9px] text-white/50 font-mono">{stat.assists}</span>}</span>}
        {stat.yellow_card && <YellowCardIcon size={8} />}
        {stat.red_card && <RedCardIcon size={8} />}
        {stat.clean_sheet && <CleanSheetIcon size={10} />}
        {stat.bonus > 0 && <span className="text-gold font-bold">{stat.bonus}</span>}
      </div>
    </div>
  );
}

/** Position priority: GK=0, DEF=1, MID=2, ATT=3 */
function posPriority(pos: string): number {
  switch (pos) { case 'GK': return 0; case 'DEF': return 1; case 'MID': return 2; case 'ATT': return 3; default: return 2; }
}

/** Build pitch rows. Strategy:
 *  1. Try grid_position grouping — validate it produces correct row count matching formation
 *  2. If grid is invalid (missing GK row, wrong row count) → force formation layout
 *  3. If no grid data at all → group by match_position */
function buildFormationRows(starters: FixturePlayerStat[], formation: string, isHome: boolean): FixturePlayerStat[][] {
  const formParts = formation.split('-').map(Number);
  const validFormation = formParts.length >= 2 && !formParts.some(isNaN) && formParts.reduce((a, b) => a + b, 0) === 10;
  const expectedRowCount = validFormation ? formParts.length + 1 : 0; // +1 for GK

  const hasGrid = starters.some(s => s.grid_position);

  if (hasGrid) {
    // Group by grid row
    const rowMap = new Map<number, FixturePlayerStat[]>();
    for (const s of starters) {
      const row = s.grid_position ? parseInt(s.grid_position.split(':')[0], 10) : -1;
      const existing = rowMap.get(row) || [];
      existing.push(s);
      rowMap.set(row, existing);
    }

    const gridRows = Array.from(rowMap.entries())
      .filter(([r]) => r > 0) // exclude players without grid
      .sort((a, b) => a[0] - b[0]);

    // Validate: grid should have GK row (row 1 with 1 player) and match formation row count
    const hasGkRow = gridRows.length > 0 && gridRows[0][0] === 1 && gridRows[0][1].length === 1;

    if (hasGkRow && gridRows.length === expectedRowCount) {
      // Grid is valid — use it directly
      const rows = gridRows.map(([, players]) => players.sort((a, b) => {
        const colA = a.grid_position ? parseInt(a.grid_position.split(':')[1], 10) : 0;
        const colB = b.grid_position ? parseInt(b.grid_position.split(':')[1], 10) : 0;
        return colA - colB;
      }));
      if (!isHome) rows.reverse();
      return rows;
    }

    // Grid broken but fixable: no GK row + some row has overflow → extract lowest-minutes player as GK
    if (!hasGkRow && validFormation && gridRows.length > 0) {
      const expectedSizes = formParts; // e.g. [4,2,3,1] for "4-2-3-1"
      // Find overflow row (more players than formation expects)
      let extractedGk: FixturePlayerStat | null = null;
      for (let i = 0; i < gridRows.length && i < expectedSizes.length; i++) {
        const [, players] = gridRows[i];
        if (players.length > expectedSizes[i]) {
          // Sort by minutes — lowest minutes = likely misplaced GK
          players.sort((a, b) => a.minutes_played - b.minutes_played);
          extractedGk = players.shift()!;
          break;
        }
      }
      if (extractedGk) {
        const sortByCol = (players: FixturePlayerStat[]) => players.sort((a, b) => {
          const colA = a.grid_position ? parseInt(a.grid_position.split(':')[1], 10) : 0;
          const colB = b.grid_position ? parseInt(b.grid_position.split(':')[1], 10) : 0;
          return colA - colB;
        });
        const rows: FixturePlayerStat[][] = [[extractedGk], ...gridRows.map(([, p]) => sortByCol(p))];
        if (!isHome) rows.reverse();
        return rows;
      }
    }
    // Grid completely broken — fall through to formation-forced layout
  }

  // Formation-forced layout: sort starters by position, slice into formation rows
  if (validFormation) {
    const sorted = [...starters].sort((a, b) => {
      const pa = posPriority(a.match_position || a.player_position || 'MID');
      const pb = posPriority(b.match_position || b.player_position || 'MID');
      return pa - pb;
    });

    const rows: FixturePlayerStat[][] = [];
    // GK row
    const gk = sorted.filter(s => (s.match_position || s.player_position) === 'GK');
    const nonGk = sorted.filter(s => (s.match_position || s.player_position) !== 'GK');

    if (gk.length > 0) {
      rows.push([gk[0]]);
    } else {
      // No GK found — put first player as GK row (best guess)
      rows.push([nonGk.shift()!]);
    }

    // Outfield rows from formation
    let offset = 0;
    for (const count of formParts) {
      rows.push(nonGk.slice(offset, offset + count));
      offset += count;
    }

    if (!isHome) rows.reverse();
    return rows;
  }

  // Last fallback: group by match_position
  const grouped = new Map<string, FixturePlayerStat[]>();
  for (const s of starters) {
    const pos = s.match_position || s.player_position || 'MID';
    const existing = grouped.get(pos) || [];
    existing.push(s);
    grouped.set(pos, existing);
  }
  const order = isHome ? (pos: string) => posPriority(pos) : (pos: string) => 3 - posPriority(pos);
  return Array.from(grouped.entries())
    .sort((a, b) => order(a[0]) - order(b[0]))
    .map(([, players]) => players.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)));
}

function FormationHalf({ stats, teamName, color, isHome, formation, logo, mvpId }: {
  stats: FixturePlayerStat[];
  teamName: string;
  color: string;
  isHome: boolean;
  formation: string;
  logo: ReturnType<typeof getClub>;
  mvpId: string | null;
}) {
  const rows = buildFormationRows(stats, formation, isHome);

  return (
    <div className="flex flex-col gap-3 py-3">
      <div className="flex items-center justify-center gap-2">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg" style={{ background: `${color}15` }}>
          <ClubLogo club={logo} size={18} />
          <span className="text-xs font-black uppercase tracking-wide text-white/90">
            {teamName}
          </span>
          <span className="text-[10px] text-white/25 font-mono font-bold tabular-nums">{formation}</span>
        </div>
      </div>
      {rows.map((players, rowIdx) => (
        <div key={rowIdx} className="flex items-center justify-center gap-1 md:gap-3 lg:gap-4">
          {players.map(s => <PlayerNode key={s.id} stat={s} isMvp={s.player_id === mvpId} />)}
        </div>
      ))}
    </div>
  );
}

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
  clubLogo?: ReturnType<typeof getClub>;
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

/** Goal Ticker strip between score header and tabs */
function GoalTicker({ stats, homeClubId, homeClubLogo, awayClubLogo, homeShort, awayShort }: {
  stats: FixturePlayerStat[];
  homeClubId: string;
  homeClubLogo?: ReturnType<typeof getClub>;
  awayClubLogo?: ReturnType<typeof getClub>;
  homeShort?: string;
  awayShort?: string;
}) {
  const ts = useTranslations('spieltag');
  const scorers = useMemo(() => stats
    .filter(s => s.goals > 0)
    .sort((a, b) => {
      const aHome = a.club_id === homeClubId ? 0 : 1;
      const bHome = b.club_id === homeClubId ? 0 : 1;
      if (aHome !== bHome) return aHome - bHome;
      return b.goals - a.goals;
    }), [stats, homeClubId]);

  if (scorers.length === 0) return null;

  return (
    <div className="overflow-x-auto scrollbar-hide snap-x px-4 py-2 border-b border-white/[0.06]" tabIndex={0} role="region" aria-label={ts('goalScorers')}>
      <div className="flex items-center gap-2">
        {scorers.map(s => {
          const href = s.player_id ? `/player/${s.player_id}` : '#';
          const isHome = s.club_id === homeClubId;
          return (
            <Link
              key={s.id}
              href={href}
              aria-label={`${s.player_last_name || '?'} — ${ts('goalCount', { count: s.goals })}`}
              className="flex items-center gap-1.5 snap-start px-2.5 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.06] transition-colors min-h-[44px] flex-shrink-0 active:scale-[0.97] motion-reduce:active:scale-100"
            >
              <ClubLogo club={isHome ? (homeClubLogo ?? null) : (awayClubLogo ?? null)} size={14} short={isHome ? homeShort : awayShort} />
              <GoalIcon size={10} className="text-white/50" />
              <span className="text-xs font-bold text-white/90 whitespace-nowrap">
                {s.player_last_name || '?'}
              </span>
              {s.goals > 1 && <span className="text-gold font-black font-mono tabular-nums text-[10px]">&times;{s.goals}</span>}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

/** Match timeline — SofaScore-style dual-column layout (home left, away right) */
function MatchTimeline({ substitutions, homeClubId }: {
  substitutions: FixtureSubstitution[];
  homeClubId: string;
}) {
  const ts = useTranslations('spieltag');
  const [showAll, setShowAll] = useState(false);

  const sorted = useMemo(() => [...substitutions].sort((a, b) => {
    const minA = a.minute + (a.extra_minute ?? 0) / 100;
    const minB = b.minute + (b.extra_minute ?? 0) / 100;
    return minA - minB;
  }), [substitutions]);

  if (substitutions.length === 0) return null;

  const visible = showAll ? sorted : sorted.slice(0, 6);
  const hasMore = sorted.length > 6;

  const fmtMinute = (sub: FixtureSubstitution) =>
    `${sub.minute}'${sub.extra_minute ? `+${sub.extra_minute}` : ''}`;

  return (
    <div className="relative z-10 mt-4 pt-3 border-t border-white/[0.08]">
      <div className="text-[10px] font-black text-white/25 uppercase tracking-wide text-center mb-2.5">{ts('matchTimeline')}</div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-start">
        {visible.map(sub => {
          const isHome = sub.club_id === homeClubId;
          const outName = sub.player_out_last_name || sub.player_out_name;
          const inName = sub.player_in_last_name || sub.player_in_name;

          return (
            <React.Fragment key={sub.id}>
              {/* Home side — right-aligned */}
              {isHome ? (
                <div className="flex items-center justify-end gap-1 pr-3 py-1.5 min-w-0">
                  <span className="text-white/25 text-xs truncate min-w-0 line-through">{outName}</span>
                  <SubOutIcon size={10} />
                  <SubInIcon size={10} />
                  <span className="text-white/90 text-xs font-semibold truncate min-w-0">{inName}</span>
                </div>
              ) : (
                <div />
              )}

              {/* Center minute pill */}
              <div className="flex flex-col items-center relative py-1">
                <div className="absolute top-0 bottom-0 w-px bg-white/[0.06]" aria-hidden="true" />
                <span className="relative z-10 px-2 py-0.5 rounded-full bg-white/[0.08] text-[10px] font-mono text-white/50 tabular-nums whitespace-nowrap shadow-sm">
                  {fmtMinute(sub)}
                </span>
              </div>

              {/* Away side — left-aligned */}
              {!isHome ? (
                <div className="flex items-center gap-1 pl-3 py-1.5 min-w-0">
                  <span className="text-white/25 text-xs truncate min-w-0 line-through">{outName}</span>
                  <SubOutIcon size={10} />
                  <SubInIcon size={10} />
                  <span className="text-white/90 text-xs font-semibold truncate min-w-0">{inName}</span>
                </div>
              ) : (
                <div />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {hasMore && (
        <button
          onClick={() => setShowAll(prev => !prev)}
          aria-expanded={showAll}
          aria-label={showAll ? ts('showLess') : ts('showMore')}
          className="mt-2 w-full text-center text-[10px] font-bold text-white/25 hover:text-white/50 transition-colors py-2 min-h-[44px]"
        >
          {showAll ? ts('showLess') : ts('showMore')} ({sorted.length - 6})
        </button>
      )}
    </div>
  );
}

// ============================================
// Overview Tab — MVP Highlight + Quick Stats + Events + Top Performers
// ============================================

function OverviewTab({ stats, homeStats, awayStats, substitutions, fixture, mvpId, floorPrices, homeClub, awayClub, homeColor, awayColor }: {
  stats: FixturePlayerStat[];
  homeStats: FixturePlayerStat[];
  awayStats: FixturePlayerStat[];
  substitutions: FixtureSubstitution[];
  fixture: Fixture;
  mvpId: string | null;
  floorPrices: Map<string, number>;
  homeClub: ReturnType<typeof getClub>;
  awayClub: ReturnType<typeof getClub>;
  homeColor: string;
  awayColor: string;
}) {
  const ts = useTranslations('spieltag');
  const mvp = mvpId ? stats.find(s => s.player_id === mvpId) : null;
  const mvpRating = mvp ? getRating(mvp) : 0;

  // Quick stats — home vs away
  const homeGoals = homeStats.reduce((sum, s) => sum + s.goals, 0);
  const awayGoals = awayStats.reduce((sum, s) => sum + s.goals, 0);
  const homeCards = homeStats.filter(s => s.yellow_card || s.red_card).length;
  const awayCards = awayStats.filter(s => s.yellow_card || s.red_card).length;
  const homeSubs = substitutions.filter(s => s.club_id === fixture.home_club_id).length;
  const awaySubs = substitutions.length - homeSubs;

  // Top 3 performers from each team (filter for minutes_played > 0)
  const homeTop3 = useMemo(() => [...homeStats].filter(s => s.minutes_played > 0).sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)).slice(0, 3), [homeStats]);
  const awayTop3 = useMemo(() => [...awayStats].filter(s => s.minutes_played > 0).sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)).slice(0, 3), [awayStats]);

  return (
    <div className="space-y-6">
      {/* MVP Highlight Card */}
      {mvp && (
        <Link
          href={mvp.player_id ? `/player/${mvp.player_id}` : '#'}
          aria-label={`${mvp.player_first_name || ''} ${mvp.player_last_name || ''} ${ts('mvpLabel')} — Rating ${mvpRating.toFixed(1)}`}
          className="block relative overflow-hidden rounded-2xl border border-gold/20 active:scale-[0.98] motion-reduce:active:scale-100 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50"
          style={{
            background: `linear-gradient(135deg, rgba(255,215,0,0.08) 0%, rgba(255,215,0,0.03) 50%, transparent 100%)`,
            boxShadow: '0 0 40px rgba(255,215,0,0.08), 0 0 80px rgba(255,215,0,0.03), inset 0 1px 0 rgba(255,255,255,0.08)',
          }}
        >
          <div className="flex items-center gap-4 p-4">
            {/* MVP Photo */}
            <div className="relative flex-shrink-0">
              <div className="absolute -top-1 left-1/2 -translate-x-1/2 z-10">
                <MvpCrownIcon size={20} />
              </div>
              <div className="card-gold-frame rounded-full shadow-lg">
                <PlayerPhoto
                  imageUrl={mvp.player_image_url}
                  first={mvp.player_first_name || '?'}
                  last={mvp.player_last_name || '?'}
                  pos={mvp.player_position as Pos}
                  size={56}
                />
              </div>
            </div>

            {/* MVP Info */}
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-bold text-gold/60 uppercase tracking-widest mb-0.5">{ts('mvpLabel')}</div>
              <div className="text-lg font-black text-white tracking-tight truncate">
                {mvp.player_first_name ? `${mvp.player_first_name.charAt(0)}. ` : ''}{mvp.player_last_name || '?'}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-bold', posColor(mvp.player_position))}>
                  {mvp.player_position}
                </span>
                {mvp.goals > 0 && <span className="flex items-center gap-0.5 text-[11px] text-white/60"><GoalIcon size={12} /> {mvp.goals}</span>}
                {mvp.assists > 0 && <span className="flex items-center gap-0.5 text-[11px] text-white/60"><AssistIcon size={12} /> {mvp.assists}</span>}
                {mvp.clean_sheet && <CleanSheetIcon size={14} />}
              </div>
            </div>

            {/* Rating Badge — large */}
            <div
              className="flex-shrink-0 size-14 rounded-xl flex items-center justify-center font-mono font-black text-xl tabular-nums shadow-lg"
              style={{
                ...ratingHeatStyle(mvpRating),
                boxShadow: mvpRating >= 9.0 ? '0 0 20px rgba(55,77,245,0.3)' : undefined,
              }}
            >
              {mvpRating.toFixed(1)}
            </div>
          </div>
        </Link>
      )}

      {/* Quick Stats — Home vs Away comparison bars */}
      <div className="space-y-3 rounded-xl bg-white/[0.03] border border-white/[0.06] px-4 py-3" style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)' }} role="group" aria-label={ts('matchDetails')}>
        {[
          { label: ts('quickGoals'), home: homeGoals, away: awayGoals, hColor: homeColor, aColor: awayColor },
          { label: ts('quickCards'), home: homeCards, away: awayCards, hColor: '#EAB308', aColor: '#EAB308' },
          { label: ts('quickSubs'), home: homeSubs, away: awaySubs, hColor: homeColor, aColor: awayColor },
        ].map(({ label, home, away, hColor, aColor }) => {
          const total = home + away || 1;
          const hPct = Math.round((home / total) * 100);
          const aPct = 100 - hPct;
          return (
            <div key={label} aria-label={`${label}: ${home} - ${away}`}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[13px] font-bold font-mono tabular-nums text-white/90">{home}</span>
                <span className="text-[10px] font-bold text-white/30 uppercase tracking-wide">{label}</span>
                <span className="text-[13px] font-bold font-mono tabular-nums text-white/90">{away}</span>
              </div>
              <div className="flex h-1 rounded-full overflow-hidden gap-0.5 bg-white/[0.04]">
                <div className="rounded-full transition-colors" style={{ width: `${hPct}%`, backgroundColor: hColor, opacity: home >= away ? 1 : 0.35 }} />
                <div className="rounded-full transition-colors" style={{ width: `${aPct}%`, backgroundColor: aColor, opacity: away >= home ? 1 : 0.35 }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Top Performers — side-by-side */}
      <div>
        <div className="text-[10px] font-black text-white/25 uppercase tracking-widest mb-3">{ts('topPerformers')}</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Home Top 3 */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-[3px] h-4 rounded-full" style={{ backgroundColor: homeColor }} />
              <ClubLogo club={homeClub} size={16} short={fixture.home_club_short} />
              <span className="text-[11px] font-bold text-white/50 truncate">{fixture.home_club_name}</span>
            </div>
            {homeTop3.map((s, i) => (
              <TopPerformerRow key={s.id} stat={s} rank={i + 1} isMvp={s.player_id === mvpId} floorPrice={s.player_id ? floorPrices.get(s.player_id) : undefined} />
            ))}
          </div>
          {/* Away Top 3 */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-[3px] h-4 rounded-full" style={{ backgroundColor: awayColor }} />
              <ClubLogo club={awayClub} size={16} short={fixture.away_club_short} />
              <span className="text-[11px] font-bold text-white/50 truncate">{fixture.away_club_name}</span>
            </div>
            {awayTop3.map((s, i) => (
              <TopPerformerRow key={s.id} stat={s} rank={i + 1} isMvp={s.player_id === mvpId} floorPrice={s.player_id ? floorPrices.get(s.player_id) : undefined} />
            ))}
          </div>
        </div>
      </div>

      {/* Match Timeline */}
      {substitutions.length > 0 && (
        <MatchTimeline substitutions={substitutions} homeClubId={fixture.home_club_id} />
      )}
    </div>
  );
}

/** Compact performer row for Overview tab */
function TopPerformerRow({ stat, rank, isMvp, floorPrice }: {
  stat: FixturePlayerStat;
  rank: number;
  isMvp: boolean;
  floorPrice?: number;
}) {
  const rating = getRating(stat);
  const href = stat.player_id ? `/player/${stat.player_id}` : '#';

  const playerName = `${(stat.player_first_name || '?').charAt(0)}. ${stat.player_last_name || '?'}`;

  return (
    <Link
      href={href}
      aria-label={`${rank} ${playerName} ${stat.player_position} — Rating ${rating.toFixed(1)}`}
      className={cn(
        'flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs transition-colors min-h-[44px] active:scale-[0.97] motion-reduce:active:scale-100 border-l-2',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50',
        isMvp
          ? 'bg-gold/[0.06] border border-gold/15'
          : 'bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04]',
      )}
      style={{
        ...(isMvp ? mvpRowShadow : normalRowShadow),
        borderLeftColor: getPosAccent(stat.player_position),
      }}
    >
      {/* Rank */}
      <span className="text-[10px] font-mono font-bold text-white/20 tabular-nums w-3 text-center">{rank}</span>

      {/* Photo */}
      <PlayerPhoto
        imageUrl={stat.player_image_url}
        first={stat.player_first_name || '?'}
        last={stat.player_last_name || '?'}
        pos={stat.player_position as Pos}
        size={32}
      />

      {/* Position */}
      <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-bold flex-shrink-0', posColor(stat.player_position))}>
        {stat.player_position}
      </span>

      {/* Name */}
      <span className="flex-1 text-[13px] font-semibold text-white/90 truncate min-w-0">
        {(stat.player_first_name || '?').charAt(0)}. {stat.player_last_name || '?'}
      </span>

      {/* Goals/Assists inline */}
      {stat.goals > 0 && <span className="flex items-center gap-0.5 flex-shrink-0"><GoalIcon size={12} />{stat.goals > 1 && <span className="text-[10px] font-mono text-white/50">{stat.goals}</span>}</span>}
      {stat.assists > 0 && <span className="flex items-center gap-0.5 flex-shrink-0"><AssistIcon size={12} />{stat.assists > 1 && <span className="text-[10px] font-mono text-white/50">{stat.assists}</span>}</span>}

      {/* Rating */}
      <span
        className="min-w-[2rem] px-1.5 py-0.5 rounded-md text-[11px] font-black font-mono tabular-nums text-center flex-shrink-0 shadow-sm"
        style={ratingHeatStyle(rating)}
      >
        {rating.toFixed(1)}
      </span>

      <ChevronRight aria-hidden="true" className="size-3 text-white/15 flex-shrink-0" />
    </Link>
  );
}

// ============================================
// Fixture Detail Modal
// ============================================

type Props = {
  fixture: Fixture | null;
  isOpen: boolean;
  onClose: () => void;
  sponsorName?: string;
  sponsorLogo?: string;
};

export function FixtureDetailModal({ fixture, isOpen, onClose, sponsorName, sponsorLogo }: Props) {
  const ts = useTranslations('spieltag');
  const tsp = useTranslations('sponsor');
  const [stats, setStats] = useState<FixturePlayerStat[]>([]);
  const [substitutions, setSubstitutions] = useState<FixtureSubstitution[]>([]);
  const [loading, setLoading] = useState(false);
  const [detailTab, setDetailTab] = useState<'overview' | 'ranking' | 'formation'>('overview');
  const [floorPrices, setFloorPrices] = useState<Map<string, number>>(new Map());

  useEffect(() => {
    if (!fixture || !isOpen) return;
    let cancelled = false;
    setLoading(true);
    setDetailTab('overview');
    Promise.all([
      getFixturePlayerStats(fixture.id),
      getFixtureSubstitutions(fixture.id),
    ]).then(([statsData, subsData]) => {
      if (!cancelled) {
        setStats(statsData);
        setSubstitutions(subsData);
        setLoading(false);
      }
    }).catch((err) => { console.error('FixtureDetailModal fetch failed:', err); if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [fixture, isOpen]);

  // Load floor prices when stats arrive
  useEffect(() => {
    if (stats.length === 0) return;
    let cancelled = false;
    const playerIds = stats.map(s => s.player_id).filter((id): id is string => id != null);
    if (playerIds.length === 0) return;
    getFloorPricesForPlayers(playerIds).then(prices => {
      if (!cancelled) setFloorPrices(prices);
    }).catch(console.error);
    return () => { cancelled = true; };
  }, [stats]);

  // MVP: highest rating across ALL stats
  const mvpId = useMemo(() => {
    if (stats.length === 0) return null;
    let best: FixturePlayerStat | null = null;
    for (const s of stats) {
      if (s.minutes_played === 0) continue;
      const rating = getRating(s);
      if (!best || rating > getRating(best)) {
        best = s;
      }
    }
    return best?.player_id ?? null;
  }, [stats]);

  const { homeStats, awayStats } = useMemo(() => ({
    homeStats: stats.filter(s => s.club_id === fixture?.home_club_id),
    awayStats: stats.filter(s => s.club_id === fixture?.away_club_id),
  }), [stats, fixture?.home_club_id, fixture?.away_club_id]);

  if (!fixture) return null;

  const homeClub = getClub(fixture.home_club_short) || getClub(fixture.home_club_name);
  const awayClub = getClub(fixture.away_club_short) || getClub(fixture.away_club_name);
  const isSimulated = fixture.status === 'simulated' || fixture.status === 'finished';
  const homeColor = homeClub?.colors.primary ?? '#22C55E';
  const awayColor = awayClub?.colors.primary ?? '#3B82F6';

  return (
    <Modal open={isOpen} title="" onClose={onClose} size="lg">
      {/* Score Header — premium glassmorphism */}
      <div
        className="relative overflow-hidden"
        style={scoreHeaderBg}
      >
        {/* Team color accents — vivid radials for premium depth */}
        <div className="absolute inset-0" style={{
          background: `
            radial-gradient(ellipse 120% 100% at 5% 50%, ${homeColor}22 0%, transparent 55%),
            radial-gradient(ellipse 120% 100% at 95% 50%, ${awayColor}22 0%, transparent 55%),
            radial-gradient(ellipse 60% 120% at 50% 100%, rgba(255,215,0,0.04) 0%, transparent 50%)
          `,
        }} />

        <div className="relative flex items-center justify-center gap-4 md:gap-8 pt-5 pb-6 px-4">
          {/* Home Club */}
          <div className="flex flex-col items-center gap-2.5 flex-1 min-w-0">
            <div className="relative" style={{ filter: `drop-shadow(0 0 24px ${homeColor}40)` }}>
              <ClubLogo club={homeClub} size={80} short={fixture.home_club_short}  />
            </div>
            <span className="font-black text-sm md:text-base text-center leading-tight text-balance line-clamp-2 tracking-tight">{fixture.home_club_name}</span>
          </div>

          {/* Score Center */}
          <div className="text-center shrink-0">
            {isSimulated ? (
              <>
                <div className="flex items-center gap-3 md:gap-5">
                  <span className="font-mono font-black text-[4rem] md:text-[5rem] tabular-nums leading-none" style={goldTextStyle}>
                    {fixture.home_score}
                  </span>
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-[3px] h-3 rounded-full bg-gold/30" />
                    <div className="w-[3px] h-3 rounded-full bg-gold/15" />
                  </div>
                  <span className="font-mono font-black text-[4rem] md:text-[5rem] tabular-nums leading-none" style={goldTextStyle}>
                    {fixture.away_score}
                  </span>
                </div>
                <div className="flex items-center justify-center gap-2 mt-2">
                  <span className="px-2.5 py-1 rounded-md bg-white/[0.08] text-[10px] font-black text-white/60 uppercase tracking-widest border border-white/[0.06]">{ts('fullTime')}</span>
                  <span className="text-[10px] text-white/30 font-medium tracking-wide">{ts('label')} {fixture.gameweek}</span>
                </div>
              </>
            ) : (
              <>
                <div className="font-mono font-black text-4xl md:text-5xl text-white/20 tracking-wider">vs</div>
                <div className="flex items-center justify-center gap-2 mt-2.5">
                  <span className="text-[10px] text-white/30 font-medium tracking-wide">{ts('label')} {fixture.gameweek}</span>
                </div>
              </>
            )}
          </div>

          {/* Away Club */}
          <div className="flex flex-col items-center gap-2.5 flex-1 min-w-0">
            <div className="relative" style={{ filter: `drop-shadow(0 0 24px ${awayColor}40)` }}>
              <ClubLogo club={awayClub} size={80} short={fixture.away_club_short}  />
            </div>
            <span className="font-black text-sm md:text-base text-center leading-tight text-balance line-clamp-2 tracking-tight">{fixture.away_club_name}</span>
          </div>
        </div>
        {/* Gold accent line — premium separator */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/3 h-[1px]" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,215,0,0.2), transparent)' }} />
      </div>

      {/* Goal Ticker */}
      {stats.length > 0 && (
        <GoalTicker
          stats={stats}
          homeClubId={fixture.home_club_id}
          homeClubLogo={homeClub}
          awayClubLogo={awayClub}
          homeShort={fixture.home_club_short}
          awayShort={fixture.away_club_short}
        />
      )}

      {/* Tabs — Premium segmented control */}
      {stats.length > 0 && (
        <div role="tablist" className="flex items-center justify-center gap-1 px-4 py-3 border-b border-white/[0.04]">
          {(['overview', 'ranking', 'formation'] as const).map(tab => (
            <button
              key={tab}
              role="tab"
              id={`tab-${tab}`}
              onClick={() => setDetailTab(tab)}
              aria-selected={detailTab === tab}
              aria-controls="fixture-tabpanel"
              aria-label={tab === 'overview' ? ts('overviewTab') : tab === 'ranking' ? ts('ranking') : ts('formationTab')}
              className={cn(
                'px-4 py-2 rounded-lg text-[13px] font-bold transition-colors min-h-[44px] relative',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50 focus-visible:ring-offset-1 focus-visible:ring-offset-[#0a0a0a]',
                detailTab === tab
                  ? 'bg-gold/15 text-gold shadow-[0_0_12px_rgba(255,215,0,0.08)] border border-gold/20'
                  : 'text-white/30 hover:text-white/50 hover:bg-white/[0.03] border border-transparent',
              )}
            >
              {tab === 'overview' ? ts('overviewTab') : tab === 'ranking' ? ts('ranking') : ts('formationTab')}
            </button>
          ))}
        </div>
      )}

      <div id="fixture-tabpanel" className="max-h-[60vh] overflow-y-auto" tabIndex={0} role="tabpanel" aria-labelledby={`tab-${detailTab}`}>
        <div key={detailTab} className="px-4 py-5 md:px-6 md:py-6 anim-fade">
          {loading ? (
            <div className="flex items-center justify-center py-12" role="status">
              <Loader2 aria-hidden="true" className="size-6 animate-spin motion-reduce:animate-none text-gold" />
              <span className="sr-only">{ts('loading')}</span>
            </div>
          ) : stats.length === 0 ? (
            <div className="text-center text-white/25 py-12">
              {isSimulated ? ts('noPlayerData') : ts('notSimulated')}
            </div>
          ) : detailTab === 'overview' ? (
            <OverviewTab
              stats={stats}
              homeStats={homeStats}
              awayStats={awayStats}
              substitutions={substitutions}
              fixture={fixture}
              mvpId={mvpId}
              floorPrices={floorPrices}
              homeClub={homeClub}
              awayClub={awayClub}
              homeColor={homeColor}
              awayColor={awayColor}
            />
          ) : detailTab === 'ranking' ? (
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
          ) : (
            <div className="rounded-2xl overflow-hidden border border-white/[0.08] shadow-[0_0_40px_rgba(0,0,0,0.4)]">
              {/* Sponsor Banner Top */}
              {(() => {
                const sponsor = sponsorName ? { sponsorName, sponsorLogo } : null;
                return (
                  <div className="bg-white/[0.02] px-4 py-2 flex items-center justify-center gap-3 border-b border-white/[0.06]">
                    {sponsor?.sponsorLogo ? (
                      <img src={sponsor.sponsorLogo} alt="" className="h-4 w-auto object-contain opacity-60" />
                    ) : (
                      <div className="size-1 rounded-full bg-gold/40" aria-hidden="true" />
                    )}
                    <span className="text-[10px] font-bold text-white/25 uppercase tracking-wide">{sponsor?.sponsorName || tsp('sponsorPlaceholder')}</span>
                    {sponsor?.sponsorLogo ? (
                      <img src={sponsor.sponsorLogo} alt="" className="h-4 w-auto object-contain opacity-60" />
                    ) : (
                      <div className="size-1 rounded-full bg-gold/40" aria-hidden="true" />
                    )}
                  </div>
                );
              })()}

              {/* Green Pitch */}
              <div className="relative px-3 md:px-6 py-4" style={{
                background: 'linear-gradient(180deg, rgba(15,65,15,0.50) 0%, rgba(25,90,25,0.35) 50%, rgba(15,65,15,0.50) 100%)',
              }}>
                {/* Pitch markings SVG — sharper lines */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none" viewBox="0 0 400 600">
                  {/* Outer boundary */}
                  <rect x="16" y="8" width="368" height="584" fill="none" stroke="white" strokeOpacity="0.12" strokeWidth="1.5" rx="2" />
                  {/* Halfway line */}
                  <line x1="16" y1="300" x2="384" y2="300" stroke="white" strokeOpacity="0.10" strokeWidth="1" />
                  {/* Center circle */}
                  <circle cx="200" cy="300" r="48" fill="none" stroke="white" strokeOpacity="0.10" strokeWidth="1" />
                  <circle cx="200" cy="300" r="3" fill="white" fillOpacity="0.12" />
                  {/* Penalty areas */}
                  <rect x="105" y="8" width="190" height="75" fill="none" stroke="white" strokeOpacity="0.10" strokeWidth="1" />
                  <rect x="140" y="8" width="120" height="32" fill="none" stroke="white" strokeOpacity="0.06" strokeWidth="1" />
                  <rect x="105" y="517" width="190" height="75" fill="none" stroke="white" strokeOpacity="0.10" strokeWidth="1" />
                  <rect x="140" y="560" width="120" height="32" fill="none" stroke="white" strokeOpacity="0.06" strokeWidth="1" />
                  {/* Penalty arcs */}
                  <path d="M 160 83 Q 200 110 240 83" fill="none" stroke="white" strokeOpacity="0.06" strokeWidth="1" />
                  <path d="M 160 517 Q 200 490 240 517" fill="none" stroke="white" strokeOpacity="0.06" strokeWidth="1" />
                  {/* Grass stripes — alternating bands */}
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(i => (
                    i % 2 === 0 ? <rect key={i} x="16" y={8 + i * 48.67} width="368" height="48.67" fill="white" fillOpacity="0.03" /> : null
                  ))}
                </svg>

                {/* Center circle sponsor watermark */}
                {(() => {
                  const sponsor = sponsorName ? { sponsorName, sponsorLogo } : null;
                  return (
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                      <div className="size-20 rounded-full border border-white/[0.04] flex items-center justify-center">
                        {sponsor?.sponsorLogo ? (
                          <img src={sponsor.sponsorLogo} alt="" className="size-12 object-contain opacity-20" />
                        ) : (
                          <span className="text-[10px] text-white/10 font-black tracking-wide uppercase">BeScout</span>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {(() => {
                  const homeSplit = splitStartersBench(homeStats, fixture.home_formation);
                  const awaySplit = splitStartersBench(awayStats, fixture.away_formation);
                  // Use real formation from DB, fallback to derived
                  const homeFormation = fixture.home_formation || homeSplit.formation;
                  const awayFormation = fixture.away_formation || awaySplit.formation;
                  // Safeguard: if either team has < 11 starters, fall back to ranking view
                  const hasEnoughData = homeSplit.starters.length >= 11 && awaySplit.starters.length >= 11;

                  if (!hasEnoughData) {
                    return (
                      <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-4 px-2 py-4">
                        <RankingList stats={homeStats} color={homeColor} label={`${fixture.home_club_name} ${homeFormation ? `(${homeFormation})` : ''}`} mvpId={mvpId} floorPrices={floorPrices} clubLogo={homeClub} clubShort={fixture.home_club_short} />
                        <RankingList stats={awayStats} color={awayColor} label={`${fixture.away_club_name} ${awayFormation ? `(${awayFormation})` : ''}`} mvpId={mvpId} floorPrices={floorPrices} clubLogo={awayClub} clubShort={fixture.away_club_short} />
                      </div>
                    );
                  }

                  return (
                    <>
                      <div className="relative z-10">
                        <FormationHalf stats={homeSplit.starters} teamName={fixture.home_club_name} color={homeColor} isHome={true} formation={homeFormation} logo={homeClub} mvpId={mvpId} />
                        <div className="h-4 md:h-6" />
                        <FormationHalf stats={awaySplit.starters} teamName={fixture.away_club_name} color={awayColor} isHome={false} formation={awayFormation} logo={awayClub} mvpId={mvpId} />
                      </div>
                      {/* Match Timeline */}
                      <MatchTimeline
                        substitutions={substitutions}
                        homeClubId={fixture.home_club_id}
                      />
                      {/* Bench fallback when no substitution data */}
                      {substitutions.length === 0 && (() => {
                        const allBench = [...homeSplit.bench, ...awaySplit.bench];
                        if (allBench.length === 0) return null;
                        return (
                          <div className="relative z-10 mt-4 pt-3 border-t border-white/[0.08]">
                            <div className="text-[10px] font-black text-white/25 uppercase tracking-wide text-center mb-2.5">{ts('substitutesGroup')}</div>
                            <div className="flex gap-1.5 flex-wrap justify-center">
                              {allBench.map(s => (
                                <div key={s.id} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-black/30 rounded-xl text-xs border border-white/[0.05]">
                                  <span className={cn('px-1 py-0.5 rounded text-[10px] font-bold', posColor(s.player_position))}>
                                    {s.player_position}
                                  </span>
                                  <span className="text-white/50 font-medium">{s.player_last_name || '?'}</span>
                                  <span className="text-white/25 font-mono tabular-nums">{s.minutes_played}&apos;</span>
                                  <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-bold font-mono tabular-nums', scoreBadgeColor(getRating(s)))}>
                                    {getRating(s).toFixed(1)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })()}
                    </>
                  );
                })()}
              </div>

              {/* Sponsor Banner Bottom */}
              {(() => {
                const sponsor = sponsorName ? { sponsorName, sponsorLogo } : null;
                return (
                  <div className="bg-white/[0.03] px-4 py-2.5 flex items-center justify-center gap-3 border-t border-white/[0.06]">
                    {sponsor?.sponsorLogo ? (
                      <img src={sponsor.sponsorLogo} alt="" className="h-4 w-auto object-contain opacity-40" />
                    ) : (
                      <div className="size-1 rounded-full bg-gold/30" aria-hidden="true" />
                    )}
                    <span className="text-[10px] text-white/25 font-bold uppercase tracking-wide">
                      {sponsor?.sponsorName ? ts('sponsoredBy', { sponsor: sponsor.sponsorName }) : ts('poweredBy')}
                    </span>
                    {sponsor?.sponsorLogo ? (
                      <img src={sponsor.sponsorLogo} alt="" className="h-4 w-auto object-contain opacity-40" />
                    ) : (
                      <div className="size-1 rounded-full bg-gold/30" aria-hidden="true" />
                    )}
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
