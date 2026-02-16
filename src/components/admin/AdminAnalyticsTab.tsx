'use client';

import React, { useState, useEffect } from 'react';
import { Users, Activity, TrendingUp, UserCheck } from 'lucide-react';
import { Card, Skeleton } from '@/components/ui';
import { getClubFanAnalytics, getClubFollowerCount } from '@/lib/services/club';
import { formatBsd } from '@/lib/services/wallet';
import type { ClubWithAdmin } from '@/types';

const ACTION_LABELS: Record<string, string> = {
  trade_buy: 'Käufe',
  trade_sell: 'Verkäufe',
  ipo_buy: 'IPO-Käufe',
  offer_created: 'Angebote',
  offer_accepted: 'Angenommene Angebote',
};

export default function AdminAnalyticsTab({ club }: { club: ClubWithAdmin }) {
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
      <h2 className="text-xl font-black">Fan-Analyse</h2>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="p-4 bg-gradient-to-br from-sky-500/10 to-sky-500/[0.02] border-sky-500/20">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-5 h-5 text-sky-400" />
            <span className="text-xs text-white/50">Follower</span>
          </div>
          {loading ? <Skeleton className="h-7 w-16" /> : (
            <div className="text-xl font-mono font-black text-sky-400">{data?.totalFollowers ?? 0}</div>
          )}
        </Card>
        <Card className="p-4 bg-gradient-to-br from-[#22C55E]/10 to-[#22C55E]/[0.02] border-[#22C55E]/20">
          <div className="flex items-center gap-2 mb-2">
            <UserCheck className="w-5 h-5 text-[#22C55E]" />
            <span className="text-xs text-white/50">Aktive Fans (7d)</span>
          </div>
          {loading ? <Skeleton className="h-7 w-16" /> : (
            <div className="text-xl font-mono font-black text-[#22C55E]">{data?.activeFans7d ?? 0}</div>
          )}
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-5 h-5 text-amber-400" />
            <span className="text-xs text-white/50">Aktive Fans (30d)</span>
          </div>
          {loading ? <Skeleton className="h-7 w-16" /> : (
            <div className="text-xl font-mono font-black">{data?.activeFans30d ?? 0}</div>
          )}
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-[#FFD700]" />
            <span className="text-xs text-white/50">Gesamtes Volume</span>
          </div>
          {loading ? <Skeleton className="h-7 w-16" /> : (
            <div className="text-xl font-mono font-black text-[#FFD700]">
              {formatBsd(data?.topFans.reduce((s, f) => s + f.volume_cents, 0) ?? 0)} BSD
            </div>
          )}
        </Card>
      </div>

      {/* Top Fans */}
      <Card className="p-6">
        <h3 className="text-sm font-bold text-white/70 mb-4">Top 10 Fans (nach Trading-Volumen, 30 Tage)</h3>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full rounded-xl" />)}
          </div>
        ) : !data?.topFans.length ? (
          <div className="text-center py-6 text-sm text-white/30">Noch keine Trading-Aktivität.</div>
        ) : (
          <div className="space-y-1">
            {/* Header */}
            <div className="grid grid-cols-12 gap-2 px-3 py-1 text-[10px] text-white/30 uppercase tracking-wider">
              <div className="col-span-1">#</div>
              <div className="col-span-5">Fan</div>
              <div className="col-span-3 text-right">Trades</div>
              <div className="col-span-3 text-right">Volumen</div>
            </div>
            {data.topFans.map((fan, idx) => (
              <div key={fan.user_id} className="grid grid-cols-12 gap-2 items-center px-3 py-2.5 bg-white/[0.02] rounded-xl border border-white/[0.04] hover:bg-white/[0.04] transition-colors">
                <div className="col-span-1 text-sm font-mono text-white/40">{idx + 1}</div>
                <div className="col-span-5">
                  <div className="text-sm font-semibold truncate">
                    {fan.display_name ?? `@${fan.handle}`}
                  </div>
                  {fan.display_name && (
                    <div className="text-[10px] text-white/30">@{fan.handle}</div>
                  )}
                </div>
                <div className="col-span-3 text-right text-sm font-mono">{fan.trade_count}</div>
                <div className="col-span-3 text-right text-sm font-mono text-[#FFD700]">{formatBsd(fan.volume_cents)}</div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Engagement Breakdown */}
      <Card className="p-6">
        <h3 className="text-sm font-bold text-white/70 mb-4">Engagement-Verteilung (30 Tage)</h3>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-8 w-full rounded-xl" />)}
          </div>
        ) : !data?.engagementByType.length ? (
          <div className="text-center py-6 text-sm text-white/30">Noch keine Engagement-Daten.</div>
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
                      className="h-full bg-gradient-to-r from-[#FFD700]/60 to-[#FFD700] rounded-full transition-all"
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
