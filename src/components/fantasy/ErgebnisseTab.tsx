'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Trophy, BarChart3, Clock, Landmark, ChartNoAxesCombined,
} from 'lucide-react';
import { Card, Modal } from '@/components/ui';
import { useTranslations } from 'next-intl';
import { usePredictions } from '@/lib/queries/predictions';
import { useHoldings } from '@/lib/queries/holdings';
import { getGameweekTopScorers, getGameweekStatsForPlayers } from '@/lib/services/fixtures';
import type { FixturePlayerStat } from '@/types';
import type { FantasyEvent } from './types';
import { HistoryTab } from './HistoryTab';
import Image from 'next/image';
import dynamic from 'next/dynamic';

import { GwHeroSummary, VisualShowcase, PersonalResults } from './ergebnisse';

const LeaguesSection = dynamic(() => import('./LeaguesSection'), { ssr: false });

type ErgebnisseTabProps = {
  gameweek: number;
  activeGameweek: number;
  fixtureCount: number;
  events: FantasyEvent[];
  userId: string;
  // History data passed from parent
  participations: {
    eventId: string;
    eventName: string;
    gameweek: number;
    rank: number;
    totalParticipants: number;
    points: number;
    rewardCents: number;
  }[];
  userDisplayName: string;
  userFavoriteClub: string | null;
  seasonPoints: number;
  eventsPlayed: number;
  bestRank: number | null;
  totalRewardBsd: number;
  wins: number;
  top10: number;
  avgPoints: number;
  avgRank: number;
};

