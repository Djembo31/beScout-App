'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Trophy, Clock, Eye, X, Shirt, Star, Loader2 } from 'lucide-react';
import { Card, Modal } from '@/components/ui';
import { getClub } from '@/lib/clubs';
import { getFixturesByGameweek, getFixturePlayerStats } from '@/lib/services/fixtures';
import type { Fixture, FixturePlayerStat } from '@/types';

// ============================================
// Position color helpers (matches design system)
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

// ============================================
// FixtureCard
// ============================================

function FixtureCard({ fixture, onSelect }: { fixture: Fixture; onSelect: () => void }) {
  const homeClub = getClub(fixture.home_club_short) || getClub(fixture.home_club_name);
  const awayClub = getClub(fixture.away_club_short) || getClub(fixture.away_club_name);
  const isSimulated = fixture.status === 'simulated';

  return (
    <button
      onClick={onSelect}
      className="w-full p-3 md:p-4 bg-white/[0.02] border border-white/10 rounded-2xl hover:bg-white/[0.05] hover:border-white/15 transition-all text-left group"
    >
      <div className="flex items-center gap-3">
        {/* Home team */}
        <div className="flex-1 flex items-center gap-2 justify-end min-w-0">
          <span className="font-bold text-sm truncate">{fixture.home_club_short}</span>
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0"
            style={{ backgroundColor: (homeClub?.colors.primary ?? fixture.home_club_primary_color ?? '#333') + '30', color: homeClub?.colors.primary ?? fixture.home_club_primary_color ?? '#fff' }}
          >
            {fixture.home_club_short.slice(0, 2)}
          </div>
        </div>

        {/* Score */}
        <div className="flex items-center gap-2 px-2">
          {isSimulated ? (
            <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5">
              <span className="font-mono font-black text-lg">{fixture.home_score}</span>
              <span className="text-white/20">-</span>
              <span className="font-mono font-black text-lg">{fixture.away_score}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5">
              <span className="text-white/30 text-sm font-bold">vs</span>
            </div>
          )}
        </div>

        {/* Away team */}
        <div className="flex-1 flex items-center gap-2 min-w-0">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0"
            style={{ backgroundColor: (awayClub?.colors.primary ?? fixture.away_club_primary_color ?? '#333') + '30', color: awayClub?.colors.primary ?? fixture.away_club_primary_color ?? '#fff' }}
          >
            {fixture.away_club_short.slice(0, 2)}
          </div>
          <span className="font-bold text-sm truncate">{fixture.away_club_short}</span>
        </div>
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between mt-2 text-[10px]">
        <span className={isSimulated ? 'text-[#22C55E] font-bold' : 'text-white/30'}>
          {isSimulated ? 'Simuliert' : 'Geplant'}
        </span>
        <span className="text-white/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
          <Eye className="w-3 h-3" /> Details
        </span>
      </div>
    </button>
  );
}

// ============================================
// FixtureDetailModal
// ============================================

