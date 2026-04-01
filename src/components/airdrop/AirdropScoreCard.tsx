'use client';

import React, { useState, useEffect } from 'react';
import { TrendingUp, Trophy, ChevronDown, ChevronUp, Rocket } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Card } from '@/components/ui';
import { cn } from '@/lib/utils';
import { getAirdropScore, refreshAirdropScore } from '@/lib/services/airdropScore';
import type { DbAirdropScore, AirdropTier } from '@/types';

const TIER_CONFIG: Record<AirdropTier, { color: string; bg: string; border: string }> = {
  bronze:  { color: '#CD7F32', bg: 'rgba(205,127,50,0.12)',  border: 'rgba(205,127,50,0.25)' },
  silber:  { color: '#C0C0C0', bg: 'rgba(192,192,192,0.12)', border: 'rgba(192,192,192,0.25)' },
  gold:    { color: '#FFD700', bg: 'rgba(255,215,0,0.12)',   border: 'rgba(255,215,0,0.25)' },
  diamond: { color: '#B9F2FF', bg: 'rgba(185,242,255,0.12)', border: 'rgba(185,242,255,0.25)' },
};

type ScoreBarDef = { key: string; color: string; getValue: (s: DbAirdropScore) => number };

const SCORE_BARS: ScoreBarDef[] = [
  { key: 'scout_rang',  color: '#FFD700', getValue: (s) => (s as Record<string, unknown>).scout_rang_score as number ?? 0 },
  { key: 'mastery',     color: '#8B5CF6', getValue: (s) => (s as Record<string, unknown>).mastery_score as number ?? 0 },
  { key: 'activity',    color: '#EC4899', getValue: (s) => s.active_days * 2 },
  { key: 'trades',      color: '#3B82F6', getValue: (s) => s.total_trades },
  { key: 'research',    color: '#22C55E', getValue: (s) => s.research_count * 3 },
  { key: 'referral',    color: '#06B6D4', getValue: (s) => s.referral_count * 5 },
];

type Props = {
  userId: string;
  compact?: boolean;
  totalUsers?: number;
};

export default function AirdropScoreCard({ userId, compact = false, totalUsers }: Props) {
  const ta = useTranslations('airdrop');
  const tierLabel: Record<AirdropTier, string> = { bronze: ta('tierBronze'), silber: ta('tierSilber'), gold: ta('tierGold'), diamond: ta('tierDiamond') };
  const barLabel: Record<string, string> = { scout_rang: ta('barScoutRang'), mastery: ta('barMastery'), activity: ta('barActivity'), trades: ta('barTrading'), research: ta('barResearch'), referral: ta('barReferral') };
  const [score, setScore] = useState<DbAirdropScore | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      let s = await getAirdropScore(userId);
      // If no score yet, trigger a refresh
      if (!s) {
        s = await refreshAirdropScore(userId);
      }
      if (!cancelled) {
        setScore(s);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [userId]);

  if (loading) {
    return (
      <Card className="p-4 animate-pulse motion-reduce:animate-none">
        <div className="h-4 bg-white/5 rounded w-1/2 mb-2" />
        <div className="h-8 bg-white/5 rounded w-1/3" />
      </Card>
    );
  }

  if (!score) return null;

  const tier = TIER_CONFIG[score.tier];

  // Compact version for sidebar
  if (compact) {
    return (
      <Card className="p-3 bg-purple-500/[0.04] border-purple-500/15">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: tier.bg, border: `1px solid ${tier.border}` }}>
            <Rocket className="w-4.5 h-4.5" style={{ color: tier.color }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-white/50 uppercase">Credits Airdrop</span>
              <span
                className="px-1.5 py-0.5 rounded text-[9px] font-black"
                style={{ backgroundColor: tier.bg, color: tier.color, border: `1px solid ${tier.border}` }}
              >
                {tierLabel[score.tier]}
              </span>
            </div>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-lg font-mono font-black" style={{ color: tier.color }}>{score.total_score}</span>
              {score.rank && (
                <span className="text-[10px] text-white/30">#{score.rank}{totalUsers ? ` ${ta('rankOf', { total: totalUsers })}` : ''}</span>
              )}
            </div>
          </div>
        </div>
      </Card>
    );
  }

  // Full version
  return (
    <Card className="p-4 bg-purple-500/[0.04] border-purple-500/15">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Rocket className="size-4 text-purple-400" />
          <span className="text-xs font-bold text-white/50 uppercase">Credits Airdrop Score</span>
        </div>
        <span
          className="px-2 py-0.5 rounded-lg text-[10px] font-black"
          style={{ backgroundColor: tier.bg, color: tier.color, border: `1px solid ${tier.border}` }}
        >
          {tierLabel[score.tier]}
        </span>
      </div>

      {/* Score + Rank */}
      <div className="flex items-end gap-3 mb-4">
        <span className="text-3xl font-mono font-black" style={{ color: tier.color }}>{score.total_score}</span>
        <div className="flex items-center gap-1.5 pb-1">
          {score.rank && (
            <>
              <Trophy className="size-3.5 text-gold/60" />
              <span className="text-sm font-bold text-white/40">#{score.rank}</span>
              {totalUsers && <span className="text-xs text-white/20">{ta('rankOf', { total: totalUsers })}</span>}
            </>
          )}
        </div>
      </div>

      {/* Score Bars */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between text-xs text-white/40 hover:text-white/60 transition-colors mb-2"
      >
        <span>{ta('scoreBreakdown')}</span>
        {expanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
      </button>

      {expanded && (
        <div className="space-y-2">
          {SCORE_BARS.map(bar => {
            const val = bar.getValue(score);
            return (
              <div key={bar.key}>
                <div className="flex items-center justify-between text-[10px] mb-0.5">
                  <span className="text-white/50">{barLabel[bar.key]}</span>
                  <span className="font-mono font-bold" style={{ color: bar.color }}>{val}</span>
                </div>
                <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-colors duration-500"
                    style={{ width: `${Math.min((val / 100) * 100, 100)}%`, backgroundColor: bar.color }}
                  />
                </div>
              </div>
            );
          })}
          {/* Multipliers */}
          <div className="pt-2 border-t border-white/[0.06] flex gap-3 text-[10px]">
            {score.founding_multiplier > 1 && (
              <span className="px-2 py-0.5 rounded-lg bg-gold/15 text-gold font-bold border border-gold/25">
                {ta('foundingMultiplier', { n: score.founding_multiplier })}
              </span>
            )}
            {((score as Record<string, unknown>).abo_multiplier as number ?? 1) > 1 && (
              <span className="px-2 py-0.5 rounded-lg bg-purple-400/15 text-purple-400 font-bold border border-purple-400/25">
                {ta('aboMultiplier', { n: ((score as Record<string, unknown>).abo_multiplier as number).toFixed(1) })}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Improve + Coming Soon */}
      <div className="mt-3 pt-3 border-t border-white/[0.06] space-y-2">
        <a href="/airdrop" className="flex items-center gap-2 text-[10px] text-purple-400/70 hover:text-purple-300 transition-colors">
          <Trophy className="size-3" />
          <span>{ta('viewLeaderboard')}</span>
        </a>
        <div className="flex items-center gap-2 text-[10px] text-white/30">
          <TrendingUp className="size-3" />
          <span>{ta('airdropComingSoon')}</span>
        </div>
      </div>
    </Card>
  );
}
