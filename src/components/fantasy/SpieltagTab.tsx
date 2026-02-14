'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  ChevronLeft, ChevronRight, Trophy, Clock, Loader2, Play, ArrowRight,
  CheckCircle2, AlertTriangle, Eye, Star, X, Shirt,
} from 'lucide-react';
import { Card, Modal } from '@/components/ui';
import { getClub } from '@/lib/clubs';
import { getFixturesByGameweek, getFixturePlayerStats, getGameweekTopScorers } from '@/lib/services/fixtures';
import { getLineup } from '@/lib/services/lineups';
import { simulateGameweekFlow } from '@/lib/services/scoring';
import type { Fixture, FixturePlayerStat } from '@/types';
import type { FantasyEvent } from './types';
import { getStatusStyle } from './helpers';
import { EventCard } from './EventCard';

// ============================================
// Helpers
// ============================================

const posColor = (pos: string) => {
  switch (pos) {
    case 'GK': return 'text-emerald-400 bg-emerald-500/15';
    case 'DEF': return 'text-amber-400 bg-amber-500/15';
    case 'MID': return 'text-sky-400 bg-sky-500/15';
    case 'ATT': return 'text-rose-400 bg-rose-500/15';
    default: return 'text-white/50 bg-white/10';
  }
};

const scoreBadgeColor = (pts: number): string => {
  if (pts >= 80) return 'bg-[#FFD700] text-black';
  if (pts >= 60) return 'bg-[#22C55E] text-white';
  if (pts >= 40) return 'bg-sky-500 text-white';
  if (pts >= 20) return 'bg-orange-500 text-white';
  return 'bg-red-500 text-white';
};

const posOrder = (pos: string): number => {
  switch (pos) { case 'ATT': return 0; case 'MID': return 1; case 'DEF': return 2; case 'GK': return 3; default: return 4; }
};

const getPosAccent = (pos: string): string => {
  switch (pos) {
    case 'GK': return '#34d399';
    case 'DEF': return '#fbbf24';
    case 'MID': return '#38bdf8';
    case 'ATT': return '#fb7185';
    default: return 'rgba(255,255,255,0.5)';
  }
};

