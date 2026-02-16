'use client';

import React, { useState, useEffect } from 'react';
import { TrendingUp, Trophy, ChevronDown, ChevronUp, Rocket } from 'lucide-react';
import { Card } from '@/components/ui';
import { cn } from '@/lib/utils';
import { getAirdropScore, refreshAirdropScore } from '@/lib/services/airdropScore';
import type { DbAirdropScore, AirdropTier } from '@/types';

const TIER_CONFIG: Record<AirdropTier, { label: string; color: string; bg: string; border: string }> = {
  bronze:  { label: 'Bronze',  color: '#CD7F32', bg: 'rgba(205,127,50,0.12)',  border: 'rgba(205,127,50,0.25)' },
  silver:  { label: 'Silber',  color: '#C0C0C0', bg: 'rgba(192,192,192,0.12)', border: 'rgba(192,192,192,0.25)' },
  gold:    { label: 'Gold',    color: '#FFD700', bg: 'rgba(255,215,0,0.12)',   border: 'rgba(255,215,0,0.25)' },
  diamond: { label: 'Diamond', color: '#B9F2FF', bg: 'rgba(185,242,255,0.12)', border: 'rgba(185,242,255,0.25)' },
};

const SCORE_BARS: { key: keyof Pick<DbAirdropScore, 'trading_score' | 'content_score' | 'fantasy_score' | 'social_score' | 'activity_score' | 'referral_score'>; label: string; color: string; weight: string }[] = [
  { key: 'trading_score',  label: 'Trading',  color: '#3B82F6', weight: '25%' },
  { key: 'content_score',  label: 'Content',  color: '#8B5CF6', weight: '25%' },
  { key: 'fantasy_score',  label: 'Fantasy',  color: '#22C55E', weight: '20%' },
  { key: 'social_score',   label: 'Social',   color: '#F59E0B', weight: '15%' },
  { key: 'activity_score', label: 'Aktivität', color: '#EC4899', weight: '10%' },
  { key: 'referral_score', label: 'Referral', color: '#06B6D4', weight: '5%' },
];

type Props = {
  userId: string;
  compact?: boolean;
  totalUsers?: number;
};

export default function AirdropScoreCard({ userId, compact = false, totalUsers }: Props) {
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
      <Card className="p-4 animate-pulse">
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
      <Card className="p-3 bg-gradient-to-r from-purple-500/[0.04] to-[#FFD700]/[0.04] border-purple-500/15">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: tier.bg, border: `1px solid ${tier.border}` }}>
            <Rocket className="w-4.5 h-4.5" style={{ color: tier.color }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-white/50 uppercase tracking-wider">$SCOUT Airdrop</span>
              <span
                className="px-1.5 py-0.5 rounded text-[9px] font-black"
                style={{ backgroundColor: tier.bg, color: tier.color, border: `1px solid ${tier.border}` }}
              >
                {tier.label}
              </span>
            </div>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-lg font-mono font-black" style={{ color: tier.color }}>{score.total_score}</span>
              {score.rank && (
                <span className="text-[10px] text-white/30">#{score.rank}{totalUsers ? ` von ${totalUsers}` : ''}</span>
              )}
            </div>
          </div>
        </div>
      </Card>
    );
  }

  // Full version
  return (
    <Card className="p-4 bg-gradient-to-br from-purple-500/[0.04] via-transparent to-[#FFD700]/[0.04] border-purple-500/15">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Rocket className="w-4 h-4 text-purple-400" />
          <span className="text-xs font-bold text-white/50 uppercase tracking-wider">$SCOUT Airdrop Score</span>
        </div>
        <span
          className="px-2 py-0.5 rounded-lg text-[10px] font-black"
          style={{ backgroundColor: tier.bg, color: tier.color, border: `1px solid ${tier.border}` }}
        >
          {tier.label}
        </span>
      </div>

      {/* Score + Rank */}
      <div className="flex items-end gap-3 mb-4">
        <span className="text-3xl font-mono font-black" style={{ color: tier.color }}>{score.total_score}</span>
        <div className="flex items-center gap-1.5 pb-1">
          {score.rank && (
            <>
              <Trophy className="w-3.5 h-3.5 text-[#FFD700]/60" />
              <span className="text-sm font-bold text-white/40">#{score.rank}</span>
              {totalUsers && <span className="text-xs text-white/20">von {totalUsers}</span>}
            </>
          )}
        </div>
      </div>

      {/* Score Bars */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between text-xs text-white/40 hover:text-white/60 transition-colors mb-2"
      >
        <span>Score-Aufschlüsselung</span>
        {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>

      {expanded && (
        <div className="space-y-2">
          {SCORE_BARS.map(bar => {
            const val = score[bar.key] as number;
            return (
              <div key={bar.key}>
                <div className="flex items-center justify-between text-[10px] mb-0.5">
                  <span className="text-white/50">{bar.label} <span className="text-white/20">({bar.weight})</span></span>
                  <span className="font-mono font-bold" style={{ color: bar.color }}>{val}</span>
                </div>
                <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${(val / 1000) * 100}%`, backgroundColor: bar.color }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Coming Soon Teaser */}
      <div className="mt-3 pt-3 border-t border-white/[0.06]">
        <div className="flex items-center gap-2 text-[10px] text-white/30">
          <TrendingUp className="w-3 h-3" />
          <span>$SCOUT Token Airdrop — Coming Soon</span>
        </div>
      </div>
    </Card>
  );
}
