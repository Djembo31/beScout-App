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
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-black flex-shrink-0"
          style={{ backgroundColor: (homeClub?.colors.primary ?? '#333') + '25', color: homeClub?.colors.primary ?? '#fff' }}
        >
          {fixture.home_club_short.slice(0, 3)}
        </div>
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
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-black flex-shrink-0"
          style={{ backgroundColor: (awayClub?.colors.primary ?? '#333') + '25', color: awayClub?.colors.primary ?? '#fff' }}
        >
          {fixture.away_club_short.slice(0, 3)}
        </div>
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
  const badge = scoreBadgeColor(pts);

  return (
    <div className="flex flex-col items-center gap-0.5 w-[60px] md:w-[70px]">
      {/* Score badge on top of position circle */}
      <div className="relative">
        <div className={`w-8 h-8 md:w-9 md:h-9 rounded-full flex items-center justify-center text-[10px] md:text-xs font-black ${posColor(stat.player_position)}`}>
          {stat.player_last_name.slice(0, 2).toUpperCase()}
        </div>
        <div className={`absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black ${badge}`}>
          {pts}
        </div>
        {/* Event icons */}
        {stat.goals > 0 && (
          <div className="absolute -bottom-0.5 -left-1 w-4 h-4 rounded-full bg-[#FFD700] flex items-center justify-center text-[8px] text-black font-black">
            {stat.goals > 1 ? stat.goals : '⚽'}
          </div>
        )}
        {stat.assists > 0 && (
          <div className="absolute -bottom-0.5 left-3 w-4 h-4 rounded-full bg-sky-500 flex items-center justify-center text-[8px] text-white font-black">
            A
          </div>
        )}
      </div>
      {/* Name + number */}
      <div className="text-center mt-0.5">
        <div className="text-[9px] md:text-[10px] font-semibold text-white/80 leading-tight truncate max-w-full">
          {stat.player_last_name}
        </div>
        <div className="flex items-center justify-center gap-1 text-[8px] text-white/30">
          <span>{stat.minutes_played}&apos;</span>
          {stat.yellow_card && <span className="w-1.5 h-2 bg-yellow-400 rounded-[0.5px] inline-block" />}
          {stat.red_card && <span className="w-1.5 h-2 bg-red-500 rounded-[0.5px] inline-block" />}
          {stat.clean_sheet && <span className="text-emerald-400">CS</span>}
          {stat.bonus > 0 && <span className="text-[#FFD700]">★{stat.bonus}</span>}
        </div>
      </div>
    </div>
  );
}

function FormationHalf({ stats, color, isHome }: { stats: FixturePlayerStat[]; color: string; isHome: boolean }) {
  // Group by position rows: ATT → MID → DEF → GK (top to bottom)
  const grouped = new Map<string, FixturePlayerStat[]>();
  for (const s of stats) {
    const pos = s.player_position || 'MID';
    const existing = grouped.get(pos) || [];
    existing.push(s);
    grouped.set(pos, existing);
  }

  // Sort groups by formation order
  const rows = Array.from(grouped.entries())
    .sort((a, b) => posOrder(a[0]) - posOrder(b[0]))
    .map(([, players]) => players.sort((a, b) => b.fantasy_points - a.fantasy_points));

  return (
    <div className="flex-1 flex flex-col gap-3 py-3 relative">
      {/* Team indicator */}
      <div className="absolute top-1 text-[9px] font-bold uppercase tracking-wider" style={{ color, [isHome ? 'left' : 'right']: 8 }}>
        {isHome ? 'Heim' : 'Gast'}
      </div>
      {/* Formation rows */}
      <div className="flex flex-col gap-4 mt-4">
        {rows.map((players, rowIdx) => (
          <div key={rowIdx} className="flex items-center justify-center gap-1 md:gap-2 flex-wrap">
            {players.map(s => <PlayerNode key={s.id} stat={s} />)}
          </div>
        ))}
      </div>
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
              <div
                className="w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center text-sm md:text-base font-black"
                style={{ backgroundColor: homeColor + '25', color: homeColor }}
              >
                {fixture.home_club_short.slice(0, 3)}
              </div>
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
              <div
                className="w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center text-sm md:text-base font-black"
                style={{ backgroundColor: awayColor + '25', color: awayColor }}
              >
                {fixture.away_club_short.slice(0, 3)}
              </div>
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
            /* ===== FORMATION PITCH VIEW ===== */
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden">
              {/* Pitch background */}
              <div className="relative min-h-[400px]" style={{
                background: `
                  linear-gradient(to right, ${homeColor}08 0%, transparent 50%, ${awayColor}08 100%),
                  linear-gradient(180deg, rgba(255,255,255,0.02) 0%, transparent 100%)
                `,
              }}>
                {/* Center line */}
                <div className="absolute top-0 bottom-0 left-1/2 w-px bg-white/[0.06]" />

                <div className="flex min-h-[400px]">
                  {/* Home formation */}
                  <FormationHalf stats={homeStats} color={homeColor} isHome={true} />
                  {/* Away formation */}
                  <FormationHalf stats={awayStats} color={awayColor} isHome={false} />
                </div>
              </div>

              {/* Bench sections */}
              {(homeStats.length > 11 || awayStats.length > 11) && (
                <div className="border-t border-white/[0.06] p-3">
                  <div className="text-[10px] font-bold text-white/30 uppercase tracking-wider text-center mb-2">Bank</div>
                  <div className="flex gap-1 flex-wrap justify-center">
                    {[...homeStats.slice(11), ...awayStats.slice(11)].map(s => (
                      <div key={s.id} className="flex items-center gap-1 px-2 py-1 bg-white/[0.03] rounded text-[9px]">
                        <span className={`px-1 py-0.5 rounded text-[8px] font-bold ${posColor(s.player_position)}`}>
                          {s.player_position}
                        </span>
                        <span className="text-white/50">{s.player_last_name}</span>
                        <span className={`px-1 py-0.5 rounded text-[8px] font-bold ${scoreBadgeColor(s.fantasy_points)}`}>
                          {s.fantasy_points}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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
