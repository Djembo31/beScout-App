'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Loader2, Star, Crown, ChevronRight, ChevronDown } from 'lucide-react';
import { Modal } from '@/components/ui';
import { useTranslations } from 'next-intl';
import { getClub } from '@/lib/clubs';
import { getFixturePlayerStats, getFixtureSubstitutions, getFloorPricesForPlayers } from '@/lib/services/fixtures';
import type { Fixture, FixturePlayerStat, FixtureSubstitution, Pos } from '@/types';
import { PlayerPhoto, GoalBadge } from '@/components/player';
import { ClubLogo } from './ClubLogo';
import { posColor, scoreBadgeColor, getPosAccent, getRingFrameClass, ratingHeatStyle, getPosDotColor } from './helpers';
import { cn, fmtScout } from '@/lib/utils';

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
  const rating = stat.rating ?? stat.fantasy_points / 10;
  const hasGoals = stat.goals > 0;
  const hasAssists = stat.assists > 0;

  return (
    <div className="flex flex-col items-center relative w-[52px] md:w-[60px] lg:w-[72px]">
      <div
        className="absolute -top-1.5 -right-1 md:-top-2 md:-right-2 z-20 min-w-[1.5rem] md:min-w-[1.7rem] px-1 py-0.5 rounded-md text-[10px] md:text-xs font-mono font-black text-center tabular-nums shadow-lg border border-white/[0.08]"
        style={ratingHeatStyle(rating)}
      >
        {rating.toFixed(1)}
      </div>
      {/* Card badges — top-left */}
      {(stat.yellow_card || stat.red_card) && (
        <div className="absolute -top-1 -left-1 z-20 flex flex-col gap-0.5">
          {stat.yellow_card && <div className="w-2 h-2.5 bg-yellow-400 rounded-[1px]" aria-hidden="true" />}
          {stat.red_card && <div className="w-2 h-2.5 bg-red-500 rounded-[1px]" aria-hidden="true" />}
        </div>
      )}
      <div className={cn(
        'relative rounded-full shadow-[0_0_12px_rgba(0,0,0,0.5)]',
        getRingFrameClass(stat.player_position),
        isMvp && 'card-gold-frame mvp-crown-glow',
        hasGoals && !isMvp && 'shadow-[0_0_12px_rgba(255,215,0,0.4)]',
        hasAssists && !hasGoals && !isMvp && 'shadow-[0_0_8px_rgba(56,189,248,0.25)]',
      )}>
        {isMvp && (
          <Crown aria-hidden="true" className="absolute -top-2.5 left-1/2 -translate-x-1/2 size-3.5 text-gold z-30 drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]" />
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
            className="absolute -bottom-0.5 -left-1 z-20 size-5 rounded-full bg-sky-500 flex items-center justify-center text-[9px] font-black text-white shadow-md"
            aria-label={`${stat.assists} assist${stat.assists > 1 ? 's' : ''}`}
          >
            {stat.assists > 1 ? stat.assists : 'A'}
          </div>
        )}
      </div>
      <div className="text-[10px] md:text-xs mt-1 font-bold text-center truncate max-w-full text-white/80 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
        {stat.player_last_name || '?'}
      </div>
      <div className="hidden md:flex items-center justify-center gap-0.5 text-[10px] text-white/30">
        <span className="font-mono tabular-nums">{stat.minutes_played}&apos;</span>
        {stat.goals > 0 && <span className="text-gold font-bold">{stat.goals}G</span>}
        {stat.assists > 0 && <span className="text-sky-400 font-bold">{stat.assists}A</span>}
        {stat.yellow_card && <span className="w-1.5 h-2.5 bg-yellow-400 rounded-[1px] inline-block" aria-hidden="true" />}
        {stat.red_card && <span className="w-1.5 h-2.5 bg-red-500 rounded-[1px] inline-block" aria-hidden="true" />}
        {stat.clean_sheet && <span className="text-emerald-400 font-bold">CS</span>}
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
          <span className="text-xs font-black uppercase tracking-wider" style={{ color }}>
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
  const rating = stat.rating ?? stat.fantasy_points / 10;
  const href = stat.player_id ? `/player/${stat.player_id}` : '#';

  return (
    <Link
      href={href}
      aria-label={`${(stat.player_first_name || '?').charAt(0)}. ${stat.player_last_name || '?'} — Rating ${rating.toFixed(1)}`}
      className={cn(
        'flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs transition-all min-h-[44px] active:scale-[0.97]',
        isMvp
          ? 'bg-gold/[0.06] border border-gold/20 hover:bg-gold/[0.10]'
          : 'bg-white/[0.02] hover:bg-white/[0.04] border border-transparent',
      )}
    >
      {/* MVP Crown */}
      {isMvp && <Crown aria-hidden="true" className="size-3.5 text-gold flex-shrink-0" />}

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
      <span className="flex-1 font-semibold truncate min-w-0">
        {(stat.player_first_name || '?').charAt(0)}. {stat.player_last_name || '?'}
      </span>

      {/* Minutes */}
      <span className="text-white/25 font-mono text-[10px] tabular-nums flex-shrink-0">{stat.minutes_played}&apos;</span>

      {/* Goals */}
      {stat.goals > 0 && (
        <span className="text-gold font-bold flex-shrink-0">
          &#9917;{stat.goals > 1 ? ` ${stat.goals}` : ''}
        </span>
      )}

      {/* Assists */}
      {stat.assists > 0 && (
        <span className="text-sky-400 font-bold flex-shrink-0">
          &#127344;{stat.assists > 1 ? ` ${stat.assists}` : ''}
        </span>
      )}

      {/* Cards */}
      {stat.yellow_card && <span className="w-2 h-2.5 bg-yellow-400 rounded-[1px] inline-block flex-shrink-0" aria-hidden="true" />}
      {stat.red_card && <span className="w-2 h-2.5 bg-red-500 rounded-[1px] inline-block flex-shrink-0" aria-hidden="true" />}

      {/* Rating badge */}
      <span
        className="min-w-[2rem] px-1.5 py-0.5 rounded-md text-[10px] font-black font-mono tabular-nums text-center flex-shrink-0"
        style={ratingHeatStyle(rating)}
      >
        {rating.toFixed(1)}
      </span>

      {/* Floor price */}
      {floorPrice != null && floorPrice > 0 && (
        <span className="text-white/30 font-mono text-[10px] tabular-nums flex-shrink-0">
          {fmtScout(floorPrice / 100)}
        </span>
      )}

      {/* Chevron */}
      <ChevronRight aria-hidden="true" className="size-3.5 text-white/20 flex-shrink-0" />
    </Link>
  );
}

