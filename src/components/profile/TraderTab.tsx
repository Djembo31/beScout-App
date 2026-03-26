'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { ArrowRight, TrendingUp, TrendingDown, Briefcase } from 'lucide-react';
import { Card, Button } from '@/components/ui';
import { PlayerIdentity } from '@/components/player';
import { fmtScout, cn } from '@/lib/utils';
import { centsToBsd } from '@/lib/services/players';
import { formatScout } from '@/lib/services/wallet';
import { getRelativeTime } from '@/lib/activityHelpers';
import { useUserMasteryAll } from '@/lib/queries/mastery';
import { useWildcardBalance } from '@/lib/queries/events';
import { Sparkles } from 'lucide-react';
import ScoreProgress from './ScoreProgress';
import { useTranslations, useLocale } from 'next-intl';
import type { Pos, DbUserStats, UserTradeWithPlayer } from '@/types';
import type { HoldingRow } from '@/types';
import type { DbDpcMastery } from '@/lib/services/mastery';

// ============================================
// TYPES
// ============================================

interface TraderTabProps {
  userId: string;
  userStats: DbUserStats | null;
  holdings: HoldingRow[];
  recentTrades: UserTradeWithPlayer[];
  isSelf: boolean;
}

// ============================================
// HELPERS
// ============================================

/** Render mastery stars: ★ filled, ☆ empty, max 5 */
function MasteryStars({ level }: { level: number }) {
  const filled = Math.min(Math.max(level, 0), 5);
  const empty = 5 - filled;
  return (
    <span className="text-[11px] text-gold/80 tracking-tight" aria-label={`Mastery Level ${filled}`}>
      {'★'.repeat(filled)}{'☆'.repeat(empty)}
    </span>
  );
}

/** Compute win rate: trades where user sold at price > avg_buy_price of their holdings */
function computeWinRate(
  trades: UserTradeWithPlayer[],
  userId: string,
  holdingsMap: Map<string, number>,
): number {
  const sells = trades.filter(t => t.seller_id === userId);
  if (sells.length === 0) return 0;
  const wins = sells.filter(t => {
    const avgBuy = holdingsMap.get(t.player_id);
    return avgBuy !== undefined && t.price > avgBuy;
  });
  return Math.round((wins.length / sells.length) * 100);
}

// ============================================
// COMPONENT
// ============================================

