'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Users, Zap, Rocket, Trophy, Loader2, RefreshCw, Download } from 'lucide-react';
import { Card, Button, StatCard } from '@/components/ui';
import { useToast } from '@/components/providers/ToastProvider';
import { cn } from '@/lib/utils';

type AirdropTierKey = 'bronze' | 'silber' | 'gold' | 'diamond';
const TIER_COLORS: Record<AirdropTierKey, string> = {
  bronze: '#CD7F32',
  silber: '#C0C0C0',
  gold: '#FFD700',
  diamond: '#B9F2FF',
};

export function AdminAirdropTab() {
  const t = useTranslations('bescoutAdmin');
  const { addToast } = useToast();
  const [stats, setStats] = useState<{ total_users: number; avg_score: number; tier_distribution: Record<AirdropTierKey, number> } | null>(null);
  const [leaderboard, setLeaderboard] = useState<Array<{ user_id: string; handle: string; display_name: string | null; total_score: number; rank: number | null; tier: AirdropTierKey; trading_score: number; content_score: number; fantasy_score: number; social_score: number; activity_score: number; referral_score: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [{ getAirdropStats }, { getAirdropLeaderboard }] = await Promise.all([
        import('@/lib/services/airdropScore'),
        import('@/lib/services/airdropScore'),
      ]);
      const [s, lb] = await Promise.all([getAirdropStats(), getAirdropLeaderboard(50)]);
      setStats(s as typeof stats);
      setLeaderboard(lb as typeof leaderboard);
    } catch (err) {
      console.error('[Admin] Airdrop data load failed:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleRefreshAll = async () => {
    setRefreshing(true);
    try {
      const { refreshAllAirdropScores } = await import('@/lib/services/airdropScore');
      const count = await refreshAllAirdropScores();
      addToast(t('scoresRefreshed', { count }), 'success');
      await loadData();
    } catch (err) {
      addToast(t('refreshError'), 'error');
      console.error('[Admin] Refresh all failed:', err);
    } finally {
      setRefreshing(false);
    }
  };

  const handleExportCsv = () => {
    if (leaderboard.length === 0) return;
    const headers = [t('csvRank'), t('csvHandle'), t('csvName'), t('csvTier'), t('csvTotal'), t('csvTrading'), t('csvContent'), t('csvFantasy'), t('csvSocial'), t('csvActivity'), t('csvReferral')];
    const rows = leaderboard.map(e => [
      e.rank ?? '-', e.handle, e.display_name ?? '', e.tier, e.total_score,
      e.trading_score, e.content_score, e.fantasy_score,
      e.social_score, e.activity_score, e.referral_score,
    ].join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `airdrop-scores-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return <div className="flex justify-center py-8"><Loader2 aria-hidden="true" className="size-5 animate-spin motion-reduce:animate-none text-white/30" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard icon={<Users aria-hidden="true" className="size-5 text-gold" />} label={t('participants')} value={String(stats.total_users)} />
          <StatCard icon={<Trophy aria-hidden="true" className="size-5 text-purple-400" />} label={t('avgScore')} value={String(stats.avg_score)} />
          <StatCard icon={<Rocket aria-hidden="true" className="size-5 text-[#B9F2FF]" />} label="Diamond" value={String(stats.tier_distribution.diamond)} />
          <StatCard icon={<Zap aria-hidden="true" className="size-5 text-gold" />} label="Gold" value={String(stats.tier_distribution.gold)} />
        </div>
      )}

      {/* Tier Distribution Bar */}
      {stats && stats.total_users > 0 && (
        <Card className="p-4">
          <div className="text-xs font-bold text-white/50 uppercase mb-3">{t('tierDistribution')}</div>
          <div className="flex h-4 rounded-full overflow-hidden bg-white/5">
            {(['bronze', 'silber', 'gold', 'diamond'] as const).map(tier => {
              const pct = (stats.tier_distribution[tier] / stats.total_users) * 100;
              if (pct === 0) return null;
              return (
                <div
                  key={tier}
                  className="h-full transition-colors"
                  style={{ width: `${pct}%`, backgroundColor: TIER_COLORS[tier] }}
                  title={`${tier}: ${stats.tier_distribution[tier]} (${pct.toFixed(1)}%)`}
                />
              );
            })}
          </div>
          <div className="flex gap-4 mt-2 text-[10px] text-white/40">
            {(['bronze', 'silber', 'gold', 'diamond'] as const).map(tier => (
              <span key={tier} className="flex items-center gap-1">
                <span className="size-2 rounded-full" style={{ backgroundColor: TIER_COLORS[tier] }} />
                {tier}: {stats.tier_distribution[tier]}
              </span>
            ))}
          </div>
        </Card>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Button variant="gold" size="sm" onClick={handleRefreshAll} disabled={refreshing} className="gap-1.5">
          <RefreshCw aria-hidden="true" className={cn('size-3.5', refreshing && 'animate-spin motion-reduce:animate-none')} />
          {t('refreshAllScores')}
        </Button>
        <Button variant="outline" size="sm" onClick={handleExportCsv} className="gap-1.5">
          <Download aria-hidden="true" className="size-3.5" />
          {t('csvExport')}
        </Button>
      </div>

      {/* Leaderboard Table */}
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-white/40 border-b border-white/10">
                <th className="text-left py-2.5 px-3">{t('thRank')}</th>
                <th className="text-left py-2.5 px-3">{t('thUser')}</th>
                <th className="text-left py-2.5 px-3">{t('thTier')}</th>
                <th className="text-right py-2.5 px-3">{t('thTotal')}</th>
                <th className="text-right py-2.5 px-3">{t('thTrading')}</th>
                <th className="text-right py-2.5 px-3">{t('thContent')}</th>
                <th className="text-right py-2.5 px-3">{t('thFantasy')}</th>
                <th className="text-right py-2.5 px-3">{t('thSocial')}</th>
                <th className="text-right py-2.5 px-3">{t('thActivity')}</th>
                <th className="text-right py-2.5 px-3">{t('thReferral')}</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((e, i) => (
                <tr key={e.user_id} className="border-b border-white/[0.04] hover:bg-surface-minimal">
                  <td className="py-2 px-3 font-mono tabular-nums text-white/50">{e.rank ?? i + 1}</td>
                  <td className="py-2 px-3">
                    <div className="font-semibold text-white">{e.display_name || e.handle}</div>
                    <div className="text-[10px] text-white/30">@{e.handle}</div>
                  </td>
                  <td className="py-2 px-3">
                    <span
                      className="px-1.5 py-0.5 rounded text-[9px] font-black"
                      style={{ backgroundColor: `${TIER_COLORS[e.tier]}20`, color: TIER_COLORS[e.tier] }}
                    >
                      {e.tier}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-right font-mono tabular-nums font-bold" style={{ color: TIER_COLORS[e.tier] }}>{e.total_score}</td>
                  <td className="py-2 px-3 text-right font-mono tabular-nums text-white/50">{e.trading_score}</td>
                  <td className="py-2 px-3 text-right font-mono tabular-nums text-white/50">{e.content_score}</td>
                  <td className="py-2 px-3 text-right font-mono tabular-nums text-white/50">{e.fantasy_score}</td>
                  <td className="py-2 px-3 text-right font-mono tabular-nums text-white/50">{e.social_score}</td>
                  <td className="py-2 px-3 text-right font-mono tabular-nums text-white/50">{e.activity_score}</td>
                  <td className="py-2 px-3 text-right font-mono tabular-nums text-white/50">{e.referral_score}</td>
                </tr>
              ))}
              {leaderboard.length === 0 && (
                <tr><td colSpan={10} className="text-center py-8 text-white/30">{t('noScores')}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