function FixtureDetailModal({ fixture, isOpen, onClose }: { fixture: Fixture | null; isOpen: boolean; onClose: () => void }) {
  const [stats, setStats] = useState<FixturePlayerStat[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!fixture || !isOpen) return;
    let cancelled = false;
    setLoading(true);
    getFixturePlayerStats(fixture.id).then(data => {
      if (!cancelled) {
        setStats(data);
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

  return (
    <Modal open={isOpen} title={`${fixture.home_club_short} vs ${fixture.away_club_short}`} onClose={onClose}>
      <div className="p-4 md:p-6 space-y-5 max-h-[75vh] overflow-y-auto">
        {/* Score Header */}
        <div className="flex items-center justify-center gap-4">
          <div className="flex items-center gap-2">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-black"
              style={{ backgroundColor: (homeClub?.colors.primary ?? '#333') + '30', color: homeClub?.colors.primary ?? '#fff' }}
            >
              {fixture.home_club_short.slice(0, 2)}
            </div>
            <span className="font-bold">{fixture.home_club_name}</span>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-2">
            <span className="font-mono font-black text-2xl">
              {fixture.home_score ?? '-'} - {fixture.away_score ?? '-'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold">{fixture.away_club_name}</span>
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-black"
              style={{ backgroundColor: (awayClub?.colors.primary ?? '#333') + '30', color: awayClub?.colors.primary ?? '#fff' }}
            >
              {fixture.away_club_short.slice(0, 2)}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-[#FFD700]" />
          </div>
        ) : stats.length === 0 ? (
          <div className="text-center text-white/30 py-8">Keine Spielerdaten verfügbar</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Home Team Stats */}
            <TeamStats label={fixture.home_club_name} stats={homeStats} color={homeClub?.colors.primary ?? '#22C55E'} />
            {/* Away Team Stats */}
            <TeamStats label={fixture.away_club_name} stats={awayStats} color={awayClub?.colors.primary ?? '#3B82F6'} />
          </div>
        )}
      </div>
    </Modal>
  );
}

function TeamStats({ label, stats, color }: { label: string; stats: FixturePlayerStat[]; color: string }) {
  // Sort: starters first (90 min), then subs, by fantasy points desc
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
            <span className="font-mono font-bold text-white/80 w-6 text-right">{s.fantasy_points}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================
// GameweekTab (Main)
// ============================================

export function GameweekTab() {
  const [gameweek, setGameweek] = useState(1);
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFixture, setSelectedFixture] = useState<Fixture | null>(null);

  const loadGameweek = useCallback(async (gw: number) => {
    setLoading(true);
    try {
      const data = await getFixturesByGameweek(gw);
      setFixtures(data);
    } catch {
      setFixtures([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadGameweek(gameweek);
  }, [gameweek, loadGameweek]);

  const simulatedCount = fixtures.filter(f => f.status === 'simulated').length;
  const totalGoals = fixtures.reduce((s, f) => s + (f.home_score ?? 0) + (f.away_score ?? 0), 0);

  return (
    <div className="space-y-4">
      {/* Gameweek Selector */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setGameweek(gw => Math.max(1, gw - 1))}
          disabled={gameweek <= 1}
          className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 disabled:opacity-30 transition-all"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="text-center">
          <div className="text-xl font-black">Spieltag {gameweek}</div>
          <div className="text-xs text-white/40">
            {simulatedCount === 10 ? (
              <span className="text-[#22C55E]">{totalGoals} Tore • Alle Spiele simuliert</span>
            ) : simulatedCount > 0 ? (
              <span>{simulatedCount}/10 simuliert</span>
            ) : (
              <span className="flex items-center gap-1 justify-center"><Clock className="w-3 h-3" /> Noch nicht simuliert</span>
            )}
          </div>
        </div>

        <button
          onClick={() => setGameweek(gw => Math.min(38, gw + 1))}
          disabled={gameweek >= 38}
          className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 disabled:opacity-30 transition-all"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Quick GW jumper */}
      <div className="flex gap-1 overflow-x-auto scrollbar-hide pb-1 -mx-4 px-4 lg:mx-0 lg:px-0">
        {Array.from({ length: 38 }, (_, i) => i + 1).map(gw => (
          <button
            key={gw}
            onClick={() => setGameweek(gw)}
            className={`flex-shrink-0 w-9 h-9 rounded-lg text-xs font-bold transition-all ${
              gw === gameweek
                ? 'bg-[#FFD700]/15 text-[#FFD700] border border-[#FFD700]/30'
                : 'bg-white/[0.03] text-white/40 border border-white/[0.06] hover:border-white/15'
            }`}
          >
            {gw}
          </button>
        ))}
      </div>

      {/* Fixtures Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <Card key={i} className="h-[85px] animate-pulse" />
          ))}
        </div>
      ) : fixtures.length === 0 ? (
        <Card className="p-12 text-center">
          <Trophy className="w-12 h-12 mx-auto mb-4 text-white/20" />
          <div className="text-white/30">Keine Spiele für Spieltag {gameweek}</div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {fixtures.map(fixture => (
            <FixtureCard
              key={fixture.id}
              fixture={fixture}
              onSelect={() => setSelectedFixture(fixture)}
            />
          ))}
        </div>
      )}

      {/* Top Scorers Summary (only if simulated) */}
      {simulatedCount === 10 && fixtures.length > 0 && (
        <TopScorersSummary gameweek={gameweek} />
      )}

      {/* Fixture Detail Modal */}
      <FixtureDetailModal
        fixture={selectedFixture}
        isOpen={!!selectedFixture}
        onClose={() => setSelectedFixture(null)}
      />
    </div>
  );
}

// ============================================
// Top Scorers Summary
// ============================================

function TopScorersSummary({ gameweek }: { gameweek: number }) {
  const [topScorers, setTopScorers] = useState<FixturePlayerStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    import('@/lib/services/fixtures').then(({ getGameweekTopScorers }) => {
      getGameweekTopScorers(gameweek, 10).then(data => {
        if (!cancelled) {
          setTopScorers(data);
          setLoading(false);
        }
      }).catch(() => { if (!cancelled) setLoading(false); });
    });
    return () => { cancelled = true; };
  }, [gameweek]);

  if (loading) return null;
  if (topScorers.length === 0) return null;

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
            <span className="font-mono font-bold w-8 text-right">{s.fantasy_points} Pkt</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