/** Reusable club logo — <img> with fallback to colored circle */
function ClubLogo({ club, size = 28, short }: { club: ReturnType<typeof getClub>; size?: number; short?: string }) {
  if (club?.logo) {
    return (
      <img
        src={club.logo}
        alt={club.name}
        width={size}
        height={size}
        className="rounded-full object-cover flex-shrink-0"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className="rounded-full flex items-center justify-center font-black flex-shrink-0"
      style={{
        width: size,
        height: size,
        fontSize: Math.max(8, size * 0.32),
        backgroundColor: (club?.colors.primary ?? '#333') + '25',
        color: club?.colors.primary ?? '#fff',
      }}
    >
      {(short ?? club?.short ?? '???').slice(0, 3)}
    </div>
  );
}

/** Split team stats into starters (top 11 by minutes) + bench, derive formation string */
function splitStartersBench(stats: FixturePlayerStat[]): {
  starters: FixturePlayerStat[];
  bench: FixturePlayerStat[];
  formation: string;
} {
  const sorted = [...stats].sort((a, b) => b.minutes_played - a.minutes_played);
  const starters = sorted.slice(0, 11);
  const bench = sorted.slice(11).filter(s => s.minutes_played > 0);

  const counts = { DEF: 0, MID: 0, ATT: 0 };
  for (const s of starters) {
    if (s.player_position in counts) counts[s.player_position as keyof typeof counts]++;
  }
  const formation = `${counts.DEF}-${counts.MID}-${counts.ATT}`;

  return { starters, bench, formation };
}

// ============================================
// Fixture Row (Sorare-style vertical list)
// ============================================

function FixtureRow({ fixture, onSelect }: { fixture: Fixture; onSelect: () => void }) {
  const homeClub = getClub(fixture.home_club_short) || getClub(fixture.home_club_name);
  const awayClub = getClub(fixture.away_club_short) || getClub(fixture.away_club_name);
  const isSimulated = fixture.status === 'simulated';

  return (
    <button
      onClick={onSelect}
      className="w-full flex items-center gap-3 py-3 px-4 hover:bg-white/[0.03] transition-all border-b border-white/[0.06] last:border-b-0 group"
    >
      {/* Status dot */}
      <div className="flex-shrink-0 w-5">
        {isSimulated ? (
          <div className="w-2 h-2 rounded-full bg-[#22C55E] mx-auto" />
        ) : (
          <div className="w-2 h-2 rounded-full bg-white/15 mx-auto" />
        )}
      </div>

      {/* Home team */}
      <div className="flex-1 flex items-center gap-2 justify-end min-w-0">
        <span className="font-semibold text-sm truncate">{fixture.home_club_name}</span>
        <ClubLogo club={homeClub} size={28} short={fixture.home_club_short} />
      </div>

      {/* Score / Time */}
      <div className="flex-shrink-0 w-16 text-center">
        {isSimulated ? (
          <span className="font-mono font-black text-base">
            {fixture.home_score} - {fixture.away_score}
          </span>
        ) : (
          <span className="text-white/30 text-sm font-bold">vs</span>
        )}
      </div>

      {/* Away team */}
      <div className="flex-1 flex items-center gap-2 min-w-0">
        <ClubLogo club={awayClub} size={28} short={fixture.away_club_short} />
        <span className="font-semibold text-sm truncate">{fixture.away_club_name}</span>
      </div>

      {/* Hover arrow */}
      <ChevronRight className="w-4 h-4 text-white/0 group-hover:text-white/30 transition-colors flex-shrink-0" />
    </button>
  );
}

// ============================================
// Formation Pitch View (Sorare Bild 3 style)
// ============================================

function PlayerNode({ stat }: { stat: FixturePlayerStat }) {
  const pts = stat.fantasy_points;
  const accent = getPosAccent(stat.player_position);
  const badge = scoreBadgeColor(pts);

  return (
    <div className="flex flex-col items-center relative w-[60px] md:w-[72px]">
      {/* Score badge (top-right, overlapping) */}
      <div className={`absolute -top-1.5 -right-2 z-20 min-w-[1.6rem] px-1 py-0.5 rounded-full text-[9px] font-mono font-black text-center shadow-lg ${badge}`}>
        {pts}
      </div>
      {/* Player circle */}
      <div
        className="w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center border-2 bg-black/30"
        style={{ borderColor: accent, boxShadow: `0 0 10px ${accent}25` }}
      >
        <span className="font-bold text-[10px] md:text-xs" style={{ color: accent }}>
          {stat.player_last_name.slice(0, 2).toUpperCase()}
        </span>
      </div>
      {/* Name */}
      <div className="text-[9px] md:text-[10px] mt-0.5 font-medium text-center truncate max-w-full text-white/70">
        {stat.player_last_name}
      </div>
      {/* Stats line */}
      <div className="flex items-center justify-center gap-0.5 text-[7px] md:text-[8px] text-white/30">
        <span>{stat.minutes_played}&apos;</span>
        {stat.goals > 0 && <span className="text-[#FFD700]">{stat.goals}G</span>}
        {stat.assists > 0 && <span className="text-sky-400">{stat.assists}A</span>}
        {stat.yellow_card && <span className="w-1.5 h-2 bg-yellow-400 rounded-[0.5px] inline-block" />}
        {stat.red_card && <span className="w-1.5 h-2 bg-red-500 rounded-[0.5px] inline-block" />}
        {stat.clean_sheet && <span className="text-emerald-400">CS</span>}
        {stat.bonus > 0 && <span className="text-[#FFD700]">★{stat.bonus}</span>}
      </div>
    </div>
  );
}

function FormationHalf({ stats, teamName, color, isHome, formation, logo }: {
  stats: FixturePlayerStat[];
  teamName: string;
  color: string;
  isHome: boolean;
  formation: string;
  logo: ReturnType<typeof getClub>;
}) {
  // Group by position
  const grouped = new Map<string, FixturePlayerStat[]>();
  for (const s of stats) {
    const pos = s.player_position || 'MID';
    const existing = grouped.get(pos) || [];
    existing.push(s);
    grouped.set(pos, existing);
  }

  // Home (top half): GK → DEF → MID → ATT (GK near own goal, ATT near center)
  // Away (bottom half): ATT → MID → DEF → GK (ATT near center, GK near own goal)
  const order = isHome
    ? (pos: string) => { switch (pos) { case 'GK': return 0; case 'DEF': return 1; case 'MID': return 2; case 'ATT': return 3; default: return 4; } }
    : (pos: string) => { switch (pos) { case 'ATT': return 0; case 'MID': return 1; case 'DEF': return 2; case 'GK': return 3; default: return 4; } };

  const rows = Array.from(grouped.entries())
    .sort((a, b) => order(a[0]) - order(b[0]))
    .map(([, players]) => players.sort((a, b) => b.fantasy_points - a.fantasy_points));

  return (
    <div className="flex flex-col gap-3 py-2">
      {/* Team label with logo + formation */}
      <div className="flex items-center justify-center gap-2">
        <ClubLogo club={logo} size={20} />
        <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color }}>
          {teamName}
        </span>
        <span className="text-[9px] text-white/30 font-mono">({formation})</span>
      </div>
      {/* Formation rows — only starters */}
      {rows.map((players, rowIdx) => (
        <div key={rowIdx} className="flex items-center justify-center gap-2 md:gap-4">
          {players.map(s => <PlayerNode key={s.id} stat={s} />)}
        </div>
      ))}
    </div>
  );
}

