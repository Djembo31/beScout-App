'use client';

import React, { useState, useEffect } from 'react';
import { DollarSign, Package, Vote, TrendingUp, ArrowRightLeft, Landmark, PiggyBank } from 'lucide-react';
import { Card, Skeleton } from '@/components/ui';
import { getClubDashboardStats, getClubTradingFees } from '@/lib/services/club';
import { getPlayersByClubId, centsToBsd } from '@/lib/services/players';
import { getAllVotes } from '@/lib/services/votes';
import { fmtBSD } from '@/lib/utils';
import { formatBsd } from '@/lib/services/wallet';
import type { ClubWithAdmin, ClubDashboardStats, DbClubVote } from '@/types';

export default function AdminRevenueTab({ club }: { club: ClubWithAdmin }) {
  const [stats, setStats] = useState<ClubDashboardStats | null>(null);
  const [votes, setVotes] = useState<DbClubVote[]>([]);
  const [totalVolume, setTotalVolume] = useState(0);
  const [tradingFees, setTradingFees] = useState<{ totalClubFee: number; totalPlatformFee: number; totalPbtFee: number; tradeCount: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const [s, p, v, fees] = await Promise.all([
          getClubDashboardStats(club.id),
          getPlayersByClubId(club.id),
          getAllVotes(club.id),
          getClubTradingFees(club.id),
        ]);
        if (!cancelled) {
          setStats(s);
          setTotalVolume(centsToBsd(p.reduce((sum, pl) => sum + pl.volume_24h, 0)));
          setVotes(v);
          setTradingFees(fees);
        }
      } catch (err) { console.error('[AdminRevenue] loadData:', err); }
      finally { if (!cancelled) setLoading(false); }
    }
    load();
    return () => { cancelled = true; };
  }, [club.id]);

  const voteRevenue = votes.reduce((sum, v) => sum + v.total_votes * v.cost_bsd, 0);
  const clubFeeRevenue = tradingFees?.totalClubFee ?? 0;
  const totalRevenue = (stats?.ipo_revenue_cents ?? 0) + voteRevenue + clubFeeRevenue;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-black">Einnahmen</h2>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="p-4 bg-gradient-to-br from-[#FFD700]/10 to-[#FFD700]/[0.02] border-[#FFD700]/20">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-5 h-5 text-[#FFD700]" />
            <span className="text-xs text-white/50">Gesamt</span>
          </div>
          {loading ? <Skeleton className="h-7 w-24" /> : (
            <div className="text-xl font-mono font-black text-[#FFD700]">{formatBsd(totalRevenue)} BSD</div>
          )}
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Package className="w-5 h-5 text-white/50" />
            <span className="text-xs text-white/50">DPC/IPO Umsatz</span>
          </div>
          {loading ? <Skeleton className="h-7 w-24" /> : (
            <div className="text-xl font-mono font-black">{formatBsd(stats?.ipo_revenue_cents ?? 0)} BSD</div>
          )}
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <ArrowRightLeft className="w-5 h-5 text-emerald-400" />
            <span className="text-xs text-white/50">Trading Gebühren</span>
          </div>
          {loading ? <Skeleton className="h-7 w-24" /> : (
            <div className="text-xl font-mono font-black text-emerald-400">{formatBsd(clubFeeRevenue)} BSD</div>
          )}
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Vote className="w-5 h-5 text-purple-400" />
            <span className="text-xs text-white/50">Vote Einnahmen</span>
          </div>
          {loading ? <Skeleton className="h-7 w-24" /> : (
            <div className="text-xl font-mono font-black text-purple-400">{formatBsd(voteRevenue)} BSD</div>
          )}
        </Card>
      </div>

      {/* Fee Breakdown */}
      <Card className="p-6">
        <h3 className="text-sm font-bold text-white/70 mb-4">Gebühren-Aufschlüsselung</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <Landmark className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <div className="text-[10px] text-white/40 uppercase tracking-wider">Club-Fee (1%)</div>
              {loading ? <Skeleton className="h-5 w-16" /> : (
                <div className="text-sm font-mono font-bold">{formatBsd(tradingFees?.totalClubFee ?? 0)} BSD</div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 flex items-center justify-center">
              <PiggyBank className="w-4 h-4 text-sky-400" />
            </div>
            <div>
              <div className="text-[10px] text-white/40 uppercase tracking-wider">PBT-Fee (1,5%)</div>
              {loading ? <Skeleton className="h-5 w-16" /> : (
                <div className="text-sm font-mono font-bold">{formatBsd(tradingFees?.totalPbtFee ?? 0)} BSD</div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-white/40" />
            </div>
            <div>
              <div className="text-[10px] text-white/40 uppercase tracking-wider">Plattform (3,5%)</div>
              {loading ? <Skeleton className="h-5 w-16" /> : (
                <div className="text-sm font-mono font-bold">{formatBsd(tradingFees?.totalPlatformFee ?? 0)} BSD</div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-white/40" />
            </div>
            <div>
              <div className="text-[10px] text-white/40 uppercase tracking-wider">Trading Vol. 24h</div>
              <div className="text-sm font-mono font-bold">{fmtBSD(totalVolume)} BSD</div>
            </div>
          </div>
        </div>
        {!loading && tradingFees && (
          <div className="mt-4 pt-3 border-t border-white/[0.06] text-xs text-white/30">
            Basierend auf {tradingFees.tradeCount} Trades. Gebührenstruktur: 6% gesamt (3,5% Plattform + 1,5% PBT + 1% Club).
          </div>
        )}
      </Card>
    </div>
  );
}
