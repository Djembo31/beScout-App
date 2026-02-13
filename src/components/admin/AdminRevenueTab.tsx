'use client';

import React, { useState, useEffect } from 'react';
import { DollarSign, Package, Vote, TrendingUp } from 'lucide-react';
import { Card, Skeleton } from '@/components/ui';
import { getClubDashboardStats } from '@/lib/services/club';
import { getPlayersByClubId, centsToBsd } from '@/lib/services/players';
import { getAllVotes } from '@/lib/services/votes';
import { fmtBSD } from '@/lib/utils';
import { formatBsd } from '@/lib/services/wallet';
import type { ClubWithAdmin, ClubDashboardStats, DbClubVote } from '@/types';

export default function AdminRevenueTab({ club }: { club: ClubWithAdmin }) {
  const [stats, setStats] = useState<ClubDashboardStats | null>(null);
  const [votes, setVotes] = useState<DbClubVote[]>([]);
  const [totalVolume, setTotalVolume] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const [s, p, v] = await Promise.all([
          getClubDashboardStats(club.id),
          getPlayersByClubId(club.id),
          getAllVotes(club.id),
        ]);
        if (!cancelled) {
          setStats(s);
          setTotalVolume(centsToBsd(p.reduce((sum, pl) => sum + pl.volume_24h, 0)));
          setVotes(v);
        }
      } catch {}
      finally { if (!cancelled) setLoading(false); }
    }
    load();
    return () => { cancelled = true; };
  }, [club.id]);

  const voteRevenue = votes.reduce((sum, v) => sum + v.total_votes * v.cost_bsd, 0);
  const totalRevenue = (stats?.ipo_revenue_cents ?? 0) + voteRevenue;

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
            <Vote className="w-5 h-5 text-purple-400" />
            <span className="text-xs text-white/50">Vote Einnahmen</span>
          </div>
          {loading ? <Skeleton className="h-7 w-24" /> : (
            <div className="text-xl font-mono font-black text-purple-400">{formatBsd(voteRevenue)} BSD</div>
          )}
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-white/50" />
            <span className="text-xs text-white/50">Trading Vol. 24h</span>
          </div>
          <div className="text-xl font-mono font-black">{fmtBSD(totalVolume)} BSD</div>
        </Card>
      </div>

      <Card className="p-6">
        <div className="text-white/50 text-sm">
          Detaillierte Einnahmen-Aufschlüsselung und Auszahlungen werden in Phase 7 freigeschaltet.
        </div>
      </Card>
    </div>
  );
}
