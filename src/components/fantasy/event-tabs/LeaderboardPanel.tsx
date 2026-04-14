'use client';

import React, { useState, useMemo } from 'react';
import {
  Trophy, ChevronRight, ChevronLeft, RefreshCw,
} from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { CosmeticAvatar, CosmeticTitle } from '@/components/ui';
import { PositionBadge, PlayerIdentity, PlayerPhoto } from '@/components/player';
import type { Pos } from '@/types';
import { fmtScout } from '@/lib/utils';
import { getLineupWithPlayers } from '@/lib/services/lineups';
import type { LineupWithPlayers } from '@/lib/services/lineups';
import type { LeaderboardEntry } from '@/lib/services/scoring';
import { useBatchEquippedCosmetics } from '@/lib/queries/cosmetics';
import { getScoreColor, getPosAccentColor } from '../helpers';
import type { FantasyEvent } from '../types';
import { FantasyDisclaimer } from '@/components/legal/FantasyDisclaimer';
import dynamic from 'next/dynamic';
const SponsorBanner = dynamic(() => import('@/components/player/detail/SponsorBanner'), { ssr: false });

export interface LeaderboardPanelProps {
  event: FantasyEvent;
  userId?: string;
  leaderboard: LeaderboardEntry[];
  leaderboardLoading: boolean;
  isScored: boolean;
  isPolling?: boolean;
}

