'use client';

import React from 'react';
import Link from 'next/link';
import {
  Trophy, Crown, Zap, ChevronRight, BarChart3,
  Briefcase, Building2,
} from 'lucide-react';
import { getScoreTier, SCORE_TIER_CONFIG } from '@/types';
import { PositionBadge } from '@/components/player';
import type { Pos, SynergyDetail } from '@/types';
import { fmtScout } from '@/lib/utils';
import { useTranslations, useLocale } from 'next-intl';
import type { FantasyEvent, UserDpcHolding } from '@/components/fantasy/types';
import { getScoreColor } from '@/components/fantasy/helpers';

export interface ScoreBreakdownProps {
  event: FantasyEvent;
  formationSlots: { pos: string; slot: number }[];
  slotDbKeys: string[];
  getSelectedPlayer: (slot: number) => UserDpcHolding | null;
  slotScores: Record<string, number> | null;
  progressiveScores: Map<string, number>;
  captainSlot: string | null;
  ownedPlayerIds?: Set<string>;
  ownershipBonusIds: Set<string>;
  leaderboard: { userId: string; rewardAmount: number }[];
  userId?: string;
  isScored: boolean;
  scoringJustFinished: boolean;
  myTotalScore: number | null;
  myRank: number | null;
  synergyPreview: { totalPct: number; details: SynergyDetail[] };
  onSwitchToLeaderboard: () => void;
  onClose: () => void;
}

