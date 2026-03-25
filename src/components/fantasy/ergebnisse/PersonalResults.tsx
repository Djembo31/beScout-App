'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { Briefcase, Trophy, Target, ShieldCheck } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { TabBar, TabPanel } from '@/components/ui/TabBar';
import { PlayerPhoto, PositionBadge, GoalBadge } from '@/components/player';
import { getPosAccent, getRingFrameClass, getMatchScore } from '../spieltag/helpers';
import { getScoreBadgeStyle } from '@/components/player/scoreColor';
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

export function PersonalResults({ heldPlayerStats, holdings, joinedScoredEvents, predictions }: Props) {
  const tf = useTranslations('fantasy');

  const TABS = [
    { id: 'dpcs', label: tf('ergebnisse.tab_my_dpcs'), shortLabel: 'DPCs', icon: <Briefcase className="size-3.5" aria-hidden="true" /> },
    { id: 'events', label: tf('ergebnisse.tab_events'), icon: <Trophy className="size-3.5" aria-hidden="true" /> },
    { id: 'tipps', label: tf('ergebnisse.tab_tipps'), icon: <Target className="size-3.5" aria-hidden="true" /> },
  ];
  const [activeTab, setActiveTab] = useState('dpcs');

  // Build holdings map for quantity lookup
  const holdingsMap = useMemo(() => {
    const map = new Map<string, HoldingWithPlayer>();
    holdings.forEach(h => map.set(h.player_id, h));
    return map;
  }, [holdings]);

  // DPC avg score (0-100)
  const dpcAvgScore = useMemo(() => {
    if (heldPlayerStats.length === 0) return 0;
    const sum = heldPlayerStats.reduce((s, p) => s + (getMatchScore(p) ?? 0), 0);
    return Math.round(sum / heldPlayerStats.length);
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
            <div className="rounded-xl border border-white/[0.06] bg-surface-minimal divide-y divide-white/[0.04]">
              {heldPlayerStats.map(stat => {
                const score = getMatchScore(stat);
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
                      style={getScoreBadgeStyle(score)}
                    >
                      {score ?? '\u2013'}
                    </span>

                    {/* Name + meta */}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold truncate">
                        {(stat.player_first_name || '?').charAt(0)}. {stat.player_last_name || '?'}
                      </div>
                      <div className="text-xs text-white/40">
                        {stat.club_short} · {stat.minutes_played}{tf('ergebnisse.minutesShort')}
                        {holding && <span className="ml-1 text-gold font-bold">{holding.quantity}x SC</span>}
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {stat.assists > 0 && (
                        <span className="text-xs font-bold text-sky-400 tabular-nums">{stat.assists}A</span>
                      )}
                      {stat.clean_sheet && stat.player_position === 'GK' && (
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
              <span>Ø {dpcAvgScore}</span>
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
          <div className="rounded-xl border border-white/[0.06] bg-surface-minimal divide-y divide-white/[0.04]">
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
                    <span className="text-xs font-bold text-gold flex-shrink-0">+{(event.userReward / 100).toFixed(0)} CR</span>
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