export function ErgebnisseTab({
  gameweek,
  activeGameweek,
  fixtureCount,
  events,
  userId,
  participations,
  userDisplayName,
  userFavoriteClub,
  seasonPoints,
  eventsPlayed,
  bestRank,
  totalRewardBsd,
  wins,
  top10,
  avgPoints,
  avgRank,
}: ErgebnisseTabProps) {
  const tf = useTranslations('fantasy');
  // Only treat as upcoming when the GW has zero fixtures — not based on activeGameweek alone
  // (activeGameweek defaults to 1 for users without a club, which would block all GW > 1)
  const isUpcoming = fixtureCount === 0 && gameweek > activeGameweek;

  // Scored events for this GW
  const scoredEvents = useMemo(
    () => events.filter(e => e.scoredAt),
    [events]
  );
  const joinedScoredEvents = useMemo(
    () => scoredEvents.filter(e => e.isJoined),
    [scoredEvents]
  );

  // Top scorers — load for any non-upcoming GW
  const [topScorers, setTopScorers] = useState<FixturePlayerStat[]>([]);
  const [loadingScorers, setLoadingScorers] = useState(!isUpcoming);
  useEffect(() => {
    if (isUpcoming) { setTopScorers([]); setHeldPlayerStats([]); setLoadingScorers(false); return; }
    // Clear stale data from previous GW before fetching new
    setTopScorers([]);
    setHeldPlayerStats([]);
    setLoadingScorers(true);
    let cancelled = false;
    getGameweekTopScorers(gameweek, 300).then(data => {
      if (!cancelled) { setTopScorers(data); setLoadingScorers(false); }
    }).catch((err) => {
      console.error('[ErgebnisseTab] topScorers fetch failed:', err);
      if (!cancelled) { setTopScorers([]); setLoadingScorers(false); }
    });
    return () => { cancelled = true; };
  }, [gameweek, isUpcoming]);

  // User's DPC holdings — cross-reference with GW stats
  const { data: holdings = [] } = useHoldings(userId);
  const heldPlayerIds = useMemo(() => holdings.map(h => h.player_id), [holdings]);
  const [heldPlayerStats, setHeldPlayerStats] = useState<FixturePlayerStat[]>([]);
  useEffect(() => {
    if (isUpcoming || heldPlayerIds.length === 0) { setHeldPlayerStats([]); return; }
    let cancelled = false;
    getGameweekStatsForPlayers(gameweek, heldPlayerIds).then(data => {
      if (!cancelled) setHeldPlayerStats(data);
    }).catch((err) => {
      console.error('[ErgebnisseTab] Failed to load player stats:', err);
      if (!cancelled) setHeldPlayerStats([]);
    });
    return () => { cancelled = true; };
  }, [gameweek, isUpcoming, heldPlayerIds]);

  // GW summary stats (from top scorers)
  const gwSummary = useMemo(() => {
    if (topScorers.length === 0) return null;
    const totalGoals = topScorers.reduce((s, p) => s + p.goals, 0);
    const totalAssists = topScorers.reduce((s, p) => s + p.assists, 0);
    const cleanSheets = topScorers.filter(p => p.clean_sheet && p.player_position === 'GK').length;
    const yellowCards = topScorers.filter(p => p.yellow_card).length;
    const ratings = topScorers.filter(p => p.rating != null).map(p => p.rating!);
    const avgRating = ratings.length > 0 ? ratings.reduce((s, r) => s + r, 0) / ratings.length : 0;
    const best = topScorers[0];
    return { totalGoals, totalAssists, cleanSheets, yellowCards, avgRating, best };
  }, [topScorers]);

  // Predictions for this GW
  const { data: predictions = [] } = usePredictions(userId, gameweek);

  // Footer modals
  const [showLeagues, setShowLeagues] = useState(false);
  const [showSeason, setShowSeason] = useState(false);

  // Empty state for upcoming GWs
  if (isUpcoming) {
    return (
      <div className="py-16 text-center">
        <Clock className="size-12 mx-auto mb-4 text-white/15" aria-hidden="true" />
        <div className="text-white/40 font-medium">{tf('ergebnisse.upcoming')}</div>
        <div className="text-white/20 text-xs mt-1">{tf('ergebnisse.upcomingDesc')}</div>
      </div>
    );
  }

  // Loading state — logo pulse (show whenever fetching, regardless of events)
  if (loadingScorers) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Image
          src="/logo.svg"
          alt="BeScout"
          width={48}
          height={48}
          className="size-12 animate-pulse motion-reduce:animate-none"
        />
      </div>
    );
  }

  // No data at all
  if (events.length === 0 && topScorers.length === 0) {
    return (
      <div className="py-16 text-center">
        <Trophy className="size-12 mx-auto mb-4 text-gold/20" aria-hidden="true" />
        <div className="text-white/50 font-medium">{tf('ergebnisse.noData')}</div>
        <div className="text-xs text-white/30 mt-1 max-w-[280px] mx-auto leading-relaxed">{tf('ergebnisse.noDataDesc')}</div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* ── ZONE 1: Hero Summary ── */}
      {gwSummary && (
        <GwHeroSummary summary={gwSummary} />
      )}

      {/* ── ZONE 2: Visual Showcase (Best XI + Top 3) ── */}
      {topScorers.length > 0 && (
        <VisualShowcase topScorers={topScorers} gameweek={gameweek} />
      )}

      {/* ── ZONE 3: Personal Results (DPCs / Events / Tipps) ── */}
      <PersonalResults
        heldPlayerStats={heldPlayerStats}
        holdings={holdings}
        joinedScoredEvents={joinedScoredEvents}
        predictions={predictions}
      />

      {/* ── FOOTER: Ligen + Saison Buttons ── */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => setShowLeagues(true)}
          className="flex items-center justify-center gap-2 p-3 bg-surface-subtle border border-white/[0.08] rounded-xl hover:bg-white/[0.06] transition-colors active:bg-white/[0.08] min-h-[44px]"
        >
          <Landmark className="size-4 text-gold/60" aria-hidden="true" />
          <span className="text-xs font-bold text-white/60">{tf('ergebnisse.leaguesBtn')}</span>
        </button>
        <button
          onClick={() => setShowSeason(true)}
          className="flex items-center justify-center gap-2 p-3 bg-surface-subtle border border-white/[0.08] rounded-xl hover:bg-white/[0.06] transition-colors active:bg-white/[0.08] min-h-[44px]"
        >
          <ChartNoAxesCombined className="size-4 text-purple-400/60" aria-hidden="true" />
          <span className="text-xs font-bold text-white/60">{tf('ergebnisse.seasonBtn')}</span>
        </button>
      </div>

      {/* Leagues Modal */}
      <Modal open={showLeagues} onClose={() => setShowLeagues(false)} title={tf('leagues')} size="lg">
        <LeaguesSection mode="full" />
      </Modal>

      {/* Season Stats Modal */}
      <Modal open={showSeason} onClose={() => setShowSeason(false)} title={tf('ergebnisse.seasonStats')} size="lg">
        <HistoryTab
          participations={participations}
          userDisplayName={userDisplayName}
          userFavoriteClub={userFavoriteClub}
          seasonPoints={seasonPoints}
          eventsPlayed={eventsPlayed}
          bestRank={bestRank}
          totalRewardBsd={totalRewardBsd}
          wins={wins}
          top10={top10}
          avgPoints={avgPoints}
          avgRank={avgRank}
          userId={userId}
        />
      </Modal>
    </div>
  );
}
