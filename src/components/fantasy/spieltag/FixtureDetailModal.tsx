'use client';

import React, { useState, useEffect } from 'react';
import { Loader2, Star } from 'lucide-react';
import { Modal } from '@/components/ui';
import { useTranslations } from 'next-intl';
import { getClub } from '@/lib/clubs';
import { getFixturePlayerStats, getFixtureSubstitutions } from '@/lib/services/fixtures';
import type { Fixture, FixturePlayerStat, FixtureSubstitution, Pos } from '@/types';
import { PlayerPhoto, GoalBadge } from '@/components/player';
import { ClubLogo } from './ClubLogo';
import { posColor, scoreBadgeColor, getPosAccent, getRingFrameClass, ratingHeatStyle } from './helpers';

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

function PlayerNode({ stat }: { stat: FixturePlayerStat }) {
  const rating = stat.rating ?? stat.fantasy_points / 10;

  return (
    <div className="flex flex-col items-center relative w-[52px] md:w-[60px] lg:w-[72px]">
      <div
        className="absolute -top-1.5 -right-1 md:-top-2 md:-right-2 z-20 min-w-[1.5rem] md:min-w-[1.7rem] px-1 py-0.5 rounded-md text-[10px] md:text-xs font-mono font-black text-center shadow-lg border border-white/[0.08]"
        style={ratingHeatStyle(rating)}
      >
        {rating.toFixed(1)}
      </div>
      <div className={`relative rounded-full ${getRingFrameClass(stat.player_position)} shadow-[0_0_12px_rgba(0,0,0,0.5)]`}>
        <PlayerPhoto
          imageUrl={stat.player_image_url}
          first={stat.player_first_name}
          last={stat.player_last_name}
          pos={stat.player_position as Pos}
          size={36}
          className="md:size-10 lg:size-12"
        />
        <GoalBadge goals={stat.goals} size={15} className="-bottom-0.5 -right-1" />
      </div>
      <div className="text-[10px] md:text-xs mt-1 font-bold text-center truncate max-w-full text-white/80 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
        {stat.player_last_name}
      </div>
      <div className="hidden md:flex items-center justify-center gap-0.5 text-[10px] text-white/30">
        <span className="tabular-nums">{stat.minutes_played}&apos;</span>
        {stat.goals > 0 && <span className="text-gold font-bold">{stat.goals}G</span>}
        {stat.assists > 0 && <span className="text-sky-400 font-bold">{stat.assists}A</span>}
        {stat.yellow_card && <span className="w-1.5 h-2.5 bg-yellow-400 rounded-[1px] inline-block" />}
        {stat.red_card && <span className="w-1.5 h-2.5 bg-red-500 rounded-[1px] inline-block" />}
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

function FormationHalf({ stats, teamName, color, isHome, formation, logo }: {
  stats: FixturePlayerStat[];
  teamName: string;
  color: string;
  isHome: boolean;
  formation: string;
  logo: ReturnType<typeof getClub>;
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
          {players.map(s => <PlayerNode key={s.id} stat={s} />)}
        </div>
      ))}
    </div>
  );
}