export default function LeaderboardPanel({
  event,
  userId,
  leaderboard,
  leaderboardLoading,
  isScored,
  isPolling,
}: LeaderboardPanelProps) {
  const t = useTranslations('fantasy');
  const locale = useLocale();

  const [viewingUserLineup, setViewingUserLineup] = useState<{ entry: LeaderboardEntry; data: LineupWithPlayers } | null>(null);
  const [viewingUserLoading, setViewingUserLoading] = useState(false);

  // Batch-fetch cosmetics for all leaderboard users
  const leaderboardUserIds = useMemo(() => leaderboard.map(e => e.userId), [leaderboard]);
  const { data: cosmeticsMap } = useBatchEquippedCosmetics(leaderboardUserIds);

  // AR-33 (J4): FantasyDisclaimer rendern wenn mindestens eine Reward > 0 ist.
  const hasRewards = useMemo(
    () => leaderboard.some((e) => e.rewardAmount > 0),
    [leaderboard]
  );

  return (
    <div className="space-y-2">
      <SponsorBanner placement="fantasy_leaderboard" className="mb-2" />
      {/* User Lineup Viewer (sub-view) */}
      {viewingUserLineup ? (
        <div className="space-y-4">
          {/* Back button */}
          <button
            onClick={() => setViewingUserLineup(null)}
            className="flex items-center gap-1.5 text-sm text-white/50 hover:text-white transition-colors"
          >
            <ChevronLeft aria-hidden="true" className="size-4" />
            {t('backToRanking')}
          </button>

          {/* User header */}
          <div className="flex items-center justify-between p-4 bg-surface-subtle border border-white/10 rounded-xl">
            <div className="flex items-center gap-3">
              <div className={`size-10 rounded-lg flex items-center justify-center font-bold ${viewingUserLineup.entry.rank === 1 ? 'bg-gold/20 text-gold' :
                viewingUserLineup.entry.rank === 2 ? 'bg-white/10 text-white/70' :
                  viewingUserLineup.entry.rank === 3 ? 'bg-orange-500/20 text-orange-400' :
                    'bg-surface-base text-white/50'
                }`}>
                #{viewingUserLineup.entry.rank}
              </div>
              <CosmeticAvatar
                avatarUrl={viewingUserLineup.entry.avatarUrl}
                displayName={viewingUserLineup.entry.displayName || viewingUserLineup.entry.handle}
                size={36}
                frameCssClass={cosmeticsMap?.get(viewingUserLineup.entry.userId)?.frameCssClass}
                className="rounded-full"
              />
              <div>
                <div className="font-bold">{viewingUserLineup.entry.displayName || viewingUserLineup.entry.handle}</div>
                <div className="text-xs text-white/40">@{viewingUserLineup.entry.handle}</div>
                <CosmeticTitle
                  title={cosmeticsMap?.get(viewingUserLineup.entry.userId)?.titleName ?? null}
                  rarity={cosmeticsMap?.get(viewingUserLineup.entry.userId)?.titleRarity}
                />
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-mono font-black text-gold">{viewingUserLineup.entry.totalScore} Pkt</div>
              {viewingUserLineup.entry.rewardAmount > 0 && (
                <div className="text-xs font-mono text-green-500">+{fmtScout(viewingUserLineup.entry.rewardAmount / 100)} CR</div>
              )}
            </div>
          </div>

          {/* Viewed user's pitch */}
          <div className="rounded-xl overflow-hidden border border-white/10">
            <div className="relative bg-gradient-to-b from-[#1a5c1a]/40 via-[#1e6b1e]/30 to-[#1a5c1a]/40 px-3 md:px-6 py-4 md:py-5">
              {/* Pitch Markings (SVG) */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none" viewBox="0 0 400 500">
                <rect x="20" y="15" width="360" height="470" fill="none" stroke="white" strokeOpacity="0.1" strokeWidth="1.5" />
                <line x1="20" y1="250" x2="380" y2="250" stroke="white" strokeOpacity="0.08" strokeWidth="1" />
                <circle cx="200" cy="250" r="50" fill="none" stroke="white" strokeOpacity="0.08" strokeWidth="1" />
                <circle cx="200" cy="250" r="3" fill="white" fillOpacity="0.1" />
              </svg>

              <div className="text-xs text-white/40 text-center mb-3 relative z-10">
                Formation: {viewingUserLineup.data.lineup.formation || '1-2-2-1'}
              </div>

              <div className="space-y-6 relative z-10">
                {['ATT', 'MID', 'DEF', 'GK'].map(posGroup => {
                  // Group by slot key (reliable — slot determines pitch row)
                  const slotPlayers = viewingUserLineup!.data.players.filter(p => {
                    if (posGroup === 'GK') return p.slotKey.startsWith('gk');
                    if (posGroup === 'DEF') return p.slotKey.startsWith('def');
                    if (posGroup === 'MID') return p.slotKey.startsWith('mid');
                    return p.slotKey.startsWith('att');
                  });
                  if (slotPlayers.length === 0) return null;
                  return (
                    <div key={posGroup} className={`flex justify-center ${slotPlayers.length > 1 ? 'gap-6 md:gap-16' : ''}`}>
                      {slotPlayers.map(sp => (
                        <div key={sp.slotKey} className="flex flex-col items-center relative">
                          {/* Score badge */}
                          {sp.score != null && (
                            <div
                              className="absolute -top-2 -right-3 z-20 min-w-[2rem] px-1.5 py-0.5 rounded-full text-xs font-mono font-black text-center shadow-lg"
                              style={{
                                backgroundColor: sp.score >= 100 ? '#FFD700' : sp.score >= 70 ? 'rgba(255,255,255,0.9)' : '#ff6b6b',
                                color: sp.score >= 100 ? '#000' : sp.score >= 70 ? '#000' : '#fff',
                              }}
                            >
                              {sp.score}
                            </div>
                          )}
                          <div
                            className="size-11 md:size-14 rounded-full flex items-center justify-center border-2 bg-black/40 overflow-hidden"
                            style={{
                              borderColor: sp.score != null ? getScoreColor(sp.score) : getPosAccentColor(sp.player.position),
                              boxShadow: sp.score != null ? `0 0 12px ${getScoreColor(sp.score)}40` : undefined,
                            }}
                          >
                            <PlayerPhoto imageUrl={sp.player.imageUrl} first={sp.player.firstName} last={sp.player.lastName} pos={sp.player.position as Pos} size={44} className="md:size-14" />
                          </div>
                          <div className="text-xs mt-1" style={{ color: sp.score != null ? '#ffffffcc' : getPosAccentColor(sp.player.position) + 'aa' }}>
                            {sp.player.lastName.slice(0, 8)}
                          </div>
                          {sp.score == null && (
                            <div className="text-xs text-white/30">L5: {sp.player.perfL5}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Player breakdown list */}
          <div className="space-y-1.5">
            <div className="text-xs text-white/40 font-bold uppercase px-1">{t('individualRatings')}</div>
            {viewingUserLineup.data.players.map(sp => (
              <div key={sp.slotKey} className="flex items-center justify-between p-3 rounded-lg bg-surface-base border border-divider">
                <div className="flex items-center gap-3">
                  <PlayerIdentity
                    player={{ first: sp.player.firstName, last: sp.player.lastName, pos: sp.player.position as Pos, status: 'fit', club: sp.player.club, ticket: 0, age: 0, imageUrl: sp.player.imageUrl }}
                    size="sm"
                    showMeta={false}
                    showStatus={false}
                  />
                </div>
                {sp.score != null ? (
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-1.5 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.min(100, (sp.score / 150) * 100)}%`,
                          backgroundColor: getScoreColor(sp.score),
                        }}
                      />
                    </div>
                    <span className="font-mono font-bold text-sm min-w-[3rem] text-right" style={{ color: getScoreColor(sp.score) }}>
                      {sp.score}
                    </span>
                  </div>
                ) : (
                  <span className="text-xs text-white/30 font-mono">&mdash;</span>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Leaderboard list */
        <>
          {leaderboardLoading ? (
            <div className="text-center py-8">
              <RefreshCw aria-hidden="true" className="size-6 mx-auto mb-2 text-white/30 animate-spin motion-reduce:animate-none" />
              <div className="text-sm text-white/40">{t('rankingLoading')}</div>
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="text-center py-8">
              <Trophy aria-hidden="true" className="size-10 mx-auto mb-3 text-white/20" />
              <div className="text-white/50 text-sm">{t('noResultsYet')}</div>
              <div className="text-white/30 text-xs mt-1">
                {t('scoringPending')}
              </div>
            </div>
          ) : (
            <>
              {isPolling && (
                <div className="flex items-center justify-center gap-1.5 mb-2 text-[10px] text-green-400/60 font-bold uppercase tracking-wider" role="status" aria-label={t('liveUpdating', { defaultMessage: 'Rangliste wird live aktualisiert' })}>
                  <span className="size-1.5 rounded-full bg-green-500 animate-pulse motion-reduce:animate-none" aria-hidden="true" />
                  Live
                </div>
              )}
              {isScored && (
                <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl mb-3 text-center">
                  <div className="text-xs text-purple-300">{t('scoredAt', { date: new Date(event.scoredAt!).toLocaleDateString(locale === 'tr' ? 'tr-TR' : 'de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) })}</div>
                </div>
              )}
              {leaderboard.map((entry) => {
                const isCurrentUser = entry.userId === userId;
                return (
                  <button
                    key={entry.userId}
                    onClick={async () => {
                      if (viewingUserLoading) return;
                      setViewingUserLoading(true);
                      try {
                        const data = await getLineupWithPlayers(event.id, entry.userId);
                        if (data) setViewingUserLineup({ entry, data });
                      } finally {
                        setViewingUserLoading(false);
                      }
                    }}
                    className={`w-full flex items-center justify-between p-4 min-h-[44px] rounded-lg border transition-colors hover:brightness-110 active:scale-[0.98] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50 ${isCurrentUser ? 'bg-gold/10 border-gold/30' : 'bg-surface-base border-white/10 hover:border-white/20'}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`size-8 rounded-lg flex items-center justify-center font-mono font-bold tabular-nums text-sm ${entry.rank === 1 ? 'bg-gold/20 text-gold' :
                        entry.rank === 2 ? 'bg-white/10 text-white/70' :
                          entry.rank === 3 ? 'bg-orange-500/20 text-orange-400' :
                            'bg-surface-base text-white/50'
                        }`}>
                        {entry.rank}
                      </div>
                      <div className="flex items-center gap-2">
                        <CosmeticAvatar
                          avatarUrl={entry.avatarUrl}
                          displayName={entry.displayName || entry.handle}
                          size={24}
                          frameCssClass={cosmeticsMap?.get(entry.userId)?.frameCssClass}
                          className="rounded-full"
                        />
                        <div className="flex flex-col">
                          <span className={`text-left ${isCurrentUser ? 'font-bold text-gold' : ''}`}>
                            {entry.displayName || entry.handle} {isCurrentUser && t('youLabel')}
                          </span>
                          <CosmeticTitle
                            title={cosmeticsMap?.get(entry.userId)?.titleName ?? null}
                            rarity={cosmeticsMap?.get(entry.userId)?.titleRarity}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {entry.rewardAmount > 0 && (
                        <span className="text-xs font-mono tabular-nums text-green-500">+{fmtScout(entry.rewardAmount / 100)} CR</span>
                      )}
                      <span className="font-mono font-bold tabular-nums">{entry.totalScore}</span>
                      <ChevronRight aria-hidden="true" className="size-4 text-white/30" />
                    </div>
                  </button>
                );
              })}
              {viewingUserLoading && (
                <div className="text-center py-3">
                  <RefreshCw aria-hidden="true" className="size-4 mx-auto text-white/30 animate-spin motion-reduce:animate-none" />
                </div>
              )}
              {/* AR-33 (J4): FantasyDisclaimer nur wenn echte Rewards vergeben sind */}
              {hasRewards && <FantasyDisclaimer variant="inline" className="mt-3" />}
            </>
          )}
        </>
      )}
    </div>
  );
}
