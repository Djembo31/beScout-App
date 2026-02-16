'use client';

import { useState, useEffect, useCallback } from 'react';
import { Users, Zap, Rocket, Trophy, Loader2, RefreshCw, Download } from 'lucide-react';
import { Card, Button, StatCard } from '@/components/ui';
import { useToast } from '@/components/providers/ToastProvider';
import { cn } from '@/lib/utils';

type AirdropTierKey = 'bronze' | 'silver' | 'gold' | 'diamond';
const TIER_COLORS: Record<AirdropTierKey, string> = {
  bronze: '#CD7F32',
  silver: '#C0C0C0',
  gold: '#FFD700',
  diamond: '#B9F2FF',
};

export function AdminAirdropTab() {
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
      addToast(`${count} Scores aktualisiert`, 'success');
      await loadData();
    } catch (err) {
      addToast('Fehler beim Aktualisieren', 'error');
      console.error('[Admin] Refresh all failed:', err);
    } finally {
      setRefreshing(false);
    }
  };

  const handleExportCsv = () => {
    if (leaderboard.length === 0) return;
    const headers = ['Rang', 'Handle', 'Name', 'Tier', 'Total', 'Trading', 'Content', 'Fantasy', 'Social', 'Aktivität', 'Referral'];
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
    return <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-white/30" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard icon={<Users className="w-5 h-5 text-[#FFD700]" />} label="Teilnehmer" value={String(stats.total_users)} />
          <StatCard icon={<Trophy className="w-5 h-5 text-purple-400" />} label="Ø Score" value={String(stats.avg_score)} />
          <StatCard icon={<Rocket className="w-5 h-5 text-[#B9F2FF]" />} label="Diamond" value={String(stats.tier_distribution.diamond)} />
          <StatCard icon={<Zap className="w-5 h-5 text-[#FFD700]" />} label="Gold" value={String(stats.tier_distribution.gold)} />
        </div>
      )}

      {/* Tier Distribution Bar */}
      {stats && stats.total_users > 0 && (
        <Card className="p-4">
          <div className="text-xs font-bold text-white/50 uppercase tracking-wider mb-3">Tier-Verteilung</div>
          <div className="flex h-4 rounded-full overflow-hidden bg-white/5">
            {(['bronze', 'silver', 'gold', 'diamond'] as const).map(t => {
              const pct = (stats.tier_distribution[t] / stats.total_users) * 100;
              if (pct === 0) return null;
              return (
                <div
                  key={t}
                  className="h-full transition-all"
                  style={{ width: `${pct}%`, backgroundColor: TIER_COLORS[t] }}
                  title={`${t}: ${stats.tier_distribution[t]} (${pct.toFixed(1)}%)`}
                />
              );
            })}
          </div>
          <div className="flex gap-4 mt-2 text-[10px] text-white/40">
            {(['bronze', 'silver', 'gold', 'diamond'] as const).map(t => (
              <span key={t} className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: TIER_COLORS[t] }} />
                {t}: {stats.tier_distribution[t]}
              </span>
            ))}
          </div>
        </Card>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Button variant="gold" size="sm" onClick={handleRefreshAll} disabled={refreshing} className="gap-1.5">
          <RefreshCw className={cn('w-3.5 h-3.5', refreshing && 'animate-spin')} />
          Alle Scores aktualisieren
        </Button>
        <Button variant="outline" size="sm" onClick={handleExportCsv} className="gap-1.5">
          <Download className="w-3.5 h-3.5" />
          CSV Export
        </Button>
      </div>

      {/* Leaderboard Table */}
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-white/40 border-b border-white/10">
                <th className="text-left py-2.5 px-3">#</th>
                <th className="text-left py-2.5 px-3">User</th>
                <th className="text-left py-2.5 px-3">Tier</th>
                <th className="text-right py-2.5 px-3">Total</th>
                <th className="text-right py-2.5 px-3">Trading</th>
                <th className="text-right py-2.5 px-3">Content</th>
                <th className="text-right py-2.5 px-3">Fantasy</th>
                <th className="text-right py-2.5 px-3">Social</th>
                <th className="text-right py-2.5 px-3">Aktiv.</th>
                <th className="text-right py-2.5 px-3">Ref.</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((e, i) => (
                <tr key={e.user_id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                  <td className="py-2 px-3 font-mono text-white/50">{e.rank ?? i + 1}</td>
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
                  <td className="py-2 px-3 text-right font-mono font-bold" style={{ color: TIER_COLORS[e.tier] }}>{e.total_score}</td>
                  <td className="py-2 px-3 text-right font-mono text-white/50">{e.trading_score}</td>
                  <td className="py-2 px-3 text-right font-mono text-white/50">{e.content_score}</td>
                  <td className="py-2 px-3 text-right font-mono text-white/50">{e.fantasy_score}</td>
                  <td className="py-2 px-3 text-right font-mono text-white/50">{e.social_score}</td>
                  <td className="py-2 px-3 text-right font-mono text-white/50">{e.activity_score}</td>
                  <td className="py-2 px-3 text-right font-mono text-white/50">{e.referral_score}</td>
                </tr>
              ))}
              {leaderboard.length === 0 && (
                <tr><td colSpan={10} className="text-center py-8 text-white/30">Keine Scores vorhanden. Klicke &quot;Alle Scores aktualisieren&quot;.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
