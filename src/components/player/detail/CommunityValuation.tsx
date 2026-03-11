'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Users, BarChart3, Send, CheckCircle2 } from 'lucide-react';
import { Card, Button } from '@/components/ui';
import { fmtScout } from '@/lib/utils';
import { centsToBsd } from '@/lib/services/players';
import { getPlayerFairValue, getUserValuation, submitValuation } from '@/lib/services/valuations';
import type { PlayerFairValue } from '@/lib/services/valuations';

type CommunityValuationProps = {
  playerId: string;
  userId: string | null;
  floorPriceCents: number;
  ipoPriceCents: number;
  currentGameweek: number;
};

export default function CommunityValuation({ playerId, userId, floorPriceCents, ipoPriceCents, currentGameweek }: CommunityValuationProps) {
  const t = useTranslations('playerDetail');
  const [fairValue, setFairValue] = useState<PlayerFairValue | null>(null);
  const [myEstimate, setMyEstimate] = useState<number>(0);
  const [hasVoted, setHasVoted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  // Default slider to floor price or ipo price (stabilized reference)
  const defaultCents = useMemo(
    () => floorPriceCents > 0 ? floorPriceCents : ipoPriceCents,
    [floorPriceCents, ipoPriceCents]
  );

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [fv, uv] = await Promise.all([
          getPlayerFairValue(playerId),
          userId && currentGameweek > 0
            ? getUserValuation(userId, playerId, currentGameweek)
            : Promise.resolve(null),
        ]);

        if (cancelled) return;

        setFairValue(fv);
        if (uv) {
          setMyEstimate(uv.estimatedCents);
          setHasVoted(true);
        } else {
          setMyEstimate(defaultCents);
        }
      } catch {
        // Non-critical
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [playerId, userId, currentGameweek, defaultCents]);

  const handleSubmit = async () => {
    if (!userId || submitting || myEstimate <= 0 || currentGameweek <= 0) return;
    setSubmitting(true);
    try {
      const result = await submitValuation(userId, playerId, myEstimate, currentGameweek);
      if (result.success) {
        setHasVoted(true);
        if (result.medianCents != null && result.voteCount != null) {
          setFairValue(prev => ({
            playerId,
            medianCents: result.medianCents!,
            meanCents: prev?.meanCents ?? result.medianCents!,
            stdDevCents: prev?.stdDevCents ?? 0,
            voteCount: result.voteCount!,
            lastCalculatedAt: new Date().toISOString(),
          }));
        }
      }
    } catch {
      // Silent
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return null;

  // Slider range: 50% to 200% of default price
  const minCents = Math.max(100, Math.round(defaultCents * 0.5));
  const maxCents = Math.round(defaultCents * 2);

  return (
    <Card className="p-4 md:p-6">
      <h3 className="font-black text-lg mb-4 flex items-center gap-2 text-balance">
        <Users className="size-5 text-sky-400" aria-hidden="true" />
        {t('communityValuation')}
      </h3>

      {/* Fair Value Display */}
      {fairValue && fairValue.voteCount > 0 ? (
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-surface-base border border-white/10 rounded-xl p-3 text-center">
            <div className="text-[10px] text-white/40 mb-1">{t('fairValue')}</div>
            <div className="font-mono font-bold tabular-nums text-gold">{fmtScout(centsToBsd(fairValue.medianCents))}</div>
          </div>
          <div className="bg-surface-base border border-white/10 rounded-xl p-3 text-center">
            <div className="text-[10px] text-white/40 mb-1">{t('floorPrice')}</div>
            <div className="font-mono font-bold tabular-nums text-white/70">{fmtScout(centsToBsd(floorPriceCents))}</div>
          </div>
          <div className="bg-surface-base border border-white/10 rounded-xl p-3 text-center">
            <div className="text-[10px] text-white/40 mb-1">{t('valuations')}</div>
            <div className="font-mono font-bold tabular-nums text-sky-300">{fairValue.voteCount}</div>
          </div>
        </div>
      ) : (
        <div className="text-center py-4 mb-4 bg-surface-base border border-white/10 rounded-xl">
          <BarChart3 className="size-8 text-white/10 mx-auto mb-2" aria-hidden="true" />
          <div className="text-sm text-white/30">{t('noValuations')}</div>
          <div className="text-[10px] text-white/20">{t('beFirst')}</div>
        </div>
      )}

      {/* User Valuation Input */}
      {userId && currentGameweek > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-white/50">{t('yourEstimate', { gw: currentGameweek })}</span>
            <span className="font-mono font-bold tabular-nums text-sm">{fmtScout(centsToBsd(myEstimate))} bCredits</span>
          </div>
          <input
            type="range"
            min={minCents}
            max={maxCents}
            step={100}
            value={myEstimate}
            onChange={(e) => setMyEstimate(Number(e.target.value))}
            className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer accent-sky-400 focus-visible:ring-2 focus-visible:ring-sky-400/40"
            disabled={submitting}
            aria-label={t('yourEstimate', { gw: currentGameweek })}
          />
          <div className="flex items-center justify-between text-[10px] text-white/30 tabular-nums">
            <span>{fmtScout(centsToBsd(minCents))}</span>
            <span>{fmtScout(centsToBsd(maxCents))}</span>
          </div>
          {hasVoted ? (
            <div className="flex items-center gap-2 p-2 bg-green-500/10 border border-green-500/20 rounded-lg">
              <CheckCircle2 className="size-4 text-green-500" aria-hidden="true" />
              <span className="text-xs text-green-500/80">{t('valuationSubmitted')}</span>
            </div>
          ) : null}
          <Button
            variant={hasVoted ? 'outline' : 'gold'}
            size="sm"
            className="w-full"
            onClick={handleSubmit}
            disabled={submitting || myEstimate <= 0}
          >
            {submitting ? t('saving') : hasVoted ? (
              <><Send className="size-3" aria-hidden="true" /> {t('updateValuation')}</>
            ) : (
              <><Send className="size-3" aria-hidden="true" /> {t('submitValuation')}</>
            )}
          </Button>
        </div>
      )}
    </Card>
  );
}
