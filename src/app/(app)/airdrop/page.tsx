'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Rocket, Trophy, ChevronLeft, TrendingUp, Users, Star } from 'lucide-react';
import { Card, Skeleton } from '@/components/ui';
import { cn, fmtScout } from '@/lib/utils';
import { useUser } from '@/components/providers/AuthProvider';
import { useAirdropLeaderboard, useAirdropStats } from '@/lib/queries';
import type { DbAirdropScore, AirdropTier } from '@/types';

// ── Tier Config (labels are static — Bronze/Gold/Diamond are brand names) ──
const TIER_STYLES: Record<AirdropTier, { color: string; bg: string; border: string }> = {
  bronze:  { color: '#CD7F32', bg: 'rgba(205,127,50,0.12)',  border: 'rgba(205,127,50,0.25)' },
  silver:  { color: '#C0C0C0', bg: 'rgba(192,192,192,0.12)', border: 'rgba(192,192,192,0.25)' },
  gold:    { color: '#FFD700', bg: 'rgba(255,215,0,0.12)',   border: 'rgba(255,215,0,0.25)' },
  diamond: { color: '#B9F2FF', bg: 'rgba(185,242,255,0.12)', border: 'rgba(185,242,255,0.25)' },
};

export default function AirdropPage() {
  const { user } = useUser();
  const uid = user?.id;

  const { data: leaderboard = [], isLoading } = useAirdropLeaderboard(100);
  const { data: stats } = useAirdropStats();
  const t = useTranslations('airdrop');

  const TIER_LABELS: Record<AirdropTier, string> = {
    bronze: 'Bronze', silver: t('tierSilver'), gold: 'Gold', diamond: 'Diamond',
  };

  const SCORE_TIPS = [
    { label: t('tipRank'), desc: t('tipRankDesc'), weight: '40%' },
    { label: t('tipMastery'), desc: t('tipMasteryDesc'), weight: '25%' },
    { label: t('tipDaily'), desc: t('tipDailyDesc'), weight: '20%' },
    { label: t('tipReferral'), desc: t('tipReferralDesc'), weight: '15%' },
  ];

  const myEntry = useMemo(() =>
    uid ? leaderboard.find(e => e.user_id === uid) : null,
    [leaderboard, uid]
  );

  return (
    <div className="max-w-[900px] mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/" className="p-2 rounded-xl hover:bg-white/5 transition-colors">
          <ChevronLeft className="size-5 text-white/40" />
        </Link>
        <div>
          <h1 className="text-2xl font-black text-balance flex items-center gap-2">
            <Rocket className="size-6 text-purple-400" aria-hidden="true" />
            {t('title')}
          </h1>
          <p className="text-xs text-white/40 mt-0.5 text-pretty">{t('subtitle')}</p>
        </div>
      </div>

      {/* Stats Bar */}
      {stats && stats.total_users > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <div className="bg-surface-subtle border border-white/[0.06] rounded-xl p-3 text-center">
            <div className="text-lg font-mono font-black tabular-nums text-white">{stats.total_users}</div>
            <div className="text-[10px] text-white/40">{t('participants')}</div>
          </div>
          <div className="bg-surface-subtle border border-white/[0.06] rounded-xl p-3 text-center">
            <div className="text-lg font-mono font-black tabular-nums text-white">{Math.round(stats.avg_score)}</div>
            <div className="text-[10px] text-white/40">{t('avgScore')}</div>
          </div>
          <div className="bg-surface-subtle border border-white/[0.06] rounded-xl p-3 text-center">
            <div className="text-lg font-mono font-black tabular-nums" style={{ color: '#FFD700' }}>{stats.tier_distribution.gold}</div>
            <div className="text-[10px] text-white/40">Gold Tier</div>
          </div>
          <div className="bg-surface-subtle border border-white/[0.06] rounded-xl p-3 text-center">
            <div className="text-lg font-mono font-black tabular-nums" style={{ color: '#B9F2FF' }}>{stats.tier_distribution.diamond}</div>
            <div className="text-[10px] text-white/40">Diamond Tier</div>
          </div>
        </div>
      ) : (
        <Card className="p-5 text-center bg-purple-500/[0.06] border-purple-500/20">
          <Rocket className="size-8 mx-auto mb-2 text-purple-400" />
          <div className="font-bold text-sm">{t('comingSoon')}</div>
          <div className="text-xs text-white/40 mt-1">{t('collectPoints')}</div>
        </Card>
      )}

      {/* My Score Highlight */}
      {myEntry && (
        <Card className="p-4 bg-purple-500/[0.06] border-purple-500/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="size-12 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: TIER_STYLES[myEntry.tier].bg, border: `1px solid ${TIER_STYLES[myEntry.tier].border}` }}
              >
                <Rocket className="size-6" style={{ color: TIER_STYLES[myEntry.tier].color }} />
              </div>
              <div>
                <div className="text-xs text-white/50">{t('yourRank')}</div>
                <div className="text-2xl font-mono font-black tabular-nums" style={{ color: TIER_STYLES[myEntry.tier].color }}>
                  #{myEntry.rank}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-white/50">{t('score')}</div>
              <div className="text-2xl font-mono font-black tabular-nums" style={{ color: TIER_STYLES[myEntry.tier].color }}>
                {myEntry.total_score}
              </div>
              <span
                className="px-2 py-0.5 rounded-lg text-[10px] font-black"
                style={{ backgroundColor: TIER_STYLES[myEntry.tier].bg, color: TIER_STYLES[myEntry.tier].color, border: `1px solid ${TIER_STYLES[myEntry.tier].border}` }}
              >
                {TIER_LABELS[myEntry.tier]}
              </span>
            </div>
          </div>
        </Card>
      )}

      {/* Leaderboard */}
      <Card className="overflow-hidden">
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <h2 className="font-bold text-balance flex items-center gap-2">
            <Trophy className="size-4 text-gold" aria-hidden="true" />
            {t('top100')}
          </h2>
          <div className="text-sm tabular-nums text-white/40">{leaderboard.length} {t('scouts')}</div>
        </div>

        {isLoading ? (
          <div className="p-4 space-y-2">
            {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}
          </div>
        ) : leaderboard.length === 0 ? (
          <div className="text-center py-12 text-white/40">
            <Rocket className="size-10 mx-auto mb-3 text-white/20" />
            <div className="text-sm">{t('noData')}</div>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {leaderboard.map((entry) => {
              const isMe = entry.user_id === uid;
              const tier = TIER_STYLES[entry.tier];
              const r = entry.rank ?? 999;
              const rankColor = r === 1 ? 'text-gold' : r === 2 ? 'text-zinc-300' : r === 3 ? 'text-amber-600' : 'text-white/50';
              return (
                <Link key={entry.user_id} href={`/profile/${entry.handle}`}>
                  <div className={cn(
                    'flex items-center gap-3 px-4 py-3 hover:bg-surface-minimal transition-colors',
                    isMe && 'bg-purple-500/[0.06]'
                  )}>
                    <span className={cn('w-8 text-center font-mono font-bold tabular-nums text-sm', rankColor)}>
                      {(entry.rank ?? 0) <= 3 ? <Trophy className={cn('size-4 inline', rankColor)} /> : `#${entry.rank}`}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={cn('text-sm font-semibold truncate', isMe && 'text-purple-300')}>
                          {entry.display_name || `@${entry.handle}`}
                        </span>
                        {isMe && <span className="text-[10px] text-purple-400/60">({t('you')})</span>}
                        <span
                          className="px-1.5 py-0.5 rounded text-[9px] font-black"
                          style={{ backgroundColor: tier.bg, color: tier.color, border: `1px solid ${tier.border}` }}
                        >
                          {TIER_LABELS[entry.tier]}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {entry.founding_multiplier > 1 && (
                        <span className="px-1 py-0.5 rounded text-[9px] font-black bg-gold/15 text-gold border border-gold/25">
                          {entry.founding_multiplier}x
                        </span>
                      )}
                      <span className="font-mono font-bold tabular-nums text-sm" style={{ color: tier.color }}>
                        {entry.total_score}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </Card>

      {/* How to improve */}
      <Card className="p-4">
        <h3 className="font-bold text-balance flex items-center gap-2 mb-3">
          <TrendingUp className="size-4 text-green-500" aria-hidden="true" />
          {t('howToImprove')}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {SCORE_TIPS.map(tip => (
            <div key={tip.label} className="flex items-start gap-3 p-3 bg-surface-minimal rounded-xl border border-white/[0.06]">
              <Star className="size-4 text-gold mt-0.5 shrink-0" />
              <div>
                <div className="text-sm font-bold">{tip.label} <span className="text-white/20 font-normal">({tip.weight})</span></div>
                <div className="text-[10px] text-white/40">{tip.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