/** Ranking list for one team */
function RankingList({ stats, color, label, mvpId, floorPrices }: {
  stats: FixturePlayerStat[];
  color: string;
  label: string;
  mvpId: string | null;
  floorPrices: Map<string, number>;
}) {
  const ts = useTranslations('spieltag');
  const [showUnused, setShowUnused] = useState(false);

  // Sort by rating DESC
  const sorted = [...stats].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));

  // Groups: starters, substituted (non-starter with minutes>0), unused (0 minutes)
  const starters = sorted.filter(s => s.is_starter && s.minutes_played > 0);
  const substituted = sorted.filter(s => !s.is_starter && s.minutes_played > 0);
  const unused = sorted.filter(s => s.minutes_played === 0);

  return (
    <div>
      {/* Team header with accent bar */}
      <div className="flex items-center gap-2 mb-2.5">
        <div className="w-[3px] h-4 rounded-full" style={{ backgroundColor: color }} />
        <span className="text-xs font-black uppercase tracking-wider" style={{ color }}>{label}</span>
        <div className="flex-1 h-px" style={{ background: `linear-gradient(90deg, ${color}20, transparent)` }} />
      </div>

      {/* Starters */}
      {starters.length > 0 && (
        <div className="mb-2">
          <div className="text-[10px] font-bold text-white/20 uppercase tracking-wider mb-1 px-1">{ts('starters')}</div>
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
        <div className="mb-2">
          <div className="text-[10px] font-bold text-white/20 uppercase tracking-wider mb-1 px-1">{ts('substitutesGroup')}</div>
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
        <div>
          <button
            onClick={() => setShowUnused(prev => !prev)}
            aria-pressed={showUnused}
            aria-label={`${ts('unused')} (${unused.length})`}
            className="flex items-center gap-1.5 text-[10px] font-bold text-white/20 uppercase tracking-wider mb-1 px-1 hover:text-white/40 transition-colors min-h-[44px]"
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
function GoalTicker({ stats, homeClubId }: { stats: FixturePlayerStat[]; homeClubId: string }) {
  const scorers = stats
    .filter(s => s.goals > 0)
    .sort((a, b) => {
      // Home goals first
      const aHome = a.club_id === homeClubId ? 0 : 1;
      const bHome = b.club_id === homeClubId ? 0 : 1;
      if (aHome !== bHome) return aHome - bHome;
      // Then by goals DESC
      return b.goals - a.goals;
    });

  if (scorers.length === 0) return null;

  return (
    <div className="overflow-x-auto scrollbar-hide snap-x px-4 py-2 border-b border-white/[0.06]">
      <div className="flex items-center gap-2">
        {scorers.map(s => {
          const href = s.player_id ? `/player/${s.player_id}` : '#';
          return (
            <Link
              key={s.id}
              href={href}
              aria-label={`${s.player_last_name || '?'} — ${s.goals} goal${s.goals > 1 ? 's' : ''}`}
              className="flex items-center gap-1.5 snap-start px-3 py-1.5 rounded-lg bg-gold/[0.06] border border-gold/15 hover:bg-gold/[0.10] transition-colors min-h-[44px] flex-shrink-0 active:scale-[0.97]"
            >
              <div className={cn('size-1.5 rounded-full flex-shrink-0', getPosDotColor(s.player_position))} aria-hidden="true" />
              <span className="text-xs font-bold text-gold whitespace-nowrap">
                {s.player_last_name || '?'}
                {s.goals > 1 && <span className="font-mono tabular-nums ml-0.5">&times;{s.goals}</span>}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

/** Match timeline with substitutions */
function MatchTimeline({ substitutions, homeClubId, homeColor, awayColor }: {
  substitutions: FixtureSubstitution[];
  homeClubId: string;
  homeColor: string;
  awayColor: string;
}) {
  const ts = useTranslations('spieltag');
  const [showAll, setShowAll] = useState(false);

  if (substitutions.length === 0) return null;

  const sorted = [...substitutions].sort((a, b) => {
    const minA = a.minute + (a.extra_minute ?? 0) / 100;
    const minB = b.minute + (b.extra_minute ?? 0) / 100;
    return minA - minB;
  });

  const visible = showAll ? sorted : sorted.slice(0, 6);
  const hasMore = sorted.length > 6;

  return (
    <div className="relative z-10 mt-4 pt-3 border-t border-white/[0.08]">
      <div className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] text-center mb-2.5">{ts('matchTimeline')}</div>
      <div className="relative pl-4">
        {/* Vertical timeline line */}
        <div className="absolute left-1.5 top-0 bottom-0 w-px bg-white/[0.08]" aria-hidden="true" />

        <div className="space-y-1.5">
          {visible.map(sub => {
            const isHomeSub = sub.club_id === homeClubId;
            const accentColor = isHomeSub ? homeColor : awayColor;
            return (
              <div key={sub.id} className="relative flex items-center gap-2 px-2.5 py-2 bg-black/30 rounded-xl text-xs border border-white/[0.05] backdrop-blur-sm min-h-[44px]">
                {/* Timeline dot */}
                <div
                  className="absolute -left-[13px] top-1/2 -translate-y-1/2 size-2 rounded-full border border-white/20"
                  style={{ backgroundColor: accentColor }}
                  aria-hidden="true"
                />
                <div className="w-[3px] h-5 rounded-full flex-shrink-0" style={{ backgroundColor: accentColor }} />
                <span className="text-white/25 font-mono font-bold tabular-nums w-9 text-right flex-shrink-0">
                  {sub.minute}&apos;{sub.extra_minute ? `+${sub.extra_minute}` : ''}
                </span>
                <span className="text-red-400/80 flex-shrink-0 text-[10px]" aria-label="ausgewechselt">&#9660;</span>
                <span className="text-white/40 truncate min-w-0 text-xs">
                  {sub.player_out_last_name || sub.player_out_name}
                </span>
                <span className="text-white/15 flex-shrink-0" aria-hidden="true">&rarr;</span>
                <span className="text-emerald-400/80 flex-shrink-0 text-[10px]" aria-label="eingewechselt">&#9650;</span>
                <span className="text-white/70 font-semibold truncate min-w-0 text-xs">
                  {sub.player_in_last_name || sub.player_in_name}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {hasMore && (
        <button
          onClick={() => setShowAll(prev => !prev)}
          aria-pressed={showAll}
          aria-label={showAll ? ts('showLess') : ts('showMore')}
          className="mt-2 w-full text-center text-[10px] font-bold text-white/30 hover:text-white/50 transition-colors py-2 min-h-[44px]"
        >
          {showAll ? ts('showLess') : ts('showMore')} ({sorted.length - 6})
        </button>
      )}
    </div>
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
  const [detailTab, setDetailTab] = useState<'ranking' | 'formation'>('ranking');
  const [floorPrices, setFloorPrices] = useState<Map<string, number>>(new Map());

  useEffect(() => {
    if (!fixture || !isOpen) return;
    let cancelled = false;
    setLoading(true);
    setDetailTab('ranking');
    Promise.all([
      getFixturePlayerStats(fixture.id),
      getFixtureSubstitutions(fixture.id),
    ]).then(([statsData, subsData]) => {
      if (!cancelled) {
        setStats(statsData);
        setSubstitutions(subsData);
        setLoading(false);
      }
    }).catch(() => { if (!cancelled) setLoading(false); });
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
      const rating = s.rating ?? s.fantasy_points / 10;
      if (!best || rating > (best.rating ?? best.fantasy_points / 10)) {
        best = s;
      }
    }
    return best?.player_id ?? null;
  }, [stats]);

  if (!fixture) return null;

  const homeStats = stats.filter(s => s.club_id === fixture.home_club_id);
  const awayStats = stats.filter(s => s.club_id === fixture.away_club_id);
  const homeClub = getClub(fixture.home_club_short) || getClub(fixture.home_club_name);
  const awayClub = getClub(fixture.away_club_short) || getClub(fixture.away_club_name);
  const isSimulated = fixture.status === 'simulated' || fixture.status === 'finished';
  const homeColor = homeClub?.colors.primary ?? '#22C55E';
  const awayColor = awayClub?.colors.primary ?? '#3B82F6';

  return (
    <Modal open={isOpen} title="" onClose={onClose} size="lg">
      {/* Score Header — outside scroll area */}
      <div
        className="relative overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, transparent 100%)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)',
        }}
      >
        {/* Multi-layer gradient background */}
        <div className="absolute inset-0" style={{
          background: `
            radial-gradient(ellipse 80% 50% at 15% 50%, ${homeColor}15 0%, transparent 70%),
            radial-gradient(ellipse 80% 50% at 85% 50%, ${awayColor}15 0%, transparent 70%),
            radial-gradient(ellipse 100% 80% at 50% 0%, rgba(255,215,0,0.04) 0%, transparent 60%)
          `,
        }} />
        {/* Subtle noise texture via top gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent" />

        <div className="relative flex items-center justify-center gap-5 md:gap-10 pt-4 pb-5 px-4">
          {/* Home Club */}
          <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
            <div className="relative" style={{ filter: `drop-shadow(0 0 16px ${homeColor}30)` }}>
              <ClubLogo club={homeClub} size={64} short={fixture.home_club_short} />
              {/* Ambient ring */}
              <div className="absolute inset-0 rounded-full" style={{
                boxShadow: `0 0 24px 4px ${homeColor}15`,
              }} />
            </div>
            <span className="font-black text-sm md:text-base text-center leading-tight">{fixture.home_club_name}</span>
          </div>

          {/* Score Center */}
          <div className="text-center shrink-0">
            {isSimulated ? (
              <>
                <div className="flex items-center gap-2.5 md:gap-4">
                  <span
                    className="font-mono font-black text-5xl md:text-6xl tabular-nums leading-none"
                    style={{
                      background: 'linear-gradient(180deg, #FFE44D, #E6B800)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                    }}
                  >
                    {fixture.home_score}
                  </span>
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-[3px] h-3 rounded-full bg-gold/40" aria-hidden="true" />
                    <div className="w-[3px] h-3 rounded-full bg-gold/20" aria-hidden="true" />
                  </div>
                  <span
                    className="font-mono font-black text-5xl md:text-6xl tabular-nums leading-none"
                    style={{
                      background: 'linear-gradient(180deg, #FFE44D, #E6B800)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                    }}
                  >
                    {fixture.away_score}
                  </span>
                </div>
                <div className="flex items-center justify-center gap-2 mt-2.5">
                  <span className="px-2 py-0.5 rounded-md bg-gold/10 border border-gold/20 text-[10px] font-black text-gold uppercase tracking-wider">FT</span>
                  <span className="text-[10px] text-white/25 font-medium">Spieltag {fixture.gameweek}</span>
                </div>
              </>
            ) : (
              <>
                <div className="font-mono font-black text-4xl md:text-5xl text-white/20">vs</div>
                <div className="flex items-center justify-center gap-2 mt-2">
                  <span className="text-[10px] text-white/25 font-medium">Spieltag {fixture.gameweek}</span>
                </div>
              </>
            )}
          </div>

          {/* Away Club */}
          <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
            <div className="relative" style={{ filter: `drop-shadow(0 0 16px ${awayColor}30)` }}>
              <ClubLogo club={awayClub} size={64} short={fixture.away_club_short} />
              <div className="absolute inset-0 rounded-full" style={{
                boxShadow: `0 0 24px 4px ${awayColor}15`,
              }} />
            </div>
            <span className="font-black text-sm md:text-base text-center leading-tight">{fixture.away_club_name}</span>
          </div>
        </div>

        {/* Bottom edge glow */}
        <div className="h-[2px]" style={{
          background: `linear-gradient(90deg, transparent, ${homeColor}30, #FFD70025, ${awayColor}30, transparent)`,
        }} />
      </div>

      {/* Goal Ticker */}
      {stats.length > 0 && (
        <GoalTicker stats={stats} homeClubId={fixture.home_club_id} />
      )}

      {/* Tabs — Pill style */}
      {stats.length > 0 && (
        <div className="flex items-center justify-center gap-2 px-4 py-3">
          {(['ranking', 'formation'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setDetailTab(tab)}
              aria-pressed={detailTab === tab}
              className={cn(
                'px-4 py-1.5 rounded-lg text-sm font-bold transition-colors min-h-[44px]',
                detailTab === tab
                  ? 'bg-gold/15 text-gold border border-gold/20'
                  : 'text-white/35 hover:text-white/55 hover:bg-white/[0.04] border border-transparent',
              )}
            >
              {tab === 'ranking' ? ts('ranking') : ts('formationTab')}
            </button>
          ))}
        </div>
      )}

      <div className="max-h-[60vh] overflow-y-auto">
        <div className="p-4 md:p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 aria-hidden="true" className="size-6 animate-spin motion-reduce:animate-none text-gold" />
            </div>
          ) : stats.length === 0 ? (
            <div className="text-center text-white/30 py-12">
              {isSimulated ? ts('noPlayerData') : ts('notSimulated')}
            </div>
          ) : detailTab === 'ranking' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <RankingList
                stats={homeStats}
                color={homeColor}
                label={fixture.home_club_name}
                mvpId={mvpId}
                floorPrices={floorPrices}
              />
              <RankingList
                stats={awayStats}
                color={awayColor}
                label={fixture.away_club_name}
                mvpId={mvpId}
                floorPrices={floorPrices}
              />
            </div>
          ) : (
            <div className="rounded-2xl overflow-hidden border border-white/[0.08] shadow-[0_0_40px_rgba(0,0,0,0.4)]">
              {/* Sponsor Banner Top */}
              {(() => {
                const sponsor = sponsorName ? { sponsorName, sponsorLogo } : null;
                return (
                  <div className="bg-gradient-to-r from-[#0a0a12] via-[#111827] to-[#0a0a12] px-4 py-2 flex items-center justify-center gap-3 border-b border-white/[0.06]">
                    {sponsor?.sponsorLogo ? (
                      <img src={sponsor.sponsorLogo} alt="" className="h-4 w-auto object-contain opacity-60" />
                    ) : (
                      <div className="size-1 rounded-full bg-gold/40" aria-hidden="true" />
                    )}
                    <span className="text-[10px] font-bold text-white/30 uppercase tracking-[0.15em]">{sponsor?.sponsorName || tsp('sponsorPlaceholder')}</span>
                    {sponsor?.sponsorLogo ? (
                      <img src={sponsor.sponsorLogo} alt="" className="h-4 w-auto object-contain opacity-60" />
                    ) : (
                      <div className="size-1 rounded-full bg-gold/40" aria-hidden="true" />
                    )}
                  </div>
                );
              })()}

              {/* Green Pitch — enhanced atmosphere */}
              <div className="relative px-3 md:px-6 py-4" style={{
                background: `
                  linear-gradient(180deg,
                    rgba(22,80,22,0.45) 0%,
                    rgba(26,90,26,0.35) 25%,
                    rgba(30,100,30,0.30) 50%,
                    rgba(26,90,26,0.35) 75%,
                    rgba(22,80,22,0.45) 100%
                  )
                `,
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
                  <rect x="140" y="8" width="120" height="32" fill="none" stroke="white" strokeOpacity="0.07" strokeWidth="1" />
                  <rect x="105" y="517" width="190" height="75" fill="none" stroke="white" strokeOpacity="0.10" strokeWidth="1" />
                  <rect x="140" y="560" width="120" height="32" fill="none" stroke="white" strokeOpacity="0.07" strokeWidth="1" />
                  {/* Penalty arcs */}
                  <path d="M 160 83 Q 200 110 240 83" fill="none" stroke="white" strokeOpacity="0.06" strokeWidth="1" />
                  <path d="M 160 517 Q 200 490 240 517" fill="none" stroke="white" strokeOpacity="0.06" strokeWidth="1" />
                  {/* Grass stripes — alternating bands */}
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(i => (
                    i % 2 === 0 ? <rect key={i} x="16" y={8 + i * 48.67} width="368" height="48.67" fill="white" fillOpacity="0.018" /> : null
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
                          <span className="text-[10px] text-white/10 font-black tracking-widest uppercase">BeScout</span>
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
                        <RankingList stats={homeStats} color={homeColor} label={`${fixture.home_club_name} ${homeFormation ? `(${homeFormation})` : ''}`} mvpId={mvpId} floorPrices={floorPrices} />
                        <RankingList stats={awayStats} color={awayColor} label={`${fixture.away_club_name} ${awayFormation ? `(${awayFormation})` : ''}`} mvpId={mvpId} floorPrices={floorPrices} />
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
                        homeColor={homeColor}
                        awayColor={awayColor}
                      />
                      {/* Bench fallback when no substitution data */}
                      {substitutions.length === 0 && (() => {
                        const allBench = [...homeSplit.bench, ...awaySplit.bench];
                        if (allBench.length === 0) return null;
                        return (
                          <div className="relative z-10 mt-4 pt-3 border-t border-white/[0.08]">
                            <div className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] text-center mb-2.5">{ts('substitutesGroup')}</div>
                            <div className="flex gap-1.5 flex-wrap justify-center">
                              {allBench.map(s => (
                                <div key={s.id} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-black/30 rounded-xl text-xs border border-white/[0.05]">
                                  <span className={cn('px-1 py-0.5 rounded text-[10px] font-bold', posColor(s.player_position))}>
                                    {s.player_position}
                                  </span>
                                  <span className="text-white/50 font-medium">{s.player_last_name || '?'}</span>
                                  <span className="text-white/20 font-mono tabular-nums">{s.minutes_played}&apos;</span>
                                  <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-bold font-mono tabular-nums', scoreBadgeColor(s.rating ?? s.fantasy_points / 10))}>
                                    {(s.rating ?? s.fantasy_points / 10).toFixed(1)}
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
                  <div className="bg-gradient-to-r from-[#0a0a12] via-[#0f1a2e] to-[#0a0a12] px-4 py-2.5 flex items-center justify-center gap-3 border-t border-white/[0.06]">
                    {sponsor?.sponsorLogo ? (
                      <img src={sponsor.sponsorLogo} alt="" className="h-4 w-auto object-contain opacity-40" />
                    ) : (
                      <div className="size-1 rounded-full bg-gold/30" aria-hidden="true" />
                    )}
                    <span className="text-[10px] text-white/20 font-bold uppercase tracking-[0.15em]">
                      {sponsor?.sponsorName ? `${sponsor.sponsorName} × BeScout` : 'Powered by BeScout'}
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
