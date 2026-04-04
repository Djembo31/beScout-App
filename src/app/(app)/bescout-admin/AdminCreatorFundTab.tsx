'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Sparkles, Loader2, Play, Megaphone } from 'lucide-react';
import { Card, Button } from '@/components/ui';
import { cn, fmtScout } from '@/lib/utils';
import { centsToBsd } from '@/lib/services/players';
import { triggerCreatorFundPayout, getCreatorFundStats } from '@/lib/services/creatorFund';
import { triggerAdRevenuePayout, getAdRevenueStats } from '@/lib/services/adRevenueShare';
import type { DbCreatorFundPayout } from '@/types';

interface Props {
  adminId: string;
}

export function AdminCreatorFundTab({ adminId }: Props) {
  const t = useTranslations('bescoutAdmin');
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
    }).catch((e) => { console.error('[AdminCreatorFundTab] Load failed:', e); setLoading(false); });
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
        setResult(t('cfPayoutResult', { count: res.paid_count ?? 0, amount: fmtScout(centsToBsd(res.total_paid_cents ?? 0)) }));
      } else {
        setResult(t('payoutError', { error: res.error ?? '' }));
      }
    } else {
      const res = await triggerAdRevenuePayout(adminId, startStr, endStr);
      if (res.success) {
        setResult(t('adPayoutResult', { count: res.paid_count ?? 0, amount: fmtScout(centsToBsd(res.total_paid_cents ?? 0)) }));
      } else {
        setResult(t('payoutError', { error: res.error ?? '' }));
      }
    }
    setPaying(null);

    // Refresh stats
    Promise.all([getCreatorFundStats(), getAdRevenueStats()]).then(([cf, ad]) => {
      setStats(cf);
      setAdStats(ad);
    });
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="size-5 animate-spin motion-reduce:animate-none text-white/30" aria-hidden="true" /></div>;

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="p-4">
          <div className="text-xs text-white/40 mb-1">{t('cfPaidLabel')}</div>
          <div className="text-lg font-mono font-black text-cyan-400 tabular-nums">{fmtScout(centsToBsd(stats?.totalPaid ?? 0))} CR</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-white/40 mb-1">{t('cfPayoutsLabel')}</div>
          <div className="text-lg font-mono font-black text-white tabular-nums">{stats?.payoutCount ?? 0}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-white/40 mb-1">{t('adPaidLabel')}</div>
          <div className="text-lg font-mono font-black text-lime-400 tabular-nums">{fmtScout(centsToBsd(adStats?.totalPaid ?? 0))} CR</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-white/40 mb-1">{t('adPayoutsLabel')}</div>
          <div className="text-lg font-mono font-black text-white tabular-nums">{adStats?.payoutCount ?? 0}</div>
        </Card>
      </div>

      {/* Actions */}
      <Card className="p-4">
        <h3 className="font-black mb-3 flex items-center gap-2 text-balance">
          <Sparkles className="size-4 text-cyan-400" aria-hidden="true" />
          {t('triggerPayouts')}
        </h3>
        <div className="flex gap-3">
          <Button
            variant="gold"
            size="sm"
            disabled={paying !== null}
            onClick={() => handlePayout('fund')}
          >
            {paying === 'fund' ? <Loader2 className="size-3 animate-spin motion-reduce:animate-none mr-1" aria-hidden="true" /> : <Play className="size-3 mr-1" aria-hidden="true" />}
            {t('cfPayoutBtn')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={paying !== null}
            onClick={() => handlePayout('ad')}
          >
            {paying === 'ad' ? <Loader2 className="size-3 animate-spin motion-reduce:animate-none mr-1" aria-hidden="true" /> : <Megaphone className="size-3 mr-1" aria-hidden="true" />}
            {t('adPayoutBtn')}
          </Button>
        </div>
        {result && (
          <div className="mt-3 text-sm text-white/70 bg-surface-subtle rounded-lg px-3 py-2 border border-divider">
            {result}
          </div>
        )}
      </Card>

      {/* Recent Payouts */}
      {stats && stats.recentPayouts.length > 0 && (
        <Card className="p-4">
          <h3 className="font-black mb-3 text-balance">{t('lastPayoutsTitle')}</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-white/40 border-b border-white/10">
                  <th className="text-left py-2 px-2">{t('thPayoutType')}</th>
                  <th className="text-left py-2 px-2">{t('thPeriod')}</th>
                  <th className="text-right py-2 px-2">Impressions</th>
                  <th className="text-right py-2 px-2">{t('thShare')}</th>
                  <th className="text-right py-2 px-2">{t('thPayoutAmount')}</th>
                  <th className="text-left py-2 px-2">{t('thPayoutStatus')}</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentPayouts.map(p => (
                  <tr key={p.id} className="border-b border-white/[0.04]">
                    <td className="py-1.5 px-2 text-white">
                      {p.payout_type === 'creator_fund' ? (
                        <span className="text-cyan-400">Creator Fund</span>
                      ) : (
                        <span className="text-lime-400">{t('adPaidLabel').split(' ')[0]}</span>
                      )}
                    </td>
                    <td className="py-1.5 px-2 text-white/60">{p.period_start} – {p.period_end}</td>
                    <td className="py-1.5 px-2 text-right font-mono text-white/60 tabular-nums">{p.impression_count}</td>
                    <td className="py-1.5 px-2 text-right font-mono text-white/60 tabular-nums">{p.impression_share_pct.toFixed(1)}%</td>
                    <td className="py-1.5 px-2 text-right font-mono text-green-500 font-bold tabular-nums">{fmtScout(centsToBsd(p.payout_cents))} CR</td>
                    <td className="py-1.5 px-2">
                      <span className={cn(
                        'px-1.5 py-0.5 rounded text-[10px] font-semibold',
                        p.status === 'paid' ? 'bg-green-500/20 text-green-400' :
                        p.status === 'rolled_over' ? 'bg-amber-500/20 text-amber-400' :
                        'bg-white/10 text-white/40'
                      )}>
                        {p.status === 'paid' ? t('payoutStatusPaid') : p.status === 'rolled_over' ? t('payoutStatusRolledOver') : t('payoutStatusPending')}
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