function TeamStatsList({ label, stats, color }: { label: string; stats: FixturePlayerStat[]; color: string }) {
  const sorted = [...stats].sort((a, b) => {
    if (a.minutes_played >= 60 && b.minutes_played < 60) return -1;
    if (a.minutes_played < 60 && b.minutes_played >= 60) return 1;
    return (b.rating ?? 0) - (a.rating ?? 0);
  });

  return (
    <div>
      {/* Team header with accent bar */}
      <div className="flex items-center gap-2 mb-2.5">
        <div className="w-[3px] h-4 rounded-full" style={{ backgroundColor: color }} />
        <span className="text-xs font-black uppercase tracking-wider" style={{ color }}>{label}</span>
        <div className="flex-1 h-px" style={{ background: `linear-gradient(90deg, ${color}20, transparent)` }} />
      </div>
      <div className="space-y-1">
        {sorted.map(s => (
          <div key={s.id} className="flex items-center gap-2 px-2.5 py-2 bg-white/[0.02] hover:bg-white/[0.04] rounded-xl text-xs transition-colors">
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${posColor(s.player_position)}`}>
              {s.player_position}
            </span>
            <span className="flex-1 font-semibold truncate min-w-0">
              {s.player_first_name.charAt(0)}. {s.player_last_name}
            </span>
            <span className="text-white/25 font-mono text-[10px] tabular-nums">{s.minutes_played}&apos;</span>
            {s.goals > 0 && <span className="text-gold font-bold">{s.goals}G</span>}
            {s.assists > 0 && <span className="text-sky-400 font-bold">{s.assists}A</span>}
            {s.clean_sheet && <span className="text-emerald-400 text-[10px] font-bold">CS</span>}
            {s.yellow_card && <span className="w-2 h-2.5 bg-yellow-400 rounded-[1px] inline-block" />}
            {s.red_card && <span className="w-2 h-2.5 bg-red-500 rounded-[1px] inline-block" />}
            {s.bonus > 0 && (
              <span className="flex items-center gap-0.5 text-gold font-bold">
                <Star aria-hidden="true" className="size-2.5" />{s.bonus}
              </span>
            )}
            <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-black tabular-nums ${scoreBadgeColor(s.rating ?? s.fantasy_points / 10)}`}>
              {(s.rating ?? s.fantasy_points / 10).toFixed(1)}
            </span>
          </div>
        ))}
      </div>
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
  const [detailTab, setDetailTab] = useState<'formation' | 'players'>('formation');

  useEffect(() => {
    if (!fixture || !isOpen) return;
    let cancelled = false;
    setLoading(true);
    setDetailTab('formation');
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
      <div className="max-h-[80vh] overflow-y-auto">
        {/* Score Header — Stadium Atmosphere */}
        <div className="relative overflow-hidden">
          {/* Multi-layer gradient background */}
          <div className="absolute inset-0" style={{
            background: `
              radial-gradient(ellipse 80% 50% at 15% 50%, ${homeColor}20 0%, transparent 70%),
              radial-gradient(ellipse 80% 50% at 85% 50%, ${awayColor}20 0%, transparent 70%),
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
              <span className="font-black text-sm md:text-base text-center truncate max-w-[100px] md:max-w-[140px]">{fixture.home_club_name}</span>
            </div>

            {/* Score Center */}
            <div className="text-center shrink-0">
              {isSimulated ? (
                <>
                  <div className="flex items-center gap-2.5 md:gap-4">
                    <span className="font-mono font-black text-5xl md:text-6xl tabular-nums score-glow leading-none">{fixture.home_score}</span>
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-[3px] h-3 rounded-full bg-gold/40" />
                      <div className="w-[3px] h-3 rounded-full bg-gold/20" />
                    </div>
                    <span className="font-mono font-black text-5xl md:text-6xl tabular-nums score-glow leading-none">{fixture.away_score}</span>
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
              <span className="font-black text-sm md:text-base text-center truncate max-w-[100px] md:max-w-[140px]">{fixture.away_club_name}</span>
            </div>
          </div>

          {/* Bottom edge glow */}
          <div className="h-[2px]" style={{
            background: `linear-gradient(90deg, transparent, ${homeColor}30, #FFD70025, ${awayColor}30, transparent)`,
          }} />
        </div>

        {/* Tabs — Pill style */}
        {stats.length > 0 && (
          <div className="flex items-center justify-center gap-2 px-4 py-3">
            {(['formation', 'players'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setDetailTab(tab)}
                className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-colors ${
                  detailTab === tab
                    ? 'bg-gold/15 text-gold border border-gold/20'
                    : 'text-white/35 hover:text-white/55 hover:bg-white/[0.04] border border-transparent'
                }`}
              >
                {tab === 'formation' ? ts('lineups') : ts('playersTab')}
              </button>
            ))}
          </div>
        )}

        <div className="p-4 md:p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 aria-hidden="true" className="size-6 animate-spin motion-reduce:animate-none text-gold" />
            </div>
          ) : stats.length === 0 ? (
            <div className="text-center text-white/30 py-12">
              {isSimulated ? ts('noPlayerData') : ts('notSimulated')}
            </div>
          ) : detailTab === 'formation' ? (
            <div className="rounded-2xl overflow-hidden border border-white/[0.08] shadow-[0_0_40px_rgba(0,0,0,0.4)]">
              {/* Sponsor Banner Top */}
              {(() => {
                const sponsor = sponsorName ? { sponsorName, sponsorLogo } : null;
                return (
                  <div className="bg-gradient-to-r from-[#0a0a12] via-[#111827] to-[#0a0a12] px-4 py-2 flex items-center justify-center gap-3 border-b border-white/[0.06]">
                    {sponsor?.sponsorLogo ? (
                      <img src={sponsor.sponsorLogo} alt="" className="h-4 w-auto object-contain opacity-60" />
                    ) : (
                      <div className="size-1 rounded-full bg-gold/40" />
                    )}
                    <span className="text-[10px] font-bold text-white/30 uppercase tracking-[0.15em]">{sponsor?.sponsorName || tsp('sponsorPlaceholder')}</span>
                    {sponsor?.sponsorLogo ? (
                      <img src={sponsor.sponsorLogo} alt="" className="h-4 w-auto object-contain opacity-60" />
                    ) : (
                      <div className="size-1 rounded-full bg-gold/40" />
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
                  const allBench = [...homeSplit.bench, ...awaySplit.bench];
                  // Use real formation from DB, fallback to derived
                  const homeFormation = fixture.home_formation || homeSplit.formation;
                  const awayFormation = fixture.away_formation || awaySplit.formation;
                  // Safeguard: if either team has < 11 starters, fall back to list view
                  const hasEnoughData = homeSplit.starters.length >= 11 && awaySplit.starters.length >= 11;

                  if (!hasEnoughData) {
                    return (
                      <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-4 px-2 py-4">
                        <TeamStatsList label={`${fixture.home_club_name} ${homeFormation ? `(${homeFormation})` : ''}`} stats={homeStats} color={homeColor} />
                        <TeamStatsList label={`${fixture.away_club_name} ${awayFormation ? `(${awayFormation})` : ''}`} stats={awayStats} color={awayColor} />
                      </div>
                    );
                  }

                  return (
                    <>
                      <div className="relative z-10">
                        <FormationHalf stats={homeSplit.starters} teamName={fixture.home_club_name} color={homeColor} isHome={true} formation={homeFormation} logo={homeClub} />
                        <div className="h-4 md:h-6" />
                        <FormationHalf stats={awaySplit.starters} teamName={fixture.away_club_name} color={awayColor} isHome={false} formation={awayFormation} logo={awayClub} />
                      </div>
                      {/* Substitutions: livescore-style if data available, fallback to bench list */}
                      {substitutions.length > 0 ? (
                        <div className="relative z-10 mt-4 pt-3 border-t border-white/[0.08]">
                          <div className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] text-center mb-2.5">{ts('substitutions')}</div>
                          <div className="space-y-1.5">
                            {substitutions.map(sub => {
                              const isHomeSub = sub.club_id === fixture.home_club_id;
                              const accentColor = isHomeSub ? homeColor : awayColor;
                              return (
                                <div key={sub.id} className="flex items-center gap-2 px-2.5 py-2 bg-black/30 rounded-xl text-xs border border-white/[0.05] backdrop-blur-sm">
                                  <div className="w-[3px] h-5 rounded-full flex-shrink-0" style={{ backgroundColor: accentColor }} />
                                  <span className="text-white/25 font-mono font-bold tabular-nums w-9 text-right flex-shrink-0">
                                    {sub.minute}&apos;{sub.extra_minute ? `+${sub.extra_minute}` : ''}
                                  </span>
                                  <span className="text-red-400/80 flex-shrink-0 text-[10px]" aria-label="ausgewechselt">▼</span>
                                  <span className="text-white/40 truncate min-w-0 text-xs">
                                    {sub.player_out_last_name}
                                  </span>
                                  <span className="text-white/15 flex-shrink-0">→</span>
                                  <span className="text-emerald-400/80 flex-shrink-0 text-[10px]" aria-label="eingewechselt">▲</span>
                                  <span className="text-white/70 font-semibold truncate min-w-0 text-xs">
                                    {sub.player_in_last_name}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : allBench.length > 0 && (
                        <div className="relative z-10 mt-4 pt-3 border-t border-white/[0.08]">
                          <div className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] text-center mb-2.5">{ts('substitutions')}</div>
                          <div className="flex gap-1.5 flex-wrap justify-center">
                            {allBench.map(s => (
                              <div key={s.id} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-black/30 rounded-xl text-xs border border-white/[0.05]">
                                <span className={`px-1 py-0.5 rounded text-[10px] font-bold ${posColor(s.player_position)}`}>
                                  {s.player_position}
                                </span>
                                <span className="text-white/50 font-medium">{s.player_last_name}</span>
                                <span className="text-white/20 font-mono tabular-nums">{s.minutes_played}&apos;</span>
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold tabular-nums ${scoreBadgeColor(s.rating ?? s.fantasy_points / 10)}`}>
                                  {(s.rating ?? s.fantasy_points / 10).toFixed(1)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
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
                      <div className="size-1 rounded-full bg-gold/30" />
                    )}
                    <span className="text-[10px] text-white/20 font-bold uppercase tracking-[0.15em]">
                      {sponsor?.sponsorName ? `${sponsor.sponsorName} × BeScout` : 'Powered by BeScout'}
                    </span>
                    {sponsor?.sponsorLogo ? (
                      <img src={sponsor.sponsorLogo} alt="" className="h-4 w-auto object-contain opacity-40" />
                    ) : (
                      <div className="size-1 rounded-full bg-gold/30" />
                    )}
                  </div>
                );
              })()}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TeamStatsList label={fixture.home_club_name} stats={homeStats} color={homeColor} />
              <TeamStatsList label={fixture.away_club_name} stats={awayStats} color={awayColor} />
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
