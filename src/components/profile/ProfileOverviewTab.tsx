'use client';

import React from 'react';
import Link from 'next/link';
import { TrendingUp, TrendingDown, Sparkles, Trophy, Target, ArrowRight } from 'lucide-react';
import { Card, Button } from '@/components/ui';
import { PlayerIdentity } from '@/components/player';
import { fmtScout, cn } from '@/lib/utils';
import { centsToBsd } from '@/lib/services/players';
import { formatScout } from '@/lib/services/wallet';
import { getAchievementDef } from '@/lib/achievements';
import { getRelativeTime } from '@/lib/activityHelpers';
import dynamic from 'next/dynamic';
import type { Pos, DbUserAchievement, DbTransaction, UserTradeWithPlayer, UserFantasyResult, ResearchPostWithAuthor, AuthorTrackRecord } from '@/types';
import { useTranslations, useLocale } from 'next-intl';

const MissionBanner = dynamic(() => import('@/components/missions/MissionBanner'), { ssr: false });

// ============================================
// TYPES
// ============================================

export type HoldingRow = {
  id: string;
  player_id: string;
  quantity: number;
  avg_buy_price: number; // cents
  player: {
    first_name: string;
    last_name: string;
    position: string;
    club: string;
    floor_price: number; // cents
    price_change_24h: number;
    shirt_number: number;
    age: number;
    perf_l5: number;
    matches: number;
    goals: number;
    assists: number;
    image_url: string | null;
  };
};

interface ProfileOverviewTabProps {
  holdings: HoldingRow[];
  recentTrades: UserTradeWithPlayer[];
  fantasyResults: UserFantasyResult[];
  achievements: DbUserAchievement[];
  portfolioValueCents: number;
  portfolioCostCents: number;
  totalDpcs: number;
  userId: string | undefined;
  transactions?: DbTransaction[];
  myResearch?: ResearchPostWithAuthor[];
  trackRecord?: AuthorTrackRecord | null;
  isSelf?: boolean;
}

// ============================================
// COMPONENT
// ============================================

