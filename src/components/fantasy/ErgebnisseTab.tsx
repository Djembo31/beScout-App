'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Trophy, BarChart3, ChevronDown, ChevronUp, Clock, Target, CheckCircle, XCircle,
} from 'lucide-react';
import { Card } from '@/components/ui';
import { useTranslations } from 'next-intl';
import { usePredictions } from '@/lib/queries/predictions';
import { getGameweekTopScorers } from '@/lib/services/fixtures';
import type { FixturePlayerStat } from '@/types';
import type { FantasyEvent } from './types';
import { TopScorerShowcase, BestElevenShowcase } from './spieltag';
import { HistoryTab } from './HistoryTab';
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
  const allSimulated = scoredEvents.length > 0 && scoredEvents.length === events.length && events.length > 0;

  // Top scorers
  const [topScorers, setTopScorers] = useState<FixturePlayerStat[]>([]);
  useEffect(() => {
    if (!allSimulated) { setTopScorers([]); return; }
    let cancelled = false;
    getGameweekTopScorers(gameweek, 20).then(data => {
      if (!cancelled) setTopScorers(data);
    }).catch(() => {
      if (!cancelled) setTopScorers([]);
    });
    return () => { cancelled = true; };
  }, [gameweek, allSimulated]);

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
        <Clock className="w-12 h-12 mx-auto mb-4 text-white/15" />
        <div className="text-white/40 font-medium">{tf('ergebnisse.upcoming')}</div>
        <div className="text-white/20 text-xs mt-1">{tf('ergebnisse.upcomingDesc')}</div>
      </div>
    );
  }

  // No scored events yet for this GW
  if (scoredEvents.length === 0 && events.length > 0) {
    return (
      <div className="py-16 text-center">
        <Clock className="w-12 h-12 mx-auto mb-4 text-white/15" />
        <div className="text-white/40 font-medium">{tf('ergebnisse.pending')}</div>
        <div className="text-white/20 text-xs mt-1">{tf('ergebnisse.pendingDesc')}</div>
      </div>
    );
  }

  // No events at all
  if (events.length === 0) {
    return (
      <div className="py-16 text-center">
        <Trophy className="w-12 h-12 mx-auto mb-4 text-white/15" />
        <div className="text-white/40 font-medium">{tf('ergebnisse.noData')}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── SECTION 1: Event-Ergebnisse ── */}
      {joinedScoredEvents.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Trophy className="w-4 h-4 text-[#FFD700]" />
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
                  <div className="w-10 h-10 rounded-xl bg-[#FFD700]/10 flex items-center justify-center">
                    <span className="text-sm font-bold">{medalEmoji || `#${rank ?? '-'}`}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate">{event.name}</div>
                    <div className="text-[11px] text-white/40">
                      Platz {rank ?? '-'} / {event.participants} — {score ?? 0} Punkte
                    </div>
                  </div>
                  {event.userReward && event.userReward > 0 && (
                    <span className="text-xs font-bold text-[#FFD700]">+{(event.userReward / 100).toFixed(0)} $SCOUT</span>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── SECTION 2: Top Scorer Showcase ── */}
      {allSimulated && topScorers.length > 0 && (
        <section>
          <TopScorerShowcase scorers={topScorers} gameweek={gameweek} />
        </section>
      )}

      {/* ── SECTION 3: Best XI Pitch View ── */}
      {allSimulated && topScorers.length >= 6 && (
        <section>
          <BestElevenShowcase scorers={topScorers} gameweek={gameweek} />
        </section>
      )}

      {/* ── SECTION 4: Tipp-Ergebnisse ── */}
      {resolvedPredictions.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Target className="w-4 h-4 text-[#FFD700]" />
            <h3 className="font-bold text-sm">{tf('ergebnisse.predictions')}</h3>
          </div>
          <Card className="p-3 flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <BarChart3 className="w-4 h-4 text-white/30" />
              <span className="text-xs text-white/40">{tp('resolved')}</span>
            </div>
            <div className="flex items-center gap-3 ml-auto">
              <span className="flex items-center gap-1 text-xs font-bold text-[#22C55E]">
                <CheckCircle className="w-3.5 h-3.5" /> {correctCount}
              </span>
              <span className="flex items-center gap-1 text-xs font-bold text-red-400">
                <XCircle className="w-3.5 h-3.5" /> {wrongCount}
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
          className="w-full flex items-center justify-between p-3 bg-white/[0.02] border border-white/[0.06] rounded-xl hover:bg-white/[0.04] transition-all"
        >
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-purple-400" />
            <span className="font-bold text-sm">{tf('ergebnisse.seasonStats')}</span>
          </div>
          {showSeason ? (
            <ChevronUp className="w-4 h-4 text-white/30" />
          ) : (
            <ChevronDown className="w-4 h-4 text-white/30" />
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
