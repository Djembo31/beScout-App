'use client';

import React, { useState, useEffect } from 'react';
import { Users, BarChart3, Send, CheckCircle2 } from 'lucide-react';
import { Card, Button } from '@/components/ui';
import { fmtBSD } from '@/lib/utils';
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
  const [fairValue, setFairValue] = useState<PlayerFairValue | null>(null);
  const [myEstimate, setMyEstimate] = useState<number>(0);
  const [hasVoted, setHasVoted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  // Default slider to floor price or ipo price
  const defaultCents = floorPriceCents > 0 ? floorPriceCents : ipoPriceCents;

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const fv = await getPlayerFairValue(playerId);
        if (!cancelled) setFairValue(fv);

        if (userId && currentGameweek > 0) {
          const uv = await getUserValuation(userId, playerId, currentGameweek);
          if (!cancelled && uv) {
            setMyEstimate(uv.estimatedCents);
            setHasVoted(true);
          } else if (!cancelled) {
            setMyEstimate(defaultCents);
          }
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
      <h3 className="font-black text-lg mb-4 flex items-center gap-2">
        <Users className="w-5 h-5 text-sky-400" />
        Community-Bewertung
      </h3>

      {/* Fair Value Display */}
      {fairValue && fairValue.voteCount > 0 ? (
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-white/[0.02] border border-white/10 rounded-xl p-3 text-center">
            <div className="text-[10px] text-white/40 mb-1">Fair Value</div>
            <div className="font-mono font-bold text-[#FFD700]">{fmtBSD(centsToBsd(fairValue.medianCents))}</div>
          </div>
          <div className="bg-white/[0.02] border border-white/10 rounded-xl p-3 text-center">
            <div className="text-[10px] text-white/40 mb-1">Floor Preis</div>
            <div className="font-mono font-bold text-white/70">{fmtBSD(centsToBsd(floorPriceCents))}</div>
          </div>
          <div className="bg-white/[0.02] border border-white/10 rounded-xl p-3 text-center">
            <div className="text-[10px] text-white/40 mb-1">Bewertungen</div>
            <div className="font-mono font-bold text-sky-300">{fairValue.voteCount}</div>
          </div>
        </div>
      ) : (
        <div className="text-center py-4 mb-4 bg-white/[0.02] border border-white/10 rounded-xl">
          <BarChart3 className="w-8 h-8 text-white/10 mx-auto mb-2" />
          <div className="text-sm text-white/30">Noch keine Bewertungen</div>
          <div className="text-[10px] text-white/20">Sei der Erste!</div>
        </div>
      )}

      {/* User Valuation Input */}
      {userId && currentGameweek > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-white/50">Deine Einschätzung (GW {currentGameweek})</span>
            <span className="font-mono font-bold text-sm">{fmtBSD(centsToBsd(myEstimate))} BSD</span>
          </div>
          <input
            type="range"
            min={minCents}
            max={maxCents}
            step={100}
            value={myEstimate}
            onChange={(e) => setMyEstimate(Number(e.target.value))}
            className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer accent-sky-400"
            disabled={submitting}
          />
          <div className="flex items-center justify-between text-[10px] text-white/30">
            <span>{fmtBSD(centsToBsd(minCents))}</span>
            <span>{fmtBSD(centsToBsd(maxCents))}</span>
          </div>
          {hasVoted ? (
            <div className="flex items-center gap-2 p-2 bg-[#22C55E]/10 border border-[#22C55E]/20 rounded-lg">
              <CheckCircle2 className="w-4 h-4 text-[#22C55E]" />
              <span className="text-xs text-[#22C55E]/80">Bewertung abgegeben — du kannst sie jederzeit ändern</span>
            </div>
          ) : null}
          <Button
            variant={hasVoted ? 'outline' : 'gold'}
            size="sm"
            className="w-full"
            onClick={handleSubmit}
            disabled={submitting || myEstimate <= 0}
          >
            {submitting ? 'Wird gespeichert...' : hasVoted ? (
              <><Send className="w-3 h-3" /> Bewertung aktualisieren</>
            ) : (
              <><Send className="w-3 h-3" /> Bewertung abgeben</>
            )}
          </Button>
        </div>
      )}
    </Card>
  );
}