// ============================================
// Fixture Detail Modal
// ============================================

function FixtureDetailModal({ fixture, isOpen, onClose }: { fixture: Fixture | null; isOpen: boolean; onClose: () => void }) {
  const [stats, setStats] = useState<FixturePlayerStat[]>([]);
  const [loading, setLoading] = useState(false);
  const [detailTab, setDetailTab] = useState<'formation' | 'players'>('formation');

  useEffect(() => {
    if (!fixture || !isOpen) return;
    let cancelled = false;
    setLoading(true);
    setDetailTab('formation');
    getFixturePlayerStats(fixture.id).then(data => {
      if (!cancelled) { setStats(data); setLoading(false); }
    }).catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [fixture, isOpen]);

  if (!fixture) return null;

  const homeStats = stats.filter(s => s.club_id === fixture.home_club_id);
  const awayStats = stats.filter(s => s.club_id === fixture.away_club_id);
  const homeClub = getClub(fixture.home_club_short) || getClub(fixture.home_club_name);
  const awayClub = getClub(fixture.away_club_short) || getClub(fixture.away_club_name);
  const isSimulated = fixture.status === 'simulated';
  const homeColor = homeClub?.colors.primary ?? '#22C55E';
  const awayColor = awayClub?.colors.primary ?? '#3B82F6';

  return (
    <Modal open={isOpen} title="" onClose={onClose}>
      <div className="max-h-[80vh] overflow-y-auto">
        {/* Score Header — Sorare-style gradient */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0" style={{
            background: `linear-gradient(135deg, ${homeColor}15 0%, transparent 50%, ${awayColor}15 100%)`,
          }} />
          <div className="relative flex items-center justify-center gap-4 md:gap-8 py-6 px-4">
            {/* Home */}
            <div className="flex flex-col items-center gap-1.5">
              <ClubLogo club={homeClub} size={52} short={fixture.home_club_short} />
              <span className="font-bold text-sm md:text-base">{fixture.home_club_name}</span>
            </div>

            {/* Score */}
            <div className="text-center">
              <div className="font-mono font-black text-3xl md:text-4xl">
                {isSimulated ? `${fixture.home_score} - ${fixture.away_score}` : 'vs'}
              </div>
              {isSimulated && (
                <div className="text-[10px] text-white/30 mt-1">Spieltag {fixture.gameweek}</div>
              )}
            </div>

            {/* Away */}
            <div className="flex flex-col items-center gap-1.5">
              <ClubLogo club={awayClub} size={52} short={fixture.away_club_short} />
              <span className="font-bold text-sm md:text-base">{fixture.away_club_name}</span>
            </div>
          </div>
        </div>

        {/* Tabs: Aufstellungen / Spieler */}
        {stats.length > 0 && (
          <div className="flex items-center justify-center gap-6 border-b border-white/[0.06] px-4">
            {(['formation', 'players'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setDetailTab(tab)}
                className={`py-3 text-sm font-semibold border-b-2 transition-all ${
                  detailTab === tab
                    ? 'text-white border-white'
                    : 'text-white/40 border-transparent hover:text-white/60'
                }`}
              >
                {tab === 'formation' ? 'Aufstellungen' : 'Spieler'}
              </button>
            ))}
          </div>
        )}

        <div className="p-4 md:p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-[#FFD700]" />
            </div>
          ) : stats.length === 0 ? (
            <div className="text-center text-white/30 py-12">
              {isSimulated ? 'Keine Spielerdaten verfügbar' : 'Spiel noch nicht simuliert — Aufstellungen werden nach Simulation angezeigt'}
            </div>
          ) : detailTab === 'formation' ? (
            /* ===== FORMATION PITCH VIEW (Green Pitch — matches EventDetailModal) ===== */
            <div className="rounded-xl overflow-hidden border border-[#22C55E]/20">
              {/* Sponsor Banner Top */}
              <div className="bg-gradient-to-r from-[#1a1a2e] via-[#16213e] to-[#1a1a2e] px-4 py-2 flex items-center justify-center gap-3 border-b border-white/10">
                <Star className="w-3 h-3 text-[#FFD700]" />
                <span className="text-xs font-bold tracking-widest text-white/50 uppercase">Sponsor-Fläche</span>
                <Star className="w-3 h-3 text-[#FFD700]" />
              </div>

              {/* Green Pitch */}
              <div className="relative bg-gradient-to-b from-[#1a5c1a]/40 via-[#1e6b1e]/30 to-[#1a5c1a]/40 px-3 md:px-6 py-4">
                {/* SVG Field Markings */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none" viewBox="0 0 400 600">
                  {/* Outer border */}
                  <rect x="20" y="10" width="360" height="580" fill="none" stroke="white" strokeOpacity="0.1" strokeWidth="1.5" />
                  {/* Center line */}
                  <line x1="20" y1="300" x2="380" y2="300" stroke="white" strokeOpacity="0.08" strokeWidth="1" />
                  {/* Center circle */}
                  <circle cx="200" cy="300" r="45" fill="none" stroke="white" strokeOpacity="0.08" strokeWidth="1" />
                  <circle cx="200" cy="300" r="3" fill="white" fillOpacity="0.1" />
                  {/* Top penalty area (home goal) */}
                  <rect x="110" y="10" width="180" height="70" fill="none" stroke="white" strokeOpacity="0.08" strokeWidth="1" />
                  <rect x="145" y="10" width="110" height="30" fill="none" stroke="white" strokeOpacity="0.06" strokeWidth="1" />
                  {/* Bottom penalty area (away goal) */}
                  <rect x="110" y="520" width="180" height="70" fill="none" stroke="white" strokeOpacity="0.08" strokeWidth="1" />
                  <rect x="145" y="560" width="110" height="30" fill="none" stroke="white" strokeOpacity="0.06" strokeWidth="1" />
                  {/* Grass stripes */}
                  {[0, 1, 2, 3, 4, 5].map(i => (
                    <rect key={i} x="20" y={10 + i * 96.67} width="360" height="48.33" fill="white" fillOpacity="0.015" />
                  ))}
                </svg>

                {/* Center circle sponsor overlay */}
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                  <div className="w-16 h-16 rounded-full border border-white/[0.06] flex items-center justify-center">
                    <span className="text-[7px] text-white/15 font-bold tracking-wider uppercase">Sponsor</span>
                  </div>
                </div>

                {/* Both teams on pitch — starters only (11 per team) */}
                {(() => {
                  const homeSplit = splitStartersBench(homeStats);
                  const awaySplit = splitStartersBench(awayStats);
                  const allBench = [...homeSplit.bench, ...awaySplit.bench];
                  return (
                    <>
                      <div className="relative z-10">
                        <FormationHalf stats={homeSplit.starters} teamName={fixture.home_club_name} color={homeColor} isHome={true} formation={homeSplit.formation} logo={homeClub} />
                        <div className="h-4 md:h-6" />
                        <FormationHalf stats={awaySplit.starters} teamName={fixture.away_club_name} color={awayColor} isHome={false} formation={awaySplit.formation} logo={awayClub} />
                      </div>

                      {/* Bench section inside pitch area */}
                      {allBench.length > 0 && (
                        <div className="relative z-10 mt-3 pt-3 border-t border-white/[0.06]">
                          <div className="text-[9px] font-bold text-white/25 uppercase tracking-wider text-center mb-2">Einwechslungen</div>
                          <div className="flex gap-1.5 flex-wrap justify-center">
                            {allBench.map(s => (
                              <div key={s.id} className="flex items-center gap-1 px-2 py-1 bg-black/20 rounded-lg text-[9px] border border-white/[0.06]">
                                <span className={`px-1 py-0.5 rounded text-[8px] font-bold ${posColor(s.player_position)}`}>
                                  {s.player_position}
                                </span>
                                <span className="text-white/50">{s.player_last_name}</span>
                                <span className="text-white/25 font-mono">{s.minutes_played}&apos;</span>
                                <span className={`px-1 py-0.5 rounded text-[8px] font-bold ${scoreBadgeColor(s.fantasy_points)}`}>
                                  {s.fantasy_points}
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
              <div className="bg-gradient-to-r from-[#1a1a2e] via-[#0f3460] to-[#1a1a2e] px-3 py-2 flex items-center justify-between border-t border-white/10">
                <div className="flex items-center gap-2 px-3 py-1 bg-white/[0.04] rounded-lg border border-white/[0.06]">
                  <span className="text-[9px] text-white/30 font-medium">Sponsor Logo</span>
                </div>
                <span className="text-[8px] text-white/20 font-bold tracking-widest uppercase">Powered by BeScout</span>
                <div className="flex items-center gap-2 px-3 py-1 bg-white/[0.04] rounded-lg border border-white/[0.06]">
                  <span className="text-[9px] text-white/30 font-medium">Sponsor Logo</span>
                </div>
              </div>
            </div>
          ) : (
            /* ===== PLAYER STATS TABLE ===== */
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

function TeamStatsList({ label, stats, color }: { label: string; stats: FixturePlayerStat[]; color: string }) {
  const sorted = [...stats].sort((a, b) => {
    if (a.minutes_played >= 60 && b.minutes_played < 60) return -1;
    if (a.minutes_played < 60 && b.minutes_played >= 60) return 1;
    return b.fantasy_points - a.fantasy_points;
  });

  return (
    <div>
      <div className="text-xs font-black uppercase tracking-wider mb-2" style={{ color }}>{label}</div>
      <div className="space-y-1">
        {sorted.map(s => (
          <div key={s.id} className="flex items-center gap-2 px-2 py-1.5 bg-white/[0.02] rounded-lg text-xs">
            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${posColor(s.player_position)}`}>
              {s.player_position}
            </span>
            <span className="flex-1 font-semibold truncate min-w-0">
              {s.player_first_name.charAt(0)}. {s.player_last_name}
            </span>
            <span className="text-white/30 font-mono text-[10px]">{s.minutes_played}&apos;</span>
            {s.goals > 0 && <span className="text-[#FFD700] font-bold">{s.goals}G</span>}
            {s.assists > 0 && <span className="text-sky-400 font-bold">{s.assists}A</span>}
            {s.clean_sheet && <span className="text-emerald-400 text-[10px]">CS</span>}
            {s.yellow_card && <span className="w-2.5 h-3 bg-yellow-400 rounded-[1px] inline-block" />}
            {s.red_card && <span className="w-2.5 h-3 bg-red-500 rounded-[1px] inline-block" />}
            {s.bonus > 0 && (
              <span className="flex items-center gap-0.5 text-[#FFD700]">
                <Star className="w-2.5 h-2.5" />{s.bonus}
              </span>
            )}
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-black ${scoreBadgeColor(s.fantasy_points)}`}>
              {s.fantasy_points}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================
// Top Scorers Section
// ============================================

function TopScorersSection({ gameweek }: { gameweek: number }) {
  const [topScorers, setTopScorers] = useState<FixturePlayerStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getGameweekTopScorers(gameweek, 10).then(data => {
      if (!cancelled) { setTopScorers(data); setLoading(false); }
    }).catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [gameweek]);

  if (loading || topScorers.length === 0) return null;

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <Trophy className="w-4 h-4 text-[#FFD700]" />
        <span className="text-sm font-black">Top Scorer — Spieltag {gameweek}</span>
      </div>
      <div className="space-y-1.5">
        {topScorers.map((s, i) => (
          <div key={s.id} className="flex items-center gap-2 text-xs">
            <span className={`w-5 text-center font-bold ${i < 3 ? 'text-[#FFD700]' : 'text-white/30'}`}>
              {i + 1}
            </span>
            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${posColor(s.player_position)}`}>
              {s.player_position}
            </span>
            <span className="flex-1 font-semibold truncate">
              {s.player_first_name} {s.player_last_name}
            </span>
            <span className="text-white/40">{s.club_short}</span>
            {s.goals > 0 && <span className="text-[#FFD700]">{s.goals}G</span>}
            {s.assists > 0 && <span className="text-sky-400">{s.assists}A</span>}
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-black ${scoreBadgeColor(s.fantasy_points)}`}>
              {s.fantasy_points}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ============================================
// SpieltagTab (Main)
// ============================================

type SpieltagTabProps = {
  gameweek: number;
  activeGameweek: number;
  clubId: string;
  isAdmin: boolean;
  events: FantasyEvent[];
  userId: string;
  onEventClick: (event: FantasyEvent) => void;
  onToggleInterest: (eventId: string) => void;
  onGameweekChange: (gw: number) => void;
  onSimulated: () => void;
};

export function SpieltagTab({
  gameweek, activeGameweek, clubId, isAdmin, events, userId,
  onEventClick, onToggleInterest, onGameweekChange, onSimulated,
}: SpieltagTabProps) {
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [fixturesLoading, setFixturesLoading] = useState(true);
  const [lineupStatuses, setLineupStatuses] = useState<Map<string, { hasLineup: boolean; score: number | null; rank: number | null }>>(new Map());
  const [simulating, setSimulating] = useState(false);
  const [selectedFixture, setSelectedFixture] = useState<Fixture | null>(null);

  // Load fixtures for current GW
  const loadFixtures = useCallback(async (gw: number) => {
    setFixturesLoading(true);
    try {
      const data = await getFixturesByGameweek(gw);
      setFixtures(data);
    } catch {
      setFixtures([]);
    }
    setFixturesLoading(false);
  }, []);

  useEffect(() => {
    loadFixtures(gameweek);
  }, [gameweek, loadFixtures]);

  // Load lineup statuses for joined events
  useEffect(() => {
    if (!userId) return;
    const joinedEvents = events.filter(e => e.isJoined);
    if (joinedEvents.length === 0) return;

    const loadStatuses = async () => {
      const statusMap = new Map<string, { hasLineup: boolean; score: number | null; rank: number | null }>();
      for (const evt of joinedEvents) {
        try {
          const lineup = await getLineup(evt.id, userId);
          statusMap.set(evt.id, {
            hasLineup: !!lineup,
            score: lineup?.total_score ?? null,
            rank: lineup?.rank ?? null,
          });
        } catch {
          statusMap.set(evt.id, { hasLineup: false, score: null, rank: null });
        }
      }
      setLineupStatuses(statusMap);
    };
    loadStatuses();
  }, [events, userId]);

  const simulatedCount = fixtures.filter(f => f.status === 'simulated').length;
  const totalGoals = fixtures.reduce((s, f) => s + (f.home_score ?? 0) + (f.away_score ?? 0), 0);
  const gwEvents = events;
  const joinedEvents = gwEvents.filter(e => e.isJoined);
  const openEvents = gwEvents.filter(e => !e.isJoined && e.status !== 'ended');
  const allEnded = gwEvents.length > 0 && gwEvents.every(e => e.status === 'ended' || e.scoredAt);
  const isCurrentGw = gameweek === activeGameweek;
  const isPast = gameweek < activeGameweek;

  const gwStatus: 'open' | 'simulated' | 'empty' =
    allEnded && simulatedCount === fixtures.length && fixtures.length > 0 ? 'simulated'
    : gwEvents.length === 0 && fixtures.length === 0 ? 'empty'
    : 'open';

  const handleSimulate = async () => {
    if (!isAdmin || simulating) return;
    setSimulating(true);
    try {
      const result = await simulateGameweekFlow(clubId, gameweek);
      if (result.success) {
        await loadFixtures(gameweek);
        onSimulated();
      }
    } catch { /* handled via toast in parent */ }
    setSimulating(false);
  };

  return (
    <div className="space-y-4">
      {/* ===== HEADER: GW Navigation + Status + Admin Actions ===== */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => onGameweekChange(Math.max(1, gameweek - 1))}
          disabled={gameweek <= 1}
          className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 disabled:opacity-30 transition-all"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="text-center flex-1">
          <div className="text-xl font-black">Spieltag {gameweek}</div>
          <div className="flex items-center justify-center gap-2 text-xs mt-0.5">
            {gwStatus === 'simulated' ? (
              <span className="flex items-center gap-1 text-[#22C55E]">
                <CheckCircle2 className="w-3 h-3" /> Beendet
                {totalGoals > 0 && <span className="text-white/40 ml-1">{totalGoals} Tore</span>}
              </span>
            ) : isCurrentGw ? (
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse" />
                <span className="text-[#22C55E] font-bold">OFFEN</span>
                <span className="text-white/40 ml-1">{gwEvents.length} Events • {fixtures.length} Spiele</span>
              </span>
            ) : isPast ? (
              <span className="text-white/40">
                {simulatedCount > 0 ? `${simulatedCount}/${fixtures.length} simuliert` : 'Vergangener Spieltag'}
              </span>
            ) : (
              <span className="flex items-center gap-1 text-white/30">
                <Clock className="w-3 h-3" /> Kommender Spieltag
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isAdmin && isCurrentGw && gwStatus === 'open' && gwEvents.length > 0 && (
            <button
              onClick={handleSimulate}
              disabled={simulating}
              className="flex items-center gap-1.5 px-3 py-2 bg-[#FFD700]/10 border border-[#FFD700]/30 rounded-xl text-sm font-bold text-[#FFD700] hover:bg-[#FFD700]/20 disabled:opacity-50 transition-all"
            >
              {simulating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              <span className="hidden sm:inline">{simulating ? 'Simuliere...' : 'Simulieren'}</span>
            </button>
          )}
          {isAdmin && gwStatus === 'simulated' && isCurrentGw && (
            <button
              onClick={() => onGameweekChange(gameweek + 1)}
              className="flex items-center gap-1.5 px-3 py-2 bg-[#22C55E]/10 border border-[#22C55E]/30 rounded-xl text-sm font-bold text-[#22C55E] hover:bg-[#22C55E]/20 transition-all"
            >
              <ArrowRight className="w-4 h-4" />
              <span className="hidden sm:inline">Nächster</span>
            </button>
          )}
          <button
            onClick={() => onGameweekChange(Math.min(38, gameweek + 1))}
            disabled={gameweek >= 38}
            className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 disabled:opacity-30 transition-all"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* ===== PAARUNGEN — Sorare-style vertical list ===== */}
      {fixtures.length > 0 && !fixturesLoading && (
        <section>
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
              <h2 className="text-xs font-black uppercase tracking-wider text-white/40">
                Paarungen
              </h2>
              <span className="text-[10px] text-white/25">{fixtures.length} Spiele</span>
            </div>
            <div>
              {fixtures.map(f => (
                <FixtureRow
                  key={f.id}
                  fixture={f}
                  onSelect={() => setSelectedFixture(f)}
                />
              ))}
            </div>
          </Card>
        </section>
      )}

      {fixturesLoading && (
        <Card className="p-8 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-white/30" />
        </Card>
      )}

      {/* ===== EVENTS FÜR DIESEN SPIELTAG ===== */}
      {openEvents.length > 0 && (
        <section>
          <h2 className="text-[11px] font-black uppercase tracking-wider text-white/40 mb-2">
            Events für diesen Spieltag
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {openEvents.map(event => (
              <EventCard
                key={event.id}
                event={event}
                onView={() => onEventClick(event)}
                onToggleInterest={() => onToggleInterest(event.id)}
              />
            ))}
          </div>
        </section>
      )}

      {/* ===== MEINE AUFSTELLUNGEN ===== */}
      {joinedEvents.length > 0 && (
        <section>
          <h2 className="text-[11px] font-black uppercase tracking-wider text-white/40 mb-2">
            Meine Aufstellungen
          </h2>
          <div className="space-y-2">
            {joinedEvents.map(event => {
              const lineupStatus = lineupStatuses.get(event.id);
              const hasLineup = lineupStatus?.hasLineup ?? false;
              const score = lineupStatus?.score;
              const rank = lineupStatus?.rank;
              const isScored = !!event.scoredAt;
              const sStyle = getStatusStyle(event.status);

              return (
                <button
                  key={event.id}
                  onClick={() => onEventClick(event)}
                  className="w-full flex items-center gap-3 p-3 bg-white/[0.03] border border-white/10 rounded-xl hover:bg-white/[0.06] transition-all text-left"
                >
                  <div className="flex-shrink-0">
                    {isScored && rank != null ? (
                      <div className="w-9 h-9 rounded-xl bg-[#FFD700]/10 flex items-center justify-center">
                        <span className="text-sm font-black text-[#FFD700]">#{rank}</span>
                      </div>
                    ) : hasLineup ? (
                      <div className="w-9 h-9 rounded-xl bg-[#22C55E]/10 flex items-center justify-center">
                        <CheckCircle2 className="w-5 h-5 text-[#22C55E]" />
                      </div>
                    ) : (
                      <div className="w-9 h-9 rounded-xl bg-orange-500/10 flex items-center justify-center">
                        <AlertTriangle className="w-5 h-5 text-orange-400" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate">{event.name}</div>
                    <div className="text-[11px] text-white/40">
                      {isScored ? (
                        <span>{score ?? 0} Punkte • Platz {rank ?? '-'} / {event.participants}</span>
                      ) : hasLineup ? (
                        <span className="text-[#22C55E]">Aufstellung gesetzt</span>
                      ) : (
                        <span className="text-orange-400">Noch keine Aufstellung</span>
                      )}
                    </div>
                  </div>
                  <div className={`flex items-center gap-1 px-2 py-0.5 rounded ${sStyle.bg} ${sStyle.text}`}>
                    {sStyle.pulse && <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
                    <span className="text-[9px] font-bold">{sStyle.label}</span>
                  </div>
                  <Eye className="w-4 h-4 text-white/20 flex-shrink-0" />
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* ===== ERGEBNISSE (nach Simulation) ===== */}
      {gwStatus === 'simulated' && joinedEvents.length > 0 && (
        <section>
          <h2 className="text-[11px] font-black uppercase tracking-wider text-white/40 mb-2">
            Ergebnisse
          </h2>
          <div className="space-y-2">
            {joinedEvents.filter(e => e.scoredAt).map(event => {
              const lineupStatus = lineupStatuses.get(event.id);
              const rank = lineupStatus?.rank ?? event.userRank;
              const score = lineupStatus?.score ?? event.userPoints;
              const medalEmoji = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '';

              return (
                <button
                  key={event.id}
                  onClick={() => onEventClick(event)}
                  className="w-full flex items-center gap-3 p-3 bg-white/[0.03] border border-white/10 rounded-xl hover:bg-white/[0.06] transition-all text-left"
                >
                  <div className="w-9 h-9 rounded-xl bg-[#FFD700]/10 flex items-center justify-center">
                    <span className="text-sm font-bold">{medalEmoji || `#${rank ?? '-'}`}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate">{event.name}</div>
                    <div className="text-[11px] text-white/40">
                      Platz {rank ?? '-'} / {event.participants} — {score ?? 0} Punkte
                    </div>
                  </div>
                  {event.userReward && event.userReward > 0 && (
                    <span className="text-xs font-bold text-[#FFD700]">+{(event.userReward / 100).toFixed(0)} BSD</span>
                  )}
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* ===== TOP SCORER ===== */}
      {simulatedCount === fixtures.length && fixtures.length > 0 && (
        <TopScorersSection gameweek={gameweek} />
      )}

      {/* ===== EMPTY STATES ===== */}
      {gwEvents.length === 0 && !fixturesLoading && fixtures.length === 0 && (
        <Card className="p-12 text-center">
          <Trophy className="w-12 h-12 mx-auto mb-4 text-white/20" />
          <div className="text-white/50 mb-1">Keine Aktivität für Spieltag {gameweek}</div>
          <div className="text-white/30 text-xs">Events und Fixtures sind für diesen Spieltag noch nicht eingerichtet.</div>
        </Card>
      )}

      {gwEvents.length === 0 && !fixturesLoading && fixtures.length > 0 && (
        <Card className="p-8 text-center">
          <div className="text-white/50 mb-1">Noch keine Events für Spieltag {gameweek}</div>
          <div className="text-white/30 text-xs">{fixtures.length} Paarungen vorhanden — Events werden vom Admin erstellt.</div>
        </Card>
      )}

      {/* ===== FIXTURE DETAIL MODAL ===== */}
      <FixtureDetailModal
        fixture={selectedFixture}
        isOpen={!!selectedFixture}
        onClose={() => setSelectedFixture(null)}
      />
    </div>
  );
}
