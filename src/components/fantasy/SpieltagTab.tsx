'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Trophy, Loader2, Star, Calendar, Play, ArrowRight, ChevronDown, Globe,
} from 'lucide-react';
import { Card, Modal } from '@/components/ui';
import { useTranslations } from 'next-intl';
import { getClub } from '@/lib/clubs';
import { getFixturesByGameweek, getFixturePlayerStats } from '@/lib/services/fixtures';
import { simulateGameweekFlow, importProgressiveStats, finalizeGameweek } from '@/lib/services/scoring';
import { isApiConfigured, hasApiFixtures } from '@/lib/services/footballData';
import type { Fixture, FixturePlayerStat } from '@/types';
import type { FantasyEvent } from './types';
import dynamic from 'next/dynamic';
const SponsorBanner = dynamic(() => import('@/components/player/detail/SponsorBanner'), { ssr: false });
import { SectionHeader } from '@/components/home/helpers';
import {
  ClubLogo, TopspielCard, pickTopspiel,
  FixtureCard,
  posColor, scoreBadgeColor, getPosAccent,
} from './spieltag';

// Available leagues — will grow as we add more
const LEAGUES = [
  { id: 'tff1', label: 'TFF 1. Lig', country: 'TR', flag: '\uD83C\uDDF9\uD83C\uDDF7' },
] as const;
type LeagueId = typeof LEAGUES[number]['id'];

// ============================================
// Unchanged internals (Formation Pitch View)
// ============================================

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

function PlayerNode({ stat }: { stat: FixturePlayerStat }) {
  const rating = stat.rating ?? stat.fantasy_points / 10;
  const accent = getPosAccent(stat.player_position);
  const badge = scoreBadgeColor(rating);

  return (
    <div className="flex flex-col items-center relative w-[52px] md:w-[60px] lg:w-[72px]">
      <div className={`absolute -top-1 -right-0.5 md:-top-1.5 md:-right-2 z-20 min-w-[1.4rem] md:min-w-[1.6rem] px-1 py-0.5 rounded-full text-[9px] md:text-[9px] font-mono font-black text-center shadow-lg ${badge}`}>
        {rating.toFixed(1)}
      </div>
      <div
        className="w-8 h-8 md:w-10 md:h-10 lg:w-12 lg:h-12 rounded-full flex items-center justify-center border-2 bg-black/30"
        style={{ borderColor: accent, boxShadow: `0 0 10px ${accent}25` }}
      >
        <span className="font-bold text-[9px] md:text-[10px] lg:text-xs" style={{ color: accent }}>
          {stat.player_last_name.slice(0, 2).toUpperCase()}
        </span>
      </div>
      <div className="text-[9px] md:text-[9px] lg:text-[10px] mt-0.5 font-medium text-center truncate max-w-full text-white/70">
        {stat.player_last_name}
      </div>
      <div className="hidden md:flex items-center justify-center gap-0.5 text-[9px] text-white/30">
        <span>{stat.minutes_played}&apos;</span>
        {stat.goals > 0 && <span className="text-gold">{stat.goals}G</span>}
        {stat.assists > 0 && <span className="text-sky-400">{stat.assists}A</span>}
        {stat.yellow_card && <span className="w-1.5 h-2 bg-yellow-400 rounded-[0.5px] inline-block" />}
        {stat.red_card && <span className="w-1.5 h-2 bg-red-500 rounded-[0.5px] inline-block" />}
        {stat.clean_sheet && <span className="text-emerald-400">CS</span>}
        {stat.bonus > 0 && <span className="text-gold">{stat.bonus}</span>}
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
  const grouped = new Map<string, FixturePlayerStat[]>();
  for (const s of stats) {
    const pos = s.player_position || 'MID';
    const existing = grouped.get(pos) || [];
    existing.push(s);
    grouped.set(pos, existing);
  }

  const order = isHome
    ? (pos: string) => { switch (pos) { case 'GK': return 0; case 'DEF': return 1; case 'MID': return 2; case 'ATT': return 3; default: return 4; } }
    : (pos: string) => { switch (pos) { case 'ATT': return 0; case 'MID': return 1; case 'DEF': return 2; case 'GK': return 3; default: return 4; } };

  const rows = Array.from(grouped.entries())
    .sort((a, b) => order(a[0]) - order(b[0]))
    .map(([, players]) => players.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)));

  return (
    <div className="flex flex-col gap-3 py-2">
      <div className="flex items-center justify-center gap-2">
        <ClubLogo club={logo} size={20} />
        <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color }}>
          {teamName}
        </span>
        <span className="text-[9px] text-white/30 font-mono">({formation})</span>
      </div>
      {rows.map((players, rowIdx) => (
        <div key={rowIdx} className="flex items-center justify-center gap-1 md:gap-2 lg:gap-4">
          {players.map(s => <PlayerNode key={s.id} stat={s} />)}
        </div>
      ))}
    </div>
  );
}

