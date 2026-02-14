'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  ChevronLeft, ChevronRight, Trophy, Clock, Loader2, Play, ArrowRight,
  CheckCircle2, AlertTriangle, Eye, Star,
} from 'lucide-react';
import { Card } from '@/components/ui';
import { getClub } from '@/lib/clubs';
import { getFixturesByGameweek, getGameweekTopScorers } from '@/lib/services/fixtures';
import { getLineup } from '@/lib/services/lineups';
import { simulateGameweekFlow } from '@/lib/services/scoring';
import type { Fixture, FixturePlayerStat } from '@/types';
import type { FantasyEvent, UserDpcHolding } from './types';
import { getStatusStyle } from './helpers';
import { EventCard } from './EventCard';

// ============================================
// FixtureCard (compact, inline)
// ============================================

function FixtureCardCompact({ fixture }: { fixture: Fixture }) {
  const homeClub = getClub(fixture.home_club_short) || getClub(fixture.home_club_name);
  const awayClub = getClub(fixture.away_club_short) || getClub(fixture.away_club_name);
  const isSimulated = fixture.status === 'simulated';

  return (
    <div className="flex-shrink-0 w-[160px] p-2.5 bg-white/[0.02] border border-white/10 rounded-xl text-center">
      <div className="flex items-center justify-between gap-1 text-xs font-bold">
        <div className="flex items-center gap-1 flex-1 min-w-0">
          <div
            className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-black flex-shrink-0"
            style={{ backgroundColor: (homeClub?.colors.primary ?? '#333') + '30', color: homeClub?.colors.primary ?? '#fff' }}
          >
            {fixture.home_club_short.slice(0, 2)}
          </div>
          <span className="truncate">{fixture.home_club_short}</span>
        </div>
        <div className="px-1.5 py-0.5 bg-white/5 rounded text-[10px] font-mono">
          {isSimulated ? `${fixture.home_score}-${fixture.away_score}` : 'vs'}
        </div>
        <div className="flex items-center gap-1 flex-1 min-w-0 justify-end">
          <span className="truncate">{fixture.away_club_short}</span>
          <div
            className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-black flex-shrink-0"
            style={{ backgroundColor: (awayClub?.colors.primary ?? '#333') + '30', color: awayClub?.colors.primary ?? '#fff' }}
          >
            {fixture.away_club_short.slice(0, 2)}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Top Scorers (inline)
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
            <span className="font-mono font-bold w-8 text-right">{s.fantasy_points} Pkt</span>
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
  const [showFixtures, setShowFixtures] = useState(true);

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

  // Determine GW status
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
        // Reload fixtures to show results
        await loadFixtures(gameweek);
        onSimulated();
      }
    } catch { /* handled via toast in parent */ }
    setSimulating(false);
  };

  const handleAdvanceGW = () => {
    onGameweekChange(gameweek + 1);
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
          {/* Admin: Simulate button */}
          {isAdmin && isCurrentGw && gwStatus === 'open' && gwEvents.length > 0 && (
            <button
              onClick={handleSimulate}
              disabled={simulating}
              className="flex items-center gap-1.5 px-3 py-2 bg-[#FFD700]/10 border border-[#FFD700]/30 rounded-xl text-sm font-bold text-[#FFD700] hover:bg-[#FFD700]/20 disabled:opacity-50 transition-all"
            >
              {simulating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">{simulating ? 'Simuliere...' : 'Simulieren'}</span>
            </button>
          )}
          {/* Admin: Next GW button (after simulation) */}
          {isAdmin && gwStatus === 'simulated' && isCurrentGw && (
            <button
              onClick={handleAdvanceGW}
              className="flex items-center gap-1.5 px-3 py-2 bg-[#22C55E]/10 border border-[#22C55E]/30 rounded-xl text-sm font-bold text-[#22C55E] hover:bg-[#22C55E]/20 transition-all"
            >
              <ArrowRight className="w-4 h-4" />
              <span className="hidden sm:inline">Nächster →</span>
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

      {/* ===== PAARUNGEN (collapsible) ===== */}
      {fixtures.length > 0 && (
        <section>
          <button
            onClick={() => setShowFixtures(prev => !prev)}
            className="flex items-center gap-2 mb-2 group"
          >
            <h2 className="text-[11px] font-black uppercase tracking-wider text-white/40">
              Paarungen ({fixtures.length})
            </h2>
            <span className="text-[10px] text-white/20 group-hover:text-white/40 transition-colors">
              {showFixtures ? '▾' : '▸'}
            </span>
          </button>
          {showFixtures && (
            fixturesLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-5 h-5 animate-spin text-white/30" />
              </div>
            ) : (
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 lg:mx-0 lg:px-0">
                {fixtures.map(f => <FixtureCardCompact key={f.id} fixture={f} />)}
              </div>
            )
          )}
        </section>
      )}

      {fixturesLoading && fixtures.length === 0 && (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="w-5 h-5 animate-spin text-white/30" />
        </div>
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
                  {/* Status icon */}
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

                  {/* Event info */}
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

                  {/* Status badge */}
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

      {/* ===== EMPTY STATE ===== */}
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
    </div>
  );
}