export default function TraderTab({
  userId,
  userStats,
  holdings,
  recentTrades,
  isSelf,
}: TraderTabProps) {
  const tp = useTranslations('profile');
  const tg = useTranslations('gamification');
  const ta = useTranslations('activity');
  const locale = useLocale();

  const { data: masteryRows = [] } = useUserMasteryAll(userId);

  // Mastery lookup by player_id
  const masteryMap = useMemo(() => {
    const map = new Map<string, DbDpcMastery>();
    for (const m of masteryRows) {
      map.set(m.player_id, m);
    }
    return map;
  }, [masteryRows]);

  // Holdings avg buy price map for win rate
  const holdingsAvgMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const h of holdings) {
      map.set(h.player_id, h.avg_buy_price);
    }
    return map;
  }, [holdings]);

  // Portfolio calculations
  const portfolioValueCents = userStats?.portfolio_value_cents ?? 0;
  const portfolioCostCents = useMemo(
    () => holdings.reduce((sum, h) => sum + h.quantity * h.avg_buy_price, 0),
    [holdings],
  );
  const pnlCents = portfolioValueCents - portfolioCostCents;
  const totalDpcs = holdings.reduce((sum, h) => sum + h.quantity, 0);
  const winRate = useMemo(
    () => computeWinRate(recentTrades, userId, holdingsAvgMap),
    [recentTrades, userId, holdingsAvgMap],
  );

  // Top 5 holdings by value
  const topHoldings = useMemo(
    () =>
      holdings
        .slice()
        .sort((a, b) => b.quantity * b.player.floor_price - a.quantity * a.player.floor_price)
        .slice(0, 5),
    [holdings],
  );

  // Recent 5 trades
  const recentTradesSlice = useMemo(() => recentTrades.slice(0, 5), [recentTrades]);

  // Mastery summary — group by level
  const masterySummary = useMemo(() => {
    const grouped = new Map<number, number>();
    for (const m of masteryRows) {
      grouped.set(m.level, (grouped.get(m.level) ?? 0) + 1);
    }
    // Sort descending by level
    return Array.from(grouped.entries())
      .sort((a, b) => b[0] - a[0]);
  }, [masteryRows]);

  const isEmpty = holdings.length === 0 && recentTrades.length === 0;

  // ============================================
  // EMPTY STATE
  // ============================================
  if (isEmpty) {
    return (
      <div className="space-y-4">
        <ScoreProgress dimension="trader" score={userStats?.trading_score ?? 0} />
        <Card className="p-6 text-center">
          <Briefcase className="size-8 text-white/20 mx-auto mb-3" aria-hidden="true" />
          <div className="text-sm font-bold text-white/60">
            {isSelf ? tp('traderEmpty') : tp('traderEmptyPublic')}
          </div>
          {isSelf && (
            <>
              <div className="text-[13px] text-white/40 mt-1">{tp('traderEmptyDesc')}</div>
              <Link href="/market?tab=kaufen">
                <Button variant="gold" size="sm" className="mt-4">{tp('goToMarket')}</Button>
              </Link>
            </>
          )}
        </Card>
      </div>
    );
  }

  // ============================================
  // FULL STATE
  // ============================================
  return (
    <div className="space-y-4">
      {/* 1. Score Progress */}
      <ScoreProgress dimension="trader" score={userStats?.trading_score ?? 0} />

      {/* 2. Portfolio Overview — 2x3 stat grid */}
      <Card className="p-4 md:p-5">
        <h3 className="font-black text-sm mb-3">{tp('portfolioOverview')}</h3>
        <div className="grid grid-cols-3 gap-3">
          {/* Row 1: Portfolio Value, PnL (self only), DPC Count */}
          <StatCell
            label={tp('portfolioValue')}
            value={`${formatScout(portfolioValueCents)} bC`}
          />
          {isSelf ? (
            <StatCell
              label={tp('pnlLabel')}
              value={`${pnlCents >= 0 ? '+' : ''}${formatScout(pnlCents)}`}
              valueClassName={pnlCents >= 0 ? 'text-green-500' : 'text-red-400'}
              icon={pnlCents >= 0
                ? <TrendingUp className="size-3" aria-hidden="true" />
                : <TrendingDown className="size-3" aria-hidden="true" />
              }
            />
          ) : (
            <StatCell label={tp('pnlLabel')} value="—" valueClassName="text-white/20" />
          )}
          <StatCell
            label={tp('dpcCount')}
            value={totalDpcs.toLocaleString(locale === 'tr' ? 'tr-TR' : 'de-DE')}
          />

          {/* Row 2: Total Trades, Trading Volume, Win Rate */}
          <StatCell
            label={tp('totalTrades')}
            value={(userStats?.trades_count ?? 0).toLocaleString(locale === 'tr' ? 'tr-TR' : 'de-DE')}
          />
          <StatCell
            label={tp('tradingVolume')}
            value={`${formatScout(userStats?.trading_volume_cents ?? 0)}`}
          />
          <StatCell
            label={tp('winRate')}
            value={`${winRate}%`}
            valueClassName={winRate >= 50 ? 'text-green-500' : undefined}
          />
        </div>
      </Card>

      {/* 3. Top Holdings (5) */}
      {topHoldings.length > 0 && (
        <Card className="p-4 md:p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-black text-sm">{tp('topHoldings')}</h3>
            <Link href="/market" className="text-[11px] text-gold hover:text-gold/80 transition-colors">
              {tp('fullSquad')}
            </Link>
          </div>
          <div className="space-y-1">
            {topHoldings.map(h => {
              const mastery = masteryMap.get(h.player_id);
              const valueCents = h.quantity * h.player.floor_price;
              return (
                <Link
                  key={h.id}
                  href={`/player/${h.player_id}`}
                  className="flex items-center gap-3 py-2 px-1 rounded-lg hover:bg-surface-subtle transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <PlayerIdentity
                      player={{
                        first: h.player.first_name,
                        last: h.player.last_name,
                        pos: h.player.position as Pos,
                        status: 'fit',
                        club: h.player.club,
                        ticket: 0,
                        age: h.player.age,
                        imageUrl: h.player.image_url,
                      }}
                      size="sm"
                      showMeta={false}
                      showStatus={false}
                    />
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {mastery && <MasteryStars level={mastery.level} />}
                    <div className="text-right">
                      <div className="text-[13px] font-mono font-bold tabular-nums text-white/80">
                        {h.quantity}x
                      </div>
                      <div className="text-[11px] text-white/40 font-mono tabular-nums">
                        {fmtScout(centsToBsd(valueCents))}
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </Card>
      )}

      {/* 4. Recent Trades (5) */}
      {recentTradesSlice.length > 0 && (
        <Card className="p-4 md:p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-black text-sm">{tp('recentTradesLabel')}</h3>
            <Link href="#" className="text-[11px] text-gold hover:text-gold/80 transition-colors">
              {tp('allTrades')} <ArrowRight className="inline size-3" />
            </Link>
          </div>
          <div className="space-y-1">
            {recentTradesSlice.map(trade => {
              const isBuy = trade.buyer_id === userId;
              return (
                <Link
                  key={trade.id}
                  href={`/player/${trade.player_id}`}
                  className="flex items-center gap-3 py-2 px-1 hover:bg-white/[0.04] rounded-lg transition-colors"
                >
                  {/* BUY/SELL pill */}
                  <span
                    className={cn(
                      'text-[11px] font-bold px-2 py-0.5 rounded flex-shrink-0',
                      isBuy
                        ? 'bg-gold/15 text-gold'
                        : 'bg-green-500/15 text-green-500',
                    )}
                  >
                    {isBuy ? tp('tradeBuy') : tp('tradeSell')}
                  </span>

                  {/* Player name */}
                  <div className="flex-1 min-w-0">
                    <span className="text-[13px] truncate block">
                      {trade.player_first_name} {trade.player_last_name}
                    </span>
                  </div>

                  {/* Quantity + Price + Time */}
                  <div className="text-right flex-shrink-0">
                    <div className="text-[13px] font-mono font-bold tabular-nums">
                      {trade.quantity}x · {fmtScout(centsToBsd(trade.price * trade.quantity))}
                    </div>
                    <div className="text-[11px] text-white/30">
                      {getRelativeTime(trade.executed_at, ta('justNow'), locale)}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </Card>
      )}

      {/* 5. Wild Cards (own profile only) */}
      {isSelf && <WildCardsSection userId={userId} />}

      {/* 6. DPC Mastery Summary */}
      {masterySummary.length > 0 && (
        <Card className="p-4 md:p-5">
          <h3 className="font-black text-sm mb-3">{tp('dpcMasteryLabel')}</h3>
          <div className="space-y-2">
            {masterySummary.map(([level, count]) => (
              <div key={level} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MasteryStars level={level} />
                  <span className="text-[13px] text-white/60">
                    {tg(`mastery.level${level}`)}
                  </span>
                </div>
                <span className="text-[13px] font-mono font-bold tabular-nums text-white/80">
                  {count} SCs
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

// ============================================
// WILD CARDS SECTION
// ============================================

function WildCardsSection({ userId }: { userId: string }) {
  const t = useTranslations('profile');
  const { data: wcBalance } = useWildcardBalance(userId);

  if (wcBalance == null || wcBalance === 0) return null;

  return (
    <Card className="p-4 md:p-5">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="size-4 text-purple-400" aria-hidden="true" />
        <h3 className="font-black text-sm">{t('wildCards')}</h3>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-white/50">{t('wildCardBalance')}</span>
        <span className="font-mono font-bold tabular-nums text-lg text-purple-300">{wcBalance}</span>
      </div>
    </Card>
  );
}

// ============================================
// STAT CELL — reusable grid cell for Portfolio Overview
// ============================================

function StatCell({
  label,
  value,
  valueClassName,
  icon,
}: {
  label: string;
  value: string;
  valueClassName?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="p-2 rounded-lg bg-surface-subtle">
      <div className="text-[11px] text-white/40 mb-0.5">{label}</div>
      <div className={cn('text-[13px] font-mono font-bold tabular-nums flex items-center gap-0.5', valueClassName ?? 'text-white/80')}>
        {icon}
        {value}
      </div>
    </div>
  );
}
