'use client';

import React, { useState, useEffect } from 'react';
import { Sparkles, Loader2, Play, Megaphone } from 'lucide-react';
import { Card, Button } from '@/components/ui';
import { fmtScout } from '@/lib/utils';
import { centsToBsd } from '@/lib/services/players';
import { triggerCreatorFundPayout, getCreatorFundStats } from '@/lib/services/creatorFund';
import { triggerAdRevenuePayout, getAdRevenueStats } from '@/lib/services/adRevenueShare';
import type { DbCreatorFundPayout } from '@/types';

interface Props {
  adminId: string;
}

export function AdminCreatorFundTab({ adminId }: Props) {
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState<'fund' | 'ad' | null>(null);
  const [stats, setStats] = useState<{ totalPaid: number; payoutCount: number; recentPayouts: DbCreatorFundPayout[] } | null>(null);
  const [adStats, setAdStats] = useState<{ totalPaid: number; payoutCount: number } | null>(null);
  const [result, setResult] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getCreatorFundStats(), getAdRevenueStats()]).then(([cf, ad]) => {
      setStats(cf);
      setAdStats(ad);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handlePayout = async (type: 'fund' | 'ad') => {
    setPaying(type);
    setResult(null);

    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 7);
    const startStr = start.toISOString().split('T')[0];
    const endStr = end.toISOString().split('T')[0];

    if (type === 'fund') {
      const res = await triggerCreatorFundPayout(adminId, startStr, endStr);
      if (res.success) {
        setResult(`Creator Fund: ${res.paid_count ?? 0} Creators bezahlt, ${fmtScout(centsToBsd(res.total_paid_cents ?? 0))} $SCOUT ausgezahlt`);
      } else {
        setResult(`Fehler: ${res.error}`);
      }
    } else {
      const res = await triggerAdRevenuePayout(adminId, startStr, endStr);
      if (res.success) {
        setResult(`Werbeanteil: ${res.paid_count ?? 0} Creators bezahlt, ${fmtScout(centsToBsd(res.total_paid_cents ?? 0))} $SCOUT ausgezahlt`);
      } else {
        setResult(`Fehler: ${res.error}`);
      }
    }
    setPaying(null);

    // Refresh stats
    Promise.all([getCreatorFundStats(), getAdRevenueStats()]).then(([cf, ad]) => {
      setStats(cf);
      setAdStats(ad);
    });
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-white/30" /></div>;

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="p-4">
          <div className="text-xs text-white/40 mb-1">Creator Fund Ausgezahlt</div>
          <div className="text-lg font-mono font-black text-cyan-400">{fmtScout(centsToBsd(stats?.totalPaid ?? 0))} $SCOUT</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-white/40 mb-1">Creator Fund Payouts</div>
          <div className="text-lg font-mono font-black text-white">{stats?.payoutCount ?? 0}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-white/40 mb-1">Werbeanteil Ausgezahlt</div>
          <div className="text-lg font-mono font-black text-lime-400">{fmtScout(centsToBsd(adStats?.totalPaid ?? 0))} $SCOUT</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-white/40 mb-1">Werbeanteil Payouts</div>
          <div className="text-lg font-mono font-black text-white">{adStats?.payoutCount ?? 0}</div>
        </Card>
      </div>

      {/* Actions */}
      <Card className="p-4">
        <h3 className="font-black mb-3 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          Auszahlungen auslÃ¶sen (letzte 7 Tage)
        </h3>
        <div className="flex gap-3">
          <Button
            variant="gold"
            size="sm"
            disabled={paying !== null}
            onClick={() => handlePayout('fund')}
          >
            {paying === 'fund' ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Play className="w-3 h-3 mr-1" />}
            Creator Fund Auszahlen
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={paying !== null}
            onClick={() => handlePayout('ad')}
          >
            {paying === 'ad' ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Megaphone className="w-3 h-3 mr-1" />}
            Werbeanteil Auszahlen
          </Button>
        </div>
        {result && (
          <div className="mt-3 text-sm text-white/70 bg-white/[0.03] rounded-lg px-3 py-2 border border-white/[0.06]">
            {result}
          </div>
        )}
      </Card>

      {/* Recent Payouts */}
      {stats && stats.recentPayouts.length > 0 && (
        <Card className="p-4">
          <h3 className="font-black mb-3">Letzte Auszahlungen</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-white/40 border-b border-white/10">
                  <th className="text-left py-2 px-2">Typ</th>
                  <th className="text-left py-2 px-2">Zeitraum</th>
                  <th className="text-right py-2 px-2">Impressions</th>
                  <th className="text-right py-2 px-2">Anteil</th>
                  <th className="text-right py-2 px-2">Betrag</th>
                  <th className="text-left py-2 px-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentPayouts.map(p => (
                  <tr key={p.id} className="border-b border-white/[0.04]">
                    <td className="py-1.5 px-2 text-white">
                      {p.payout_type === 'creator_fund' ? (
                        <span className="text-cyan-400">Creator Fund</span>
                      ) : (
                        <span className="text-lime-400">Werbeanteil</span>
                      )}
                    </td>
                    <td className="py-1.5 px-2 text-white/60">{p.period_start} â€” {p.period_end}</td>
                    <td className="py-1.5 px-2 text-right font-mono text-white/60">{p.impression_count}</td>
                    <td className="py-1.5 px-2 text-right font-mono text-white/60">{p.impression_share_pct.toFixed(1)}%</td>
                    <td className="py-1.5 px-2 text-right font-mono text-[#22C55E] font-bold">{fmtScout(centsToBsd(p.payout_cents))} $SCOUT</td>
                    <td className="py-1.5 px-2">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                        p.status === 'paid' ? 'bg-green-500/20 text-green-400' :
                        p.status === 'rolled_over' ? 'bg-amber-500/20 text-amber-400' :
                        'bg-white/10 text-white/40'
                      }`}>
                        {p.status === 'paid' ? 'Bezahlt' : p.status === 'rolled_over' ? 'Ãœbertragen' : 'Ausstehend'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
