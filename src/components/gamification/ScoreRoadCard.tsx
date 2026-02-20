'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { Check, Lock, ChevronDown, ChevronUp, Trophy } from 'lucide-react';
import { Card, Button } from '@/components/ui';
import { cn, fmtScout } from '@/lib/utils';
import { SCORE_ROAD, getRang, getMedianScore, type ScoreRoadMilestone } from '@/lib/gamification';
import { useScoreRoadClaims, useScoutScores } from '@/lib/queries/gamification';
import { claimScoreRoad } from '@/lib/services/gamification';
import { centsToBsd } from '@/lib/services/players';
import { useQueryClient } from '@tanstack/react-query';
import { qk } from '@/lib/queries/keys';
import { useToast } from '@/components/providers/ToastProvider';
import { useTranslations } from 'next-intl';

interface ScoreRoadCardProps {
  userId: string;
}

type MilestoneState = 'claimed' | 'claimable' | 'active' | 'locked';

export default function ScoreRoadCard({ userId }: ScoreRoadCardProps) {
  const tg = useTranslations('gamification');
  const tsr = useTranslations('gamification.scoreRoad');
  const { data: claims = [] } = useScoreRoadClaims(userId);
  const { data: scores } = useScoutScores(userId);
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const [claimingMs, setClaimingMs] = useState<number | null>(null);
  const [expanded, setExpanded] = useState(false);

  const medianScore = scores ? getMedianScore(scores) : 0;
  const claimedSet = useMemo(() => new Set(claims.map(c => c.milestone)), [claims]);

  const getMilestoneState = useCallback((ms: ScoreRoadMilestone): MilestoneState => {
    if (claimedSet.has(ms.score)) return 'claimed';
    if (medianScore >= ms.score) return 'claimable';
    // "active" = first locked milestone (next target)
    return 'locked';
  }, [claimedSet, medianScore]);

  // Find the index of the first unclaimed milestone that's reachable or next target
  const firstUnclaimedIdx = SCORE_ROAD.findIndex(ms => !claimedSet.has(ms.score));
  const activeIdx = firstUnclaimedIdx >= 0 ? firstUnclaimedIdx : SCORE_ROAD.length;

  // Determine which milestones to show (collapsed: up to 2 after active, expanded: all)
  const visibleMilestones = useMemo(() => {
    if (expanded) return SCORE_ROAD;
    // Show all claimed + claimable + active (next locked) + 1 more
    const cutoff = Math.min(activeIdx + 2, SCORE_ROAD.length);
    return SCORE_ROAD.slice(0, cutoff);
  }, [expanded, activeIdx]);

  const hasMore = visibleMilestones.length < SCORE_ROAD.length;
  const allClaimed = claimedSet.size >= SCORE_ROAD.length;

  const handleClaim = useCallback(async (milestone: number) => {
    setClaimingMs(milestone);
    const result = await claimScoreRoad(userId, milestone);
    setClaimingMs(null);

    if (result.ok) {
      const rewardBsd = result.reward_bsd ? centsToBsd(result.reward_bsd) : 0;
      if (rewardBsd > 0) {
        addToast(tsr('celebration', { reward: `${fmtScout(rewardBsd)} $SCOUT` }), 'celebration');
      } else {
        addToast(tsr('claimed'), 'success');
      }
      queryClient.invalidateQueries({ queryKey: qk.gamification.scoreRoad(userId) });
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
    } else {
      addToast(result.error ?? 'Fehler', 'error');
    }
  }, [userId, addToast, tsr, queryClient]);

  if (!scores) return null;

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-5">
        <Trophy className="w-4 h-4 text-[#FFD700]" />
        <h3 className="font-black">{tsr('title')}</h3>
      </div>

      {/* Timeline */}
      <div className="relative ml-3">
        {visibleMilestones.map((ms, i) => {
          const state = getMilestoneState(ms);
          const isActive = !claimedSet.has(ms.score) && state === 'locked' && i === activeIdx;
          const effectiveState = isActive ? 'active' : state;
          const rang = getRang(ms.score);
          const isLast = i === visibleMilestones.length - 1;
          const claimEntry = claims.find(c => c.milestone === ms.score);

          return (
            <div key={ms.score} className="relative flex gap-4">
              {/* Vertical line */}
              {!isLast && (
                <div className={cn(
                  'absolute left-[7px] top-[22px] w-[2px] bottom-0',
                  effectiveState === 'claimed' ? 'bg-emerald-500/40' :
                  effectiveState === 'claimable' ? 'bg-[#FFD700]/30' :
                  'bg-white/[0.06]'
                )} />
              )}

              {/* Dot */}
              <div className={cn(
                'relative z-10 flex items-center justify-center w-4 h-4 rounded-full mt-1 shrink-0',
                effectiveState === 'claimed' ? 'bg-emerald-500' :
                effectiveState === 'claimable' ? 'bg-[#FFD700] shadow-[0_0_12px_rgba(255,215,0,0.4)]' :
                effectiveState === 'active' ? 'bg-white/20 border-2 border-white/30' :
                'bg-white/10 border border-white/[0.06]'
              )}>
                {effectiveState === 'claimed' && <Check className="w-2.5 h-2.5 text-white" />}
                {effectiveState === 'claimable' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
              </div>

              {/* Content */}
              <div className={cn(
                'flex-1 pb-5',
                effectiveState === 'locked' && 'opacity-40'
              )}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={cn('text-sm font-bold', rang.color)}>
                      {tg(`rang.${ms.rangI18nKey}`)}
                    </span>
                    <span className="text-[10px] text-white/30 font-mono">{ms.score}</span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {/* Reward badge */}
                    {ms.rewardBsd > 0 ? (
                      <span className="text-xs font-mono font-bold text-[#FFD700]">
                        {fmtScout(centsToBsd(ms.rewardBsd))} $SCOUT
                      </span>
                    ) : (
                      <span className="text-[10px] text-white/30">{tsr('cosmetic')}</span>
                    )}

                    {/* State indicator */}
                    {effectiveState === 'claimed' && (
                      <span className="flex items-center gap-1 text-[10px] text-emerald-400">
                        <Check className="w-3 h-3" />
                      </span>
                    )}
                    {effectiveState === 'claimable' && (
                      <Button
                        variant="gold"
                        size="sm"
                        onClick={() => handleClaim(ms.score)}
                        disabled={claimingMs !== null}
                        className="text-[10px] px-2.5 py-1 h-auto animate-pulse"
                      >
                        {claimingMs === ms.score ? '...' : tsr('claim')}
                      </Button>
                    )}
                    {effectiveState === 'locked' && (
                      <Lock className="w-3 h-3 text-white/20" />
                    )}
                  </div>
                </div>

                {/* Claimed date */}
                {effectiveState === 'claimed' && claimEntry && (
                  <div className="text-[10px] text-white/20 mt-0.5">
                    {tsr('claimedAt', { date: new Date(claimEntry.claimed_at).toLocaleDateString('de-DE') })}
                  </div>
                )}

                {/* Progress bar for active (next target) milestone */}
                {effectiveState === 'active' && medianScore > 0 && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-[10px] text-white/30 mb-1">
                      <span>{tsr('nextMilestone')}</span>
                      <span className="font-mono">{tsr('progress', { current: medianScore, target: ms.score })}</span>
                    </div>
                    <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                      {(() => {
                        const prevMs = i > 0 ? SCORE_ROAD[i - 1].score : 0;
                        const pct = Math.min(100, Math.max(0, ((medianScore - prevMs) / (ms.score - prevMs)) * 100));
                        return (
                          <div
                            className="h-full bg-gradient-to-r from-[#FFD700]/60 to-[#FFD700] rounded-full transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        );
                      })()}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* All claimed message */}
      {allClaimed && (
        <div className="text-center text-sm text-[#FFD700] font-bold mt-2">
          {tsr('allClaimed')}
        </div>
      )}

      {/* Expand/Collapse */}
      {(hasMore || expanded) && !allClaimed && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center justify-center gap-1 w-full py-2 text-xs text-white/40 hover:text-white/60 transition-colors"
        >
          {expanded ? (
            <>
              <ChevronUp className="w-3 h-3" />
              Weniger
            </>
          ) : (
            <>
              <ChevronDown className="w-3 h-3" />
              Alle {SCORE_ROAD.length} Meilensteine
            </>
          )}
        </button>
      )}
    </Card>
  );
}
