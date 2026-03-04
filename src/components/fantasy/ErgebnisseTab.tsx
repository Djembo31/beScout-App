'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Trophy, BarChart3, ChevronDown, ChevronUp, Clock, Target, CheckCircle, XCircle,
  Zap, Goal, HandHelping, ShieldCheck, Briefcase,
} from 'lucide-react';
import { Card } from '@/components/ui';
import { useTranslations } from 'next-intl';
import { usePredictions } from '@/lib/queries/predictions';
import { useHoldings } from '@/lib/queries/holdings';
import { getGameweekTopScorers, getGameweekStatsForPlayers } from '@/lib/services/fixtures';
import { scoreBadgeColor } from './spieltag/helpers';
import type { FixturePlayerStat } from '@/types';
import type { FantasyEvent } from './types';
import { TopScorerShowcase, BestElevenShowcase } from './spieltag';
import { HistoryTab } from './HistoryTab';
import Image from 'next/image';
import dynamic from 'next/dynamic';

const LeaguesSection = dynamic(() => import('./LeaguesSection'), { ssr: false });

type ErgebnisseTabProps = {
  gameweek: number;
  activeGameweek: number;
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
  const t = useTranslations('spieltag');
  const tf = useTranslations('fantasy');
  const tp = useTranslations('predictions');
  const isUpcoming = gameweek > activeGameweek;
  const isCurrent = gameweek === activeGameweek;

  // Scored events for this GW
  const scoredEvents = useMemo(
    () => events.filter(e => e.scoredAt),
    [events]
  );
  const joinedScoredEvents = useMemo(
    () => scoredEvents.filter(e => e.isJoined),
    [scoredEvents]
  );

  // Top scorers — load for any non-upcoming GW (independent of events)
  const [topScorers, setTopScorers] = useState<FixturePlayerStat[]>([]);
  const [loadingScorers, setLoadingScorers] = useState(!isUpcoming);
  useEffect(() => {
    if (isUpcoming) { setTopScorers([]); setLoadingScorers(false); return; }
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
    }).catch(() => {
      if (!cancelled) setHeldPlayerStats([]);
    });
    return () => { cancelled = true; };
  }, [gameweek, isUpcoming, heldPlayerIds]);

  // GW summary stats (from top scorers)
  const gwSummary = useMemo(() => {
    if (topScorers.length === 0) return null;
    const totalGoals = topScorers.reduce((s, p) => s + p.goals, 0);
    const totalAssists = topScorers.reduce((s, p) => s + p.assists, 0);
    const cleanSheets = topScorers.filter(p => p.clean_sheet).length;
    const ratings = topScorers.filter(p => p.rating != null).map(p => p.rating!);
    const avgRating = ratings.length > 0 ? ratings.reduce((s, r) => s + r, 0) / ratings.length : 0;
    const best = topScorers[0];
    return { totalGoals, totalAssists, cleanSheets, avgRating, best };
  }, [topScorers]);

  // Predictions for this GW
  const { data: predictions = [] } = usePredictions(userId, gameweek);
  const resolvedPredictions = useMemo(
    () => predictions.filter(p => p.status !== 'pending'),
    [predictions]
  );
  const correctCount = resolvedPredictions.filter(p => p.status === 'correct').length;
  const wrongCount = resolvedPredictions.filter(p => p.status === 'wrong').length;
  const accuracy = (correctCount + wrongCount) > 0
    ? Math.round((correctCount / (correctCount + wrongCount)) * 100)
    : 0;

  // Collapsible season section
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

  // Loading state — show logo pulse while topScorers are fetching
  if (loadingScorers && events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Image
          src="/logo.svg"
          alt="BeScout"
          width={48}
          height={48}
          className="size-12 animate-pulse"
        />
      </div>
    );
  }

  // No data at all (no events AND no player stats, loading complete)
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
    <div className="space-y-6">
      {/* ── SECTION 0: GW Highlights Summary ── */}
      {gwSummary && (
        <section>
          <div className="flex items-center gap-2 mb-3 border-l-2 border-l-emerald-400 pl-2">
            <Zap className="size-4 text-emerald-400" aria-hidden="true" />
            <h3 className="font-bold text-sm">{tf('ergebnisse.gwHighlights')}</h3>
          </div>
          <div className="grid grid-cols-4 gap-2">
            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-center">
              <div className="text-lg font-black tabular-nums text-gold">{gwSummary.avgRating.toFixed(1)}</div>
              <div className="text-[10px] text-white/40 mt-0.5">{tf('ergebnisse.avgRating')}</div>
            </div>
            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-center">
              <div className="flex items-center justify-center gap-1">
                <Goal className="size-4 text-gold" aria-hidden="true" />
                <span className="text-lg font-black tabular-nums">{gwSummary.totalGoals}</span>
              </div>
              <div className="text-[10px] text-white/40 mt-0.5">{tf('ergebnisse.totalGoals')}</div>
            </div>
            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-center">
              <div className="flex items-center justify-center gap-1">
                <HandHelping className="size-4 text-sky-400" aria-hidden="true" />
                <span className="text-lg font-black tabular-nums">{gwSummary.totalAssists}</span>
              </div>
              <div className="text-[10px] text-white/40 mt-0.5">{tf('ergebnisse.totalAssists')}</div>
            </div>
            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-center">
              <div className="flex items-center justify-center gap-1">
                <ShieldCheck className="size-4 text-emerald-400" aria-hidden="true" />
                <span className="text-lg font-black tabular-nums">{gwSummary.cleanSheets}</span>
              </div>
              <div className="text-[10px] text-white/40 mt-0.5">{tf('ergebnisse.cleanSheets')}</div>
            </div>
          </div>
        </section>
      )}

      {/* ── SECTION 0.5: Deine DPCs Performance ── */}
      {holdings.length > 0 && !isUpcoming && (
        <section>
          <div className="flex items-center gap-2 mb-3 border-l-2 border-l-orange-400 pl-2">
            <Briefcase className="size-4 text-orange-400" aria-hidden="true" />
            <h3 className="font-bold text-sm">{tf('ergebnisse.yourDpcs')}</h3>
          </div>
          {heldPlayerStats.length === 0 ? (
            <div className="py-6 text-center text-white/30 text-xs">
              {tf('ergebnisse.noDpcsPlayed')}
            </div>
          ) : (
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] divide-y divide-white/[0.04]">
              {heldPlayerStats.map(stat => {
                const rating = stat.rating ?? stat.fantasy_points / 10;
                return (
                  <Link
                    key={stat.id}
                    href={`/player/${stat.player_id}`}
                    className="flex items-center gap-2.5 px-3 py-2.5 hover:bg-white/[0.04] transition-colors active:bg-white/[0.06]"
                  >
                    <span className={`min-w-[2rem] px-1.5 py-0.5 rounded-md text-[11px] font-mono font-black text-center tabular-nums ${scoreBadgeColor(rating)}`}>
                      {rating.toFixed(1)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold truncate">
                        {stat.player_first_name.charAt(0)}. {stat.player_last_name}
                      </div>
                      <div className="text-[10px] text-white/40">
                        {stat.club_short} · {stat.minutes_played}{tf('ergebnisse.minutesShort')}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {stat.goals > 0 && (
                        <span className="text-xs font-bold text-gold tabular-nums">{stat.goals}G</span>
                      )}
                      {stat.assists > 0 && (
                        <span className="text-xs font-bold text-sky-400 tabular-nums">{stat.assists}A</span>
                      )}
                      {stat.clean_sheet && (
                        <ShieldCheck className="size-3.5 text-emerald-400" aria-hidden="true" />
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* ── SECTION 1: Event-Ergebnisse ── */}
      {joinedScoredEvents.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3 border-l-2 border-l-gold pl-2">
            <Trophy className="size-4 text-gold" aria-hidden="true" />
            <h3 className="font-bold text-sm">{t('results')}</h3>
          </div>
          <div className="space-y-2">
            {joinedScoredEvents.map(event => {
              const rank = event.userRank;
              const score = event.userPoints;
              const medalEmoji = rank === 1 ? '\u{1F947}' : rank === 2 ? '\u{1F948}' : rank === 3 ? '\u{1F949}' : '';

              return (
                <div
                  key={event.id}
                  className="flex items-center gap-3 p-3 bg-white/[0.03] border border-white/10 rounded-2xl"
                >
                  <div className="size-10 rounded-xl bg-gold/10 flex items-center justify-center">
                    <span className="text-sm font-bold">{medalEmoji || `#${rank ?? '-'}`}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate">{event.name}</div>
                    <div className="text-[11px] text-white/40">
                      {tf('rankOfParticipants', { rank: rank ?? '-', participants: event.participants, score: score ?? 0 })}
                    </div>
                  </div>
                  {event.userReward && event.userReward > 0 && (
                    <span className="text-xs font-bold text-gold">+{(event.userReward / 100).toFixed(0)} $SCOUT</span>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── SECTION 2: Top Scorer Showcase (top 20 only) ── */}
      {topScorers.length > 0 && (
        <section>
          <TopScorerShowcase scorers={topScorers.slice(0, 20)} gameweek={gameweek} />
        </section>
      )}

      {/* ── SECTION 3: Best XI Pitch View ── */}
      {topScorers.length >= 6 && (
        <section>
          <BestElevenShowcase scorers={topScorers} gameweek={gameweek} />
        </section>
      )}

      {/* ── SECTION 4: Tipp-Ergebnisse ── */}
      {resolvedPredictions.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3 border-l-2 border-l-sky-400 pl-2">
            <Target className="size-4 text-sky-400" aria-hidden="true" />
            <h3 className="font-bold text-sm">{tf('ergebnisse.predictions')}</h3>
          </div>
          <Card className="p-3 flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <BarChart3 className="size-4 text-white/30" aria-hidden="true" />
              <span className="text-xs text-white/40">{tp('resolved')}</span>
            </div>
            <div className="flex items-center gap-3 ml-auto">
              <span className="flex items-center gap-1 text-xs font-bold text-green-500">
                <CheckCircle className="size-3.5" aria-hidden="true" /> {correctCount}
              </span>
              <span className="flex items-center gap-1 text-xs font-bold text-red-400">
                <XCircle className="size-3.5" aria-hidden="true" /> {wrongCount}
              </span>
              <span className="text-xs font-mono font-bold text-white/60">
                {accuracy}%
              </span>
            </div>
          </Card>
        </section>
      )}

      {/* ── SECTION 5: Liga-Rangliste (full) ── */}
      <section>
        <LeaguesSection mode="full" />
      </section>

      {/* ── SECTION 6: Saison-Statistiken (collapsible) ── */}
      <section>
        <button
          onClick={() => setShowSeason(!showSeason)}
          className="w-full flex items-center justify-between p-3 bg-white/[0.02] border border-white/[0.06] rounded-xl hover:bg-white/[0.04] transition-colors"
        >
          <div className="flex items-center gap-2 border-l-2 border-l-purple-400 pl-2">
            <BarChart3 className="size-4 text-purple-400" aria-hidden="true" />
            <span className="font-bold text-sm">{tf('ergebnisse.seasonStats')}</span>
          </div>
          {showSeason ? (
            <ChevronUp className="size-4 text-white/30" aria-hidden="true" />
          ) : (
            <ChevronDown className="size-4 text-white/30" aria-hidden="true" />
          )}
        </button>
        {showSeason && (
          <div className="mt-3">
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
          </div>
        )}
      </section>
    </div>
  );
}