// ============================================
// Fixture Detail Modal (unchanged)
// ============================================

function FixtureDetailModal({ fixture, isOpen, onClose, sponsorName, sponsorLogo }: { fixture: Fixture | null; isOpen: boolean; onClose: () => void; sponsorName?: string; sponsorLogo?: string }) {
  const ts = useTranslations('spieltag');
  const tsp = useTranslations('sponsor');
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
  const isSimulated = fixture.status === 'simulated' || fixture.status === 'finished';
  const homeColor = homeClub?.colors.primary ?? '#22C55E';
  const awayColor = awayClub?.colors.primary ?? '#3B82F6';

  return (
    <Modal open={isOpen} title="" onClose={onClose}>
      <div className="max-h-[80vh] overflow-y-auto">
        {/* Score Header */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0" style={{
            background: `linear-gradient(135deg, ${homeColor}15 0%, transparent 50%, ${awayColor}15 100%)`,
          }} />
          <div className="relative flex items-center justify-center gap-4 md:gap-8 py-6 px-4">
            <div className="flex flex-col items-center gap-1.5">
              <ClubLogo club={homeClub} size={52} short={fixture.home_club_short} />
              <span className="font-bold text-sm md:text-base">{fixture.home_club_name}</span>
            </div>
            <div className="text-center">
              <div className="font-mono font-black text-3xl md:text-4xl">
                {isSimulated ? `${fixture.home_score} - ${fixture.away_score}` : 'vs'}
              </div>
              {isSimulated && (
                <div className="text-[10px] text-white/30 mt-1">Spieltag {fixture.gameweek}</div>
              )}
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <ClubLogo club={awayClub} size={52} short={fixture.away_club_short} />
              <span className="font-bold text-sm md:text-base">{fixture.away_club_name}</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        {stats.length > 0 && (
          <div className="flex items-center justify-center gap-6 border-b border-white/[0.06] px-4">
            {(['formation', 'players'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setDetailTab(tab)}
                className={`py-3 text-sm font-semibold border-b-2 transition-colors ${
                  detailTab === tab
                    ? 'text-white border-white'
                    : 'text-white/40 border-transparent hover:text-white/60'
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
            <div className="rounded-xl overflow-hidden border border-green-500/20">
              {/* Sponsor Banner Top */}
              {(() => {
                const sponsor = sponsorName ? { sponsorName, sponsorLogo } : null;
                return (
                  <div className="bg-gradient-to-r from-[#1a1a2e] via-[#16213e] to-[#1a1a2e] px-4 py-2 flex items-center justify-center gap-3 border-b border-white/10">
                    {sponsor?.sponsorLogo ? (
                      <img src={sponsor.sponsorLogo} alt="" className="h-4 w-auto object-contain" />
                    ) : (
                      <Star aria-hidden="true" className="size-3 text-gold" />
                    )}
                    <span className="text-xs font-bold text-white/50 uppercase">{sponsor?.sponsorName || tsp('sponsorPlaceholder')}</span>
                    {sponsor?.sponsorLogo ? (
                      <img src={sponsor.sponsorLogo} alt="" className="h-4 w-auto object-contain" />
                    ) : (
                      <Star aria-hidden="true" className="size-3 text-gold" />
                    )}
                  </div>
                );
              })()}

              {/* Green Pitch */}
              <div className="relative bg-gradient-to-b from-[#1a5c1a]/40 via-[#1e6b1e]/30 to-[#1a5c1a]/40 px-3 md:px-6 py-4">
                <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none" viewBox="0 0 400 600">
                  <rect x="20" y="10" width="360" height="580" fill="none" stroke="white" strokeOpacity="0.1" strokeWidth="1.5" />
                  <line x1="20" y1="300" x2="380" y2="300" stroke="white" strokeOpacity="0.08" strokeWidth="1" />
                  <circle cx="200" cy="300" r="45" fill="none" stroke="white" strokeOpacity="0.08" strokeWidth="1" />
                  <circle cx="200" cy="300" r="3" fill="white" fillOpacity="0.1" />
                  <rect x="110" y="10" width="180" height="70" fill="none" stroke="white" strokeOpacity="0.08" strokeWidth="1" />
                  <rect x="145" y="10" width="110" height="30" fill="none" stroke="white" strokeOpacity="0.06" strokeWidth="1" />
                  <rect x="110" y="520" width="180" height="70" fill="none" stroke="white" strokeOpacity="0.08" strokeWidth="1" />
                  <rect x="145" y="560" width="110" height="30" fill="none" stroke="white" strokeOpacity="0.06" strokeWidth="1" />
                  {[0, 1, 2, 3, 4, 5].map(i => (
                    <rect key={i} x="20" y={10 + i * 96.67} width="360" height="48.33" fill="white" fillOpacity="0.015" />
                  ))}
                </svg>

                {/* Center circle sponsor */}
                {(() => {
                  const sponsor = sponsorName ? { sponsorName, sponsorLogo } : null;
                  return (
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                      <div className="size-16 rounded-full border border-white/[0.06] flex items-center justify-center">
                        {sponsor?.sponsorLogo ? (
                          <img src={sponsor.sponsorLogo} alt="" className="size-10 object-contain opacity-30" />
                        ) : (
                          <span className="text-[9px] text-white/15 font-bold tracking-wider uppercase">Sponsor</span>
                        )}
                      </div>
                    </div>
                  );
                })()}

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
                      {allBench.length > 0 && (
                        <div className="relative z-10 mt-3 pt-3 border-t border-white/[0.06]">
                          <div className="text-[9px] font-bold text-white/25 uppercase tracking-wider text-center mb-2">{ts('substitutions')}</div>
                          <div className="flex gap-1.5 flex-wrap justify-center">
                            {allBench.map(s => (
                              <div key={s.id} className="flex items-center gap-1 px-2 py-1 bg-black/20 rounded-lg text-[9px] border border-white/[0.06]">
                                <span className={`px-1 py-0.5 rounded text-[9px] font-bold ${posColor(s.player_position)}`}>
                                  {s.player_position}
                                </span>
                                <span className="text-white/50">{s.player_last_name}</span>
                                <span className="text-white/25 font-mono">{s.minutes_played}&apos;</span>
                                <span className={`px-1 py-0.5 rounded text-[9px] font-bold tabular-nums ${scoreBadgeColor(s.rating ?? s.fantasy_points / 10)}`}>
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
                  <div className="bg-gradient-to-r from-[#1a1a2e] via-[#0f3460] to-[#1a1a2e] px-3 py-2 flex items-center justify-between border-t border-white/10">
                    <div className="flex items-center gap-2 px-3 py-1 bg-white/[0.04] rounded-lg border border-white/[0.06]">
                      {sponsor?.sponsorLogo && <img src={sponsor.sponsorLogo} alt="" className="h-3.5 w-auto object-contain" />}
                      <span className="text-[9px] text-white/30 font-medium">{sponsor?.sponsorName || 'Sponsor Logo'}</span>
                    </div>
                    <span className="text-[9px] text-white/20 font-bold uppercase">{sponsor?.sponsorName ? `${sponsor.sponsorName} × BeScout` : 'Powered by BeScout'}</span>
                    <div className="flex items-center gap-2 px-3 py-1 bg-white/[0.04] rounded-lg border border-white/[0.06]">
                      {sponsor?.sponsorLogo && <img src={sponsor.sponsorLogo} alt="" className="h-3.5 w-auto object-contain" />}
                      <span className="text-[9px] text-white/30 font-medium">{sponsor?.sponsorName || 'Sponsor Logo'}</span>
                    </div>
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

function TeamStatsList({ label, stats, color }: { label: string; stats: FixturePlayerStat[]; color: string }) {
  const sorted = [...stats].sort((a, b) => {
    if (a.minutes_played >= 60 && b.minutes_played < 60) return -1;
    if (a.minutes_played < 60 && b.minutes_played >= 60) return 1;
    return (b.rating ?? 0) - (a.rating ?? 0);
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
            {s.goals > 0 && <span className="text-gold font-bold">{s.goals}G</span>}
            {s.assists > 0 && <span className="text-sky-400 font-bold">{s.assists}A</span>}
            {s.clean_sheet && <span className="text-emerald-400 text-[10px]">CS</span>}
            {s.yellow_card && <span className="w-2.5 h-3 bg-yellow-400 rounded-[1px] inline-block" />}
            {s.red_card && <span className="w-2.5 h-3 bg-red-500 rounded-[1px] inline-block" />}
            {s.bonus > 0 && (
              <span className="flex items-center gap-0.5 text-gold">
                <Star aria-hidden="true" className="size-2.5" />{s.bonus}
              </span>
            )}
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-black tabular-nums ${scoreBadgeColor(s.rating ?? s.fantasy_points / 10)}`}>
              {(s.rating ?? s.fantasy_points / 10).toFixed(1)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================
// SpieltagTab (Main — new render order)
// ============================================

type SpieltagTabProps = {
  gameweek: number;
  activeGameweek: number;
  clubId: string;
  isAdmin: boolean;
  events: FantasyEvent[];
  userId: string;
  onSimulated: () => void;
};

export function SpieltagTab({
  gameweek, activeGameweek, clubId, isAdmin, events, userId,
  onSimulated,
}: SpieltagTabProps) {
  const ts = useTranslations('spieltag');
  const tc = useTranslations('common');
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [fixturesLoading, setFixturesLoading] = useState(true);
  const [simulating, setSimulating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showFinalizeConfirm, setShowFinalizeConfirm] = useState(false);
  const [selectedFixture, setSelectedFixture] = useState<Fixture | null>(null);
  const [apiAvailable, setApiAvailable] = useState(false);
  const [selectedLeague, setSelectedLeague] = useState<LeagueId>('tff1');

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

  // Check if API import is available for this gameweek
  useEffect(() => {
    if (!isAdmin || !isApiConfigured()) {
      setApiAvailable(false);
      return;
    }
    let cancelled = false;
    hasApiFixtures(gameweek).then(avail => {
      if (!cancelled) setApiAvailable(avail);
    }).catch(() => {
      if (!cancelled) setApiAvailable(false);
    });
    return () => { cancelled = true; };
  }, [gameweek, isAdmin]);

  // Derived state
  const simulatedCount = fixtures.filter(f => f.status === 'simulated' || f.status === 'finished').length;
  const finishedCount = fixtures.filter(f => f.status === 'finished').length;
  const allFixturesFinished = finishedCount === fixtures.length && fixtures.length > 0;
  const gwEvents = events;
  const allEnded = gwEvents.length > 0 && gwEvents.every(e => e.status === 'ended' || e.scoredAt);
  const isCurrentGw = gameweek === activeGameweek;
  const isPast = gameweek < activeGameweek;
  const allSimulated = simulatedCount === fixtures.length && fixtures.length > 0;

  const gwStatus: 'open' | 'simulated' | 'empty' =
    allEnded && allSimulated ? 'simulated'
    : gwEvents.length === 0 && fixtures.length === 0 ? 'empty'
    : 'open';

  // Topspiel selection
  const topspiel = useMemo(() => pickTopspiel(fixtures, clubId), [fixtures, clubId]);
  const otherFixtures = useMemo(() => {
    if (!topspiel) return fixtures;
    return fixtures.filter(f => f.id !== topspiel.id);
  }, [fixtures, topspiel]);

  const handleImport = async () => {
    if (!isAdmin || importing) return;
    setImporting(true);
    setImportResult(null);
    try {
      const result = await importProgressiveStats(clubId, gameweek, userId);
      if (result.fixturesImported > 0 || result.scoresSynced > 0) {
        await loadFixtures(gameweek);
      }
      setImportResult(ts('importResult', { fixtures: result.fixturesImported, scores: result.scoresSynced }));
      if (result.errors.length > 0) {
        console.warn('[Spieltag] Import warnings:', result.errors);
      }
    } catch (e) {
      setImportResult(ts('importError', { message: e instanceof Error ? e.message : 'Unknown' }));
    }
    setImporting(false);
  };

  const handleFinalize = async () => {
    if (!isAdmin || simulating) return;
    setShowFinalizeConfirm(false);
    setSimulating(true);
    try {
      const result = await finalizeGameweek(clubId, gameweek, userId);
      if (result.eventsScored > 0) {
        await loadFixtures(gameweek);
        onSimulated();
      }
      if (result.errors.length > 0) {
        console.warn('[Spieltag] Finalize warnings:', result.errors);
      }
    } catch { /* handled via toast in parent */ }
    setSimulating(false);
  };

  // Legacy: full flow (fallback for non-API mode)
  const handleSimulate = async () => {
    if (!isAdmin || simulating) return;
    setShowConfirm(false);
    setSimulating(true);
    try {
      const result = await simulateGameweekFlow(clubId, gameweek, userId);
      if (result.eventsScored > 0 || result.fixturesSimulated > 0) {
        await loadFixtures(gameweek);
        onSimulated();
      }
      if (result.errors.length > 0) {
        console.warn('[Spieltag] Simulation warnings:', result.errors);
      }
    } catch { /* handled via toast in parent */ }
    setSimulating(false);
  };

  const activeLeague = LEAGUES.find(l => l.id === selectedLeague) ?? LEAGUES[0];

  return (
    <div className="space-y-5">
      {/* 1. LEAGUE FILTER + ADMIN ACTIONS */}
      <div className="flex items-center justify-between gap-2">
        {/* League selector */}
        <div className="relative">
          <button className="flex items-center gap-2 px-3 py-2 min-h-[40px] bg-white/[0.04] border border-white/[0.08] rounded-xl text-sm font-semibold hover:bg-white/[0.06] transition-colors">
            <span>{activeLeague.flag}</span>
            <span>{activeLeague.label}</span>
            {LEAGUES.length > 1 && <ChevronDown aria-hidden="true" className="size-3.5 text-white/30" />}
          </button>
        </div>

        {/* Admin */}
        <div className="flex items-center gap-2">
          {/* Import Button (sky, repeatable) — available when API is configured */}
          {isAdmin && isCurrentGw && apiAvailable && gwEvents.length > 0 && !allEnded && (
            <button
              onClick={handleImport}
              disabled={importing}
              className="flex items-center gap-1.5 px-3 py-2 min-h-[40px] bg-sky-500/10 border border-sky-500/30 rounded-xl text-xs font-bold text-sky-400 hover:bg-sky-500/20 disabled:opacity-50 transition-colors"
            >
              {importing ? <Loader2 aria-hidden="true" className="size-3.5 animate-spin motion-reduce:animate-none" /> : <ArrowRight aria-hidden="true" className="size-3.5" />}
              Import ({finishedCount}/{fixtures.length})
            </button>
          )}
          {/* Auswerten Button (gold, once at end) — available when all fixtures finished */}
          {isAdmin && isCurrentGw && allFixturesFinished && !allEnded && gwEvents.length > 0 && (
            <button
              onClick={() => setShowFinalizeConfirm(true)}
              disabled={simulating}
              className="flex items-center gap-1.5 px-3 py-2 min-h-[40px] bg-gold/10 border border-gold/30 rounded-xl text-xs font-bold text-gold hover:bg-gold/20 disabled:opacity-50 transition-colors"
            >
              {simulating ? <Loader2 aria-hidden="true" className="size-3.5 animate-spin motion-reduce:animate-none" /> : <Trophy aria-hidden="true" className="size-3.5" />}
              Auswerten
            </button>
          )}
          {/* Fallback: Starten Button (non-API mode, legacy behavior) */}
          {isAdmin && isCurrentGw && !apiAvailable && gwStatus === 'open' && gwEvents.length > 0 && (
            <button
              onClick={() => setShowConfirm(true)}
              disabled={simulating}
              className="flex items-center gap-1.5 px-3 py-2 min-h-[40px] bg-gold/10 border border-gold/30 rounded-xl text-xs font-bold text-gold hover:bg-gold/20 disabled:opacity-50 transition-colors"
            >
              {simulating ? <Loader2 aria-hidden="true" className="size-3.5 animate-spin motion-reduce:animate-none" /> : <Play aria-hidden="true" className="size-3.5" />}
              {ts('startSimulation')}
            </button>
          )}
          {isAdmin && gwStatus === 'simulated' && isCurrentGw && (
            <span className="text-[10px] text-green-500 font-bold px-2 py-1 bg-green-500/10 rounded-lg">{ts('gwSimulatedLabel')}</span>
          )}
        </div>
      </div>

      {/* Import Result Toast */}
      {importResult && (
        <div className="flex items-center justify-between p-3 bg-sky-500/10 border border-sky-500/20 rounded-xl">
          <span className="text-xs text-sky-300 font-medium">{importResult}</span>
          <button onClick={() => setImportResult(null)} className="text-xs text-white/40 hover:text-white/60 transition-colors" aria-label={tc('closeLabel')}>✕</button>
        </div>
      )}

      {/* 2. SPONSOR BANNER */}
      <SponsorBanner placement="fantasy_spieltag" />

      {/* 3. TOPSPIEL CARD — Hero Match */}
      {topspiel && !fixturesLoading && (
        <TopspielCard
          fixture={topspiel}
          userClubId={clubId}
          onSelect={(f) => setSelectedFixture(f)}
        />
      )}

      {/* 4. PAARUNGEN — FixtureCards (without Topspiel) */}
      {otherFixtures.length > 0 && !fixturesLoading && (
        <section>
          <SectionHeader
            title={ts('fixtures')}
            badge={<span className="text-[10px] text-white/25 font-medium">{otherFixtures.length} {ts('fixturesShort')}</span>}
          />
          <div className="space-y-2 mt-3">
            {otherFixtures.map(f => (
              <FixtureCard
                key={f.id}
                fixture={f}
                onSelect={() => setSelectedFixture(f)}
              />
            ))}
          </div>
        </section>
      )}

      {fixturesLoading && (
        <Card className="p-8 flex items-center justify-center">
          <Loader2 aria-hidden="true" className="size-5 animate-spin motion-reduce:animate-none text-white/30" />
        </Card>
      )}

      {/* 6. EMPTY STATE */}
      {!fixturesLoading && fixtures.length === 0 && (
        <Card className="p-12 text-center">
          <Calendar aria-hidden="true" className="size-12 mx-auto mb-4 text-white/20" />
          <div className="text-white/50 mb-1">{ts('noActivity', { gw: gameweek })}</div>
          <div className="text-white/30 text-xs">{ts('noActivityDesc')}</div>
        </Card>
      )}

      {/* 11. MODALS — unchanged */}
      {/* Legacy Starten Modal (non-API simulation mode) */}
      <Modal open={showConfirm} title={ts('startGameweekBtn')} onClose={() => setShowConfirm(false)}>
        <div className="space-y-4 p-2">
          <p className="text-sm text-white/70">
            {ts('finalizeDesc', { gw: gameweek })}
          </p>
          <ul className="space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <span className="text-sky-400 mt-0.5">1.</span>
              <span>{fixtures.length} Fixtures</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-gold mt-0.5">2.</span>
              <span>{ts('finalizeStep1Simple')}</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">3.</span>
              <span>{ts('finalizeStep2', { nextGw: gameweek + 1 })}</span>
            </li>
          </ul>
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={() => setShowConfirm(false)}
              className="flex-1 px-4 py-2.5 min-h-[44px] bg-white/5 border border-white/10 rounded-xl text-sm font-semibold hover:bg-white/10 transition-colors"
            >
              {ts('cancelBtn')}
            </button>
            <button
              onClick={handleSimulate}
              className="flex-1 px-4 py-2.5 min-h-[44px] bg-gold/10 border border-gold/30 rounded-xl text-sm font-bold text-gold hover:bg-gold/20 transition-colors"
            >
              {ts('startGameweekBtn')}
            </button>
          </div>
        </div>
      </Modal>

      {/* Finalize Confirmation Modal */}
      <Modal open={showFinalizeConfirm} title={ts('finalizeTitle')} onClose={() => setShowFinalizeConfirm(false)}>
        <div className="space-y-4 p-2">
          <p className="text-sm text-white/70">
            {ts('finalizeDesc', { gw: gameweek })}
          </p>
          <ul className="space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <span className="text-gold mt-0.5">1.</span>
              <span>{ts('finalizeStep1')}</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">2.</span>
              <span>{ts('finalizeStep2', { nextGw: gameweek + 1 })}</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-sky-400 mt-0.5">3.</span>
              <span>{ts('finalizeStep3', { nextGw: gameweek + 1 })}</span>
            </li>
          </ul>
          <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
            {ts('finalizeWarning')}
          </div>
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={() => setShowFinalizeConfirm(false)}
              className="flex-1 px-4 py-2.5 min-h-[44px] bg-white/5 border border-white/10 rounded-xl text-sm font-semibold hover:bg-white/10 transition-colors"
            >
              {ts('cancelBtn')}
            </button>
            <button
              onClick={handleFinalize}
              className="flex-1 px-4 py-2.5 min-h-[44px] bg-gold/10 border border-gold/30 rounded-xl text-sm font-bold text-gold hover:bg-gold/20 transition-colors"
            >
              {ts('finalizeNowBtn')}
            </button>
          </div>
        </div>
      </Modal>

      <FixtureDetailModal
        fixture={selectedFixture}
        isOpen={!!selectedFixture}
        onClose={() => setSelectedFixture(null)}
        sponsorName={events.find(e => e.sponsorName)?.sponsorName}
        sponsorLogo={events.find(e => e.sponsorLogo)?.sponsorLogo}
      />
    </div>
  );
}