export default function ProfileOverviewTab({
  holdings,
  recentTrades,
  fantasyResults,
  achievements,
  portfolioValueCents,
  portfolioCostCents,
  totalDpcs,
  userId,
  transactions = [],
  isSelf = false,
}: ProfileOverviewTabProps) {
  const tp = useTranslations('profile');
  const tg = useTranslations('gamification');
  const ta = useTranslations('activity');
  const locale = useLocale();
  const pnlCents = portfolioValueCents - portfolioCostCents;

  // Compute "next action" state
  const hasHoldings = holdings.length > 0;

  // Recent 5 transactions for compact activity
  const recentActivity = transactions.slice(0, 5);

  // Last 3 unlocked achievements
  const recentAchievements = achievements
    .slice()
    .sort((a, b) => new Date(b.unlocked_at).getTime() - new Date(a.unlocked_at).getTime())
    .slice(0, 3)
    .map(a => ({ ...a, def: getAchievementDef(a.achievement_key) }))
    .filter(a => a.def);

  return (
    <div className="space-y-4">
      {/* 1. Adaptive "Next Action" Card */}
      {isSelf && !hasHoldings && (
        <Card className="p-5 border-gold/20 bg-gold/[0.03]">
          <div className="flex items-start gap-3">
            <Sparkles className="size-5 text-gold flex-shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <div className="font-bold text-sm">{tp('nextActionBuy')}</div>
              <div className="text-[13px] text-white/50 mt-1">{tp('overviewWelcomeDesc')}</div>
              <Link href="/market?tab=kaufen">
                <Button variant="gold" size="sm" className="mt-3">{tp('overviewStartNow')}</Button>
              </Link>
            </div>
          </div>
        </Card>
      )}

      {/* 2. MissionBanner — finally visible! */}
      {isSelf && <MissionBanner />}

      {/* 3. Portfolio Pulse — compact value + change + top 3 */}
      {(isSelf || portfolioValueCents > 0) && (
        <Card className="p-4 md:p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-black text-sm">{tp('portfolioPulse')}</h3>
            <Link href="#" onClick={(e) => { e.preventDefault(); }} className="text-[11px] text-gold hover:text-gold/80 transition-colors">
              {tp('squad')} <ArrowRight className="inline size-3" />
            </Link>
          </div>
          <div className="flex items-baseline gap-3 mb-3">
            <span className="text-xl font-mono font-black text-gold">
              {formatScout(portfolioValueCents)} bCredits
            </span>
            {isSelf && (
              <span className={cn('text-sm font-mono font-bold flex items-center gap-0.5', pnlCents >= 0 ? 'text-green-500' : 'text-red-400')}>
                {pnlCents >= 0 ? <TrendingUp className="size-3" aria-hidden="true" /> : <TrendingDown className="size-3" aria-hidden="true" />}
                {pnlCents >= 0 ? '+' : ''}{formatScout(pnlCents)}
              </span>
            )}
          </div>
          {/* Top 3 Holdings compact */}
          {holdings.length > 0 && (
            <div className="flex gap-2 overflow-x-auto scrollbar-hide">
              {holdings
                .slice()
                .sort((a, b) => (b.quantity * b.player.floor_price) - (a.quantity * a.player.floor_price))
                .slice(0, 3)
                .map((h) => (
                  <Link key={h.id} href={`/player/${h.player_id}`} className="flex-shrink-0">
                    <div className="px-3 py-2 bg-white/[0.03] rounded-lg border border-white/[0.06] hover:border-white/10 transition-colors">
                      <div className="flex items-center gap-2">
                        <PlayerIdentity
                          player={{ first: h.player.first_name, last: h.player.last_name, pos: h.player.position as Pos, status: 'fit', club: h.player.club, ticket: 0, age: 0, imageUrl: h.player.image_url }}
                          size="sm" showMeta={false} showStatus={false}
                        />
                      </div>
                      <div className="text-[11px] text-white/40 mt-1">{h.quantity}x · {fmtScout(centsToBsd(h.quantity * h.player.floor_price))}</div>
                    </div>
                  </Link>
                ))}
            </div>
          )}
        </Card>
      )}

      {/* 4. Recent Activity — 5 items compact */}
      {recentActivity.length > 0 && (
        <Card className="p-4 md:p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-black text-sm">{tp('recentActivity')}</h3>
            <button
              onClick={() => {/* Switch to activity tab handled by parent */}}
              className="text-[11px] text-gold hover:text-gold/80 transition-colors"
            >
              {tp('viewAllActivity')} <ArrowRight className="inline size-3" />
            </button>
          </div>
          <div className="space-y-1">
            {recentActivity.map((tx) => {
              const isBuy = tx.type === 'buy' || tx.type === 'ipo_buy';
              const isSell = tx.type === 'sell';
              const isReward = tx.type.includes('reward') || tx.type.includes('earning');
              return (
                <div key={tx.id} className="flex items-center gap-3 py-2 px-1">
                  <div className={cn(
                    'size-6 rounded flex items-center justify-center flex-shrink-0',
                    isBuy ? 'bg-gold/10 text-gold' : isSell ? 'bg-green-500/10 text-green-500' : isReward ? 'bg-emerald-500/10 text-emerald-500' : 'bg-white/5 text-white/30'
                  )}>
                    {isReward ? <Trophy className="size-3" aria-hidden="true" /> : <Target className="size-3" aria-hidden="true" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[13px] truncate block">{ta(tx.type)}</span>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className={cn('text-[13px] font-mono font-bold', tx.amount > 0 ? 'text-green-500' : 'text-white/60')}>
                      {tx.amount > 0 ? '+' : ''}{fmtScout(centsToBsd(tx.amount))}
                    </span>
                    <div className="text-[11px] text-white/30">{getRelativeTime(tx.created_at, ta('justNow'), locale)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* 5. Achievement Highlights — 3 most recent */}
      {recentAchievements.length > 0 && (
        <Card className="p-4 md:p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-black text-sm">{tp('achievementHighlights')}</h3>
            <span className="text-[11px] text-white/40">
              {tp('viewAllAchievements', { count: achievements.length })}
            </span>
          </div>
          <div className="flex gap-3">
            {recentAchievements.map(({ achievement_key, def }) => def && (
              <div key={achievement_key} className="flex-1 p-3 bg-white/[0.03] rounded-xl border border-white/[0.06] text-center">
                <div className="text-xl mb-1">{def.icon}</div>
                <div className="text-[11px] font-bold">{tg(`achievement.${def.key}`)}</div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
