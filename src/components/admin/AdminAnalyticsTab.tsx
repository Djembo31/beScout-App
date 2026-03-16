'use client';

import React, { useState, useEffect } from 'react';
import { Users, Activity, TrendingUp, UserCheck, Download } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Card, Skeleton, Button } from '@/components/ui';
import { getClubFanAnalytics, getClubFollowerCount } from '@/lib/services/club';
import { formatScout } from '@/lib/services/wallet';
import { downloadCsv } from '@/lib/utils';
import type { ClubWithAdmin } from '@/types';

export default function AdminAnalyticsTab({ club }: { club: ClubWithAdmin }) {
  const t = useTranslations('admin');

  const ACTION_LABELS: Record<string, string> = {
    trade_buy: t('actionBuy'),
    trade_sell: t('actionSell'),
    ipo_buy: t('actionIpoBuy'),
    offer_created: t('actionOfferCreated'),
    offer_accepted: t('actionOfferAccepted'),
  };
  const [data, setData] = useState<{
    activeFans7d: number;
    activeFans30d: number;
    totalFollowers: number;
    topFans: { user_id: string; handle: string; display_name: string | null; trade_count: number; volume_cents: number }[];
    engagementByType: { type: string; count: number }[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const analytics = await getClubFanAnalytics(club.id);
        if (!cancelled) setData(analytics);
      } catch (err) {
        console.error('[AdminAnalytics] Load failed:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [club.id]);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-black text-balance">{t('fanAnalysis')}</h2>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="p-4 bg-sky-500/[0.06] border-sky-500/20">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-5 h-5 text-sky-400" />
            <span className="text-xs text-white/50">{t('follower')}</span>
          </div>
          {loading ? <Skeleton className="h-7 w-16" /> : (
            <div className="text-xl font-mono font-black tabular-nums text-sky-400">{data?.totalFollowers ?? 0}</div>
          )}
        </Card>
        <Card className="p-4 bg-green-500/[0.06] border-green-500/20">
          <div className="flex items-center gap-2 mb-2">
            <UserCheck className="w-5 h-5 text-green-500" />
            <span className="text-xs text-white/50">{t('activeFans7d')}</span>
          </div>
          {loading ? <Skeleton className="h-7 w-16" /> : (
            <div className="text-xl font-mono font-black tabular-nums text-green-500">{data?.activeFans7d ?? 0}</div>
          )}
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-5 h-5 text-amber-400" />
            <span className="text-xs text-white/50">{t('activeFans30d')}</span>
          </div>
          {loading ? <Skeleton className="h-7 w-16" /> : (
            <div className="text-xl font-mono font-black tabular-nums">{data?.activeFans30d ?? 0}</div>
          )}
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-gold" />
            <span className="text-xs text-white/50">{t('totalVolume')}</span>
          </div>
          {loading ? <Skeleton className="h-7 w-16" /> : (
            <div className="text-xl font-mono font-black tabular-nums text-gold">
              {formatScout(data?.topFans.reduce((s, f) => s + f.volume_cents, 0) ?? 0)} CR
            </div>
          )}
        </Card>
      </div>

      {/* Top Fans */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-white/70">{t('topFansTrading')}</h3>
          {data?.topFans && data.topFans.length > 0 && (
            <Button variant="ghost" size="sm" aria-label={t('exportCsv')} onClick={() => downloadCsv(
              data.topFans.map(f => ({ Handle: f.handle, Name: f.display_name ?? '', Trades: f.trade_count, 'Volume (Credits)': formatScout(f.volume_cents) })),
              `top-fans-${new Date().toISOString().slice(0, 10)}.csv`,
            )}>
              <Download className="size-3.5 mr-1" aria-hidden="true" />
              CSV
            </Button>
          )}
        </div>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full rounded-xl" />)}
          </div>
        ) : !data?.topFans.length ? (
          <div className="text-center py-6 text-sm text-white/30">{t('noTradingActivity')}</div>
        ) : (
          <div className="space-y-1">
            {/* Header */}
            <div className="grid grid-cols-12 gap-2 px-3 py-1 text-[10px] text-white/30 uppercase">
              <div className="col-span-1">#</div>
              <div className="col-span-5">Fan</div>
              <div className="col-span-3 text-right">{t('trades')}</div>
              <div className="col-span-3 text-right">{t('volume')}</div>
            </div>
            {data.topFans.map((fan, idx) => (
              <div key={fan.user_id} className="grid grid-cols-12 gap-2 items-center px-3 py-2.5 bg-surface-minimal rounded-xl border border-white/[0.04] hover:bg-white/[0.04] transition-colors">
                <div className="col-span-1 text-sm font-mono tabular-nums text-white/40">{idx + 1}</div>
                <div className="col-span-5">
                  <div className="text-sm font-semibold truncate">
                    {fan.display_name ?? `@${fan.handle}`}
                  </div>
                  {fan.display_name && (
                    <div className="text-[10px] text-white/30">@{fan.handle}</div>
                  )}
                </div>
                <div className="col-span-3 text-right text-sm font-mono tabular-nums">{fan.trade_count}</div>
                <div className="col-span-3 text-right text-sm font-mono tabular-nums text-gold">{formatScout(fan.volume_cents)}</div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Engagement Breakdown */}
      <Card className="p-6">
        <h3 className="text-sm font-bold text-white/70 mb-4">{t('engagementBreakdown')}</h3>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-8 w-full rounded-xl" />)}
          </div>
        ) : !data?.engagementByType.length ? (
          <div className="text-center py-6 text-sm text-white/30">{t('noEngagementData')}</div>
        ) : (
          <div className="space-y-3">
            {data.engagementByType.map(item => {
              const maxCount = Math.max(...data.engagementByType.map(e => e.count));
              const pct = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
              return (
                <div key={item.type}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-white/60">{ACTION_LABELS[item.type] ?? item.type}</span>
                    <span className="font-mono text-white/80">{item.count}</span>
                  </div>
                  <div className="w-full h-2 bg-white/[0.04] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gold rounded-full transition-colors"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