export function ScoreBreakdown({
  event,
  formationSlots,
  slotDbKeys,
  getSelectedPlayer,
  slotScores,
  progressiveScores,
  captainSlot,
  ownedPlayerIds,
  ownershipBonusIds,
  leaderboard,
  userId,
  isScored,
  scoringJustFinished,
  myTotalScore,
  myRank,
  synergyPreview,
  onSwitchToLeaderboard,
  onClose,
}: ScoreBreakdownProps) {
  const t = useTranslations('fantasy');
  const locale = useLocale();

  return (
    <>
      {/* Team Score Banner (only when scored) */}
      {isScored && myTotalScore != null && (
        <div className={`relative overflow-hidden rounded-xl border ${scoringJustFinished ? 'border-gold/40' : 'border-gold/20'}`}>
          <div className="absolute inset-0 bg-gold/[0.08]" />
          {scoringJustFinished && <div className="absolute inset-0 bg-gold/5 animate-pulse motion-reduce:animate-none" />}
          <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 md:p-5 gap-3 sm:gap-0">
            <div className="flex items-center gap-4">
              <div className="size-12 rounded-xl bg-gold/20 flex items-center justify-center">
                <Trophy aria-hidden="true" className="size-6 text-gold" />
              </div>
              <div>
                <div className="text-xs text-white/50 uppercase font-bold">{t('yourTeamScore')}</div>
                <div className="text-3xl font-mono font-black text-gold">{myTotalScore} <span className="text-lg">{t('ptsShort')}</span></div>
              </div>
            </div>
            <div className="flex items-center gap-5">
              {myRank && (
                <div className="text-right">
                  <div className="text-xs text-white/50 uppercase font-bold">{t('placementLabel')}</div>
                  <div className={`text-3xl font-mono font-black ${myRank === 1 ? 'text-gold' : myRank <= 3 ? 'text-green-500' : 'text-white'}`}>
                    #{myRank}
                  </div>
                </div>
              )}
              {(() => {
                const myEntry = leaderboard.find(e => e.userId === userId);
                if (myEntry && myEntry.rewardAmount > 0) {
                  return (
                    <div className="text-right">
                      <div className="text-xs text-white/50 uppercase font-bold">{t('rewardLabel')}</div>
                      <div className="text-xl font-mono font-black text-green-500">+{fmtScout(myEntry.rewardAmount / 100)} CR</div>
                    </div>
                  );
                }
                return null;
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Post-Game Nudge: Trading */}
      {isScored && myRank && myRank > 3 && (
        <Link href="/market?tab=kaufen" onClick={onClose}>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-gold/[0.06] border border-gold/15 hover:border-gold/30 transition-colors">
            <div className="size-8 rounded-lg bg-gold/15 flex items-center justify-center flex-shrink-0">
              <Zap aria-hidden="true" className="size-4 text-gold" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-white">{t('strengthenPortfolio')}</div>
              <div className="text-xs text-white/40">{t('portfolioHint')}</div>
            </div>
            <ChevronRight aria-hidden="true" className="size-4 text-white/30 flex-shrink-0" />
          </div>
        </Link>
      )}

      {/* Scored OR Progressive Player Breakdown List */}
      {((isScored && slotScores) || (event?.status === 'running' && progressiveScores.size > 0)) && (
        <div className="space-y-1.5">
          <div className="text-xs text-white/40 font-bold uppercase px-1">
            {isScored ? t('scoreBreakdownLabel') : t('liveBreakdownLabel')}
          </div>
          {formationSlots.map(slot => {
            const player = getSelectedPlayer(slot.slot);
            const scoreKey = slotDbKeys[slot.slot];
            const score = isScored
              ? slotScores?.[scoreKey]
              : progressiveScores.get(player?.id ?? '');
            if (!player || score == null) return null;
            const isCpt = captainSlot === scoreKey;
            const displayScore = isCpt ? Math.min(225, Math.round(score * 1.5)) : score;
            const tier = getScoreTier(isScored ? score : displayScore);
            const tierCfg = tier !== 'none' ? SCORE_TIER_CONFIG[tier] : null;
            return (
              <div key={slot.slot} className={`flex items-center justify-between p-3 rounded-lg bg-surface-base border ${isCpt ? 'border-gold/30' : 'border-divider'}`}>
                <div className="flex items-center gap-3">
                  {isCpt ? (
                    <div className="size-6 rounded-full bg-gold/20 flex items-center justify-center flex-shrink-0">
                      <Crown aria-hidden="true" className="size-3.5 text-gold" />
                    </div>
                  ) : (
                    <PositionBadge pos={player.pos as Pos} size="sm" />
                  )}
                  <div>
                    <div className="font-medium text-sm flex items-center gap-1.5">
                      {player.first} {player.last}
                      {isCpt && <span className="text-xs font-bold text-gold bg-gold/10 px-1 rounded">C &times;1.5</span>}
                      {ownershipBonusIds.has(player.id) && <span className="text-[10px] font-bold text-gold bg-gold/[0.08] border border-gold/20 px-1 py-0.5 rounded">SC +5%</span>}
                    </div>
                    <div className="text-xs text-white/40 flex items-center gap-1.5">
                      {player.club}
                      {tierCfg && (
                        <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${tierCfg.bg} ${tierCfg.color}`}>
                          {tierCfg.labelDe} +{tierCfg.bonusCents / 100} CR
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-colors"
                      style={{
                        width: `${Math.min(100, (score / 150) * 100)}%`,
                        backgroundColor: getScoreColor(score),
                      }}
                    />
                  </div>
                  <span className="font-mono font-bold text-sm min-w-[3rem] text-right" style={{ color: getScoreColor(score) }}>
                    {score}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Synergy Bonus (scored view) */}
      {isScored && synergyPreview.totalPct > 0 && (
        <div className="flex items-center gap-3 p-3 bg-sky-500/5 border border-sky-500/20 rounded-lg">
          <Building2 aria-hidden="true" className="size-5 text-sky-400 flex-shrink-0" />
          <div>
            <div className="text-sm font-bold text-sky-300">{t('synergyBonus', { pct: synergyPreview.totalPct })}</div>
            <div className="text-xs text-white/40">
              {synergyPreview.details.map(d => `${d.source} (${d.bonus_pct}%)`).join(' + ')}
            </div>
          </div>
        </div>
      )}

      {/* Ownership Bonus (scored view) */}
      {isScored && ownershipBonusIds.size > 0 && (
        <div className="flex items-center gap-3 p-3 bg-gold/5 border border-gold/20 rounded-lg">
          <Briefcase aria-hidden="true" className="size-5 text-gold flex-shrink-0" />
          <div>
            <div className="text-sm font-bold text-gold">{t('ownershipBonus')}: +5%</div>
            <div className="text-xs text-white/40">
              {t('ownershipBonusActive', { count: ownershipBonusIds.size })}
            </div>
          </div>
        </div>
      )}

      {/* CTA to Leaderboard */}
      {isScored && (
        <button
          onClick={onSwitchToLeaderboard}
          className="w-full flex items-center justify-center gap-2 p-3 bg-surface-subtle hover:bg-white/[0.08] border border-white/10 rounded-xl transition-colors text-sm font-bold text-white/70 hover:text-white"
        >
          <BarChart3 aria-hidden="true" className="size-4" />
          {t('showRanking')}
          <ChevronRight aria-hidden="true" className="size-4" />
        </button>
      )}
    </>
  );
}
