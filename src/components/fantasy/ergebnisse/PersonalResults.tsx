'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { Briefcase, Trophy, Target, ShieldCheck } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { TabBar, TabPanel } from '@/components/ui/TabBar';
import { PlayerPhoto, PositionBadge, GoalBadge } from '@/components/player';
import { scoreBadgeColor, getPosAccent, getRingFrameClass, ratingHeatStyle } from '../spieltag/helpers';
import { PredictionResults } from './PredictionResults';
import type { FixturePlayerStat, Prediction } from '@/types';
import type { Pos } from '@/types';
import type { FantasyEvent } from '../types';
import type { HoldingWithPlayer } from '@/lib/services/wallet';

type Props = {
  heldPlayerStats: FixturePlayerStat[];
  holdings: HoldingWithPlayer[];
  joinedScoredEvents: FantasyEvent[];
  predictions: Prediction[];
};

const TABS = [
  { id: 'dpcs', label: 'Meine DPCs', shortLabel: 'DPCs', icon: <Briefcase className="size-3.5" aria-hidden="true" /> },
  { id: 'events', label: 'Events', icon: <Trophy className="size-3.5" aria-hidden="true" /> },
  { id: 'tipps', label: 'Tipps', icon: <Target className="size-3.5" aria-hidden="true" /> },
];

export function PersonalResults({ heldPlayerStats, holdings, joinedScoredEvents, predictions }: Props) {
  const tf = useTranslations('fantasy');
  const [activeTab, setActiveTab] = useState('dpcs');

  // Build holdings map for quantity lookup
  const holdingsMap = useMemo(() => {
    const map = new Map<string, HoldingWithPlayer>();
    holdings.forEach(h => map.set(h.player_id, h));
    return map;
  }, [holdings]);

  // DPC avg rating
  const dpcAvgRating = useMemo(() => {
    if (heldPlayerStats.length === 0) return 0;
    const sum = heldPlayerStats.reduce((s, p) => s + (p.rating ?? p.fantasy_points / 10), 0);
    return sum / heldPlayerStats.length;
  }, [heldPlayerStats]);

  return (
    <section>
      <TabBar tabs={TABS} activeTab={activeTab} onChange={setActiveTab} className="mb-3" />

      {/* DPCs Tab */}
      <TabPanel id="dpcs" activeTab={activeTab}>
        {heldPlayerStats.length === 0 ? (
          <div className="py-4 text-center text-white/30 text-xs">
            {holdings.length === 0 ? tf('ergebnisse.noDpcsHeld') : tf('ergebnisse.noDpcsPlayed')}
          </div>
        ) : (
          <div>
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] divide-y divide-white/[0.04]">
              {heldPlayerStats.map(stat => {
                const rating = stat.rating ?? stat.fantasy_points / 10;
                const holding = stat.player_id ? holdingsMap.get(stat.player_id) : undefined;
                const accent = getPosAccent(stat.player_position);

                return (
                  <Link
                    key={stat.id}
                    href={stat.player_id ? `/player/${stat.player_id}` : '#'}
                    className="flex items-center gap-2.5 px-3 py-2.5 hover:bg-white/[0.04] transition-colors active:bg-white/[0.06]"
                    style={{ borderLeftColor: accent, borderLeftWidth: '2px' }}
                  >
                    {/* Player photo with ring frame */}
                    <div className={`relative rounded-full ${getRingFrameClass(stat.player_position)}`}>
                      <PlayerPhoto
                        imageUrl={stat.player_image_url ?? holding?.player?.image_url}
                        first={stat.player_first_name}
                        last={stat.player_last_name}
                        pos={stat.player_position as Pos}
                        size={40}
                      />
                      <GoalBadge goals={stat.goals} size={15} />
                    </div>

                    {/* Rating badge — heat-map */}
                    <span
                      className="min-w-[2rem] px-1.5 py-0.5 rounded-md text-xs font-mono font-black text-center tabular-nums"
                      style={ratingHeatStyle(rating)}
                    >
                      {rating.toFixed(1)}
                    </span>

                    {/* Name + meta */}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold truncate">
                        {(stat.player_first_name || '?').charAt(0)}. {stat.player_last_name || '?'}
                      </div>
                      <div className="text-xs text-white/40">
                        {stat.club_short} · {stat.minutes_played}{tf('ergebnisse.minutesShort')}
                        {holding && <span className="ml-1 text-gold font-bold">{holding.quantity}x DPC</span>}
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-2 flex-shrink-0">
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

            {/* Summary row */}
            <div className="floodlight-divider mt-2" />
            <div className="flex items-center justify-center gap-3 mt-2 text-xs text-white/30">
              <span>Ø {dpcAvgRating.toFixed(1)}</span>
              <span>·</span>
              <span>{heldPlayerStats.length} {tf('ergebnisse.playersActive')}</span>
            </div>
          </div>
        )}
      </TabPanel>

      {/* Events Tab */}
      <TabPanel id="events" activeTab={activeTab}>
        {joinedScoredEvents.length === 0 ? (
          <div className="py-4 text-center text-white/30 text-xs">
            {tf('ergebnisse.noEvents')}
          </div>
        ) : (
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] divide-y divide-white/[0.04]">
            {joinedScoredEvents.map(event => {
              const rank = event.userRank;
              const score = event.userPoints;
              const medalEmoji = rank === 1 ? '\u{1F947}' : rank === 2 ? '\u{1F948}' : rank === 3 ? '\u{1F949}' : '';

              return (
                <div
                  key={event.id}
                  className="flex items-center gap-2.5 px-3 py-2.5"
                >
                  <div className="size-8 rounded-lg bg-gold/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold">{medalEmoji || `#${rank ?? '-'}`}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-xs truncate">{event.name}</div>
                    <div className="text-xs text-white/40">
                      {tf('rankOfParticipants', { rank: rank ?? '-', participants: event.participants, score: score ?? 0 })}
                    </div>
                  </div>
                  {event.userReward && event.userReward > 0 && (
                    <span className="text-xs font-bold text-gold flex-shrink-0">+{(event.userReward / 100).toFixed(0)} $SCOUT</span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </TabPanel>

      {/* Tipps Tab */}
      <TabPanel id="tipps" activeTab={activeTab}>
        <PredictionResults predictions={predictions} />
      </TabPanel>
    </section>
  );
}
