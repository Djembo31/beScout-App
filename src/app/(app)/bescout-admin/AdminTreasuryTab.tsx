'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import {
  Loader2, RefreshCw, Wallet, TrendingDown, TrendingUp, Banknote,
  Users, Ticket, Gift, ArrowDownRight, ArrowUpRight, Flame,
} from 'lucide-react';
import { Card, StatCard } from '@/components/ui';
import { fmtScout, cn } from '@/lib/utils';

import { getTreasuryStats, type TreasuryStats } from '@/lib/services/platformAdmin';

function fmt(centVal: number): string {
  return fmtScout(centVal / 100);
}

// ============================================
// Admin Treasury Tab
// ============================================

export function AdminTreasuryTab() {
  const t = useTranslations('bescoutAdmin');
  const [stats, setStats] = useState<TreasuryStats | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const result = await getTreasuryStats();
      setStats(result);
    } catch (err) {
      console.error('[Admin] Treasury data load failed:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) {
    return <div className="flex justify-center py-8"><Loader2 aria-hidden="true" className="size-5 animate-spin motion-reduce:animate-none text-white/30" /></div>;
  }

  if (!stats) {
    return <Card className="p-6 text-center text-white/40">{t('treasuryLoadError')}</Card>;
  }

  const netSupply = stats.circulatingCents + stats.lockedCents;
  const totalMinted = stats.passBcredits + stats.welcomeBonusMinted;
  const avgFeePerTrade = stats.totalTrades > 0 ? Math.round((stats.platformFees + stats.pbtFees + stats.clubFees) / stats.totalTrades) : 0;

  return (
    <div className="space-y-6">
      {/* Top-Level KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={<Wallet aria-hidden="true" className="size-5 text-gold" />}
          label={t('treasuryCirculating')}
          value={fmt(netSupply)}
        />
        <StatCard
          icon={<Flame aria-hidden="true" className="size-5 text-red-400" />}
          label={t('treasuryPlatformFeesBurned')}
          value={fmt(stats.platformFees)}
        />
        <StatCard
          icon={<TrendingUp aria-hidden="true" className="size-5 text-green-400" />}
          label={t('treasuryMintedTotal')}
          value={fmt(totalMinted)}
        />
        <StatCard
          icon={<Users aria-hidden="true" className="size-5 text-sky-400" />}
          label={t('treasuryActiveWallets')}
          value={String(stats.walletsWithBalance)}
        />
      </div>

      {/* $SCOUT Flow */}
      <Card className="p-5 space-y-4">
        <h3 className="text-sm font-black text-white/80 uppercase tracking-wide">{t('treasuryCreditFlow')}</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Inflows */}
          <div className="space-y-2">
            <div className="text-xs font-bold text-green-400 flex items-center gap-1.5">
              <ArrowDownRight className="size-3.5" aria-hidden="true" /> {t('treasuryInflows')}
            </div>
            <FlowRow label={t('treasuryFoundingPasses')} value={stats.passBcredits} count={stats.passesSold} unit={t('treasuryUnitPasses')} />
            <FlowRow label={t('treasuryWelcomeBonus')} value={stats.welcomeBonusMinted} count={stats.welcomeBonusesClaimed} unit={t('treasuryUnitClaims')} />
          </div>

          {/* Outflows */}
          <div className="space-y-2">
            <div className="text-xs font-bold text-red-400 flex items-center gap-1.5">
              <ArrowUpRight className="size-3.5" aria-hidden="true" /> {t('treasuryOutflows')}
            </div>
            <FlowRow label={t('treasuryPlatformFeesBurn')} value={stats.platformFees} count={stats.totalTrades} unit={t('treasuryUnitTrades')} isOutflow />
            <FlowRow label={t('treasuryPbtFees')} value={stats.pbtFees} isOutflow />
            <FlowRow label={t('treasuryClubFees')} value={stats.clubFees} isOutflow />
          </div>
        </div>

        {/* Net Supply Bar */}
        <div className="pt-3 border-t border-divider">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="text-white/50">{t('treasuryNetSupply')}</span>
            <span className="font-mono tabular-nums font-bold text-gold">{fmt(netSupply)}</span>
          </div>
          <div className="flex h-3 rounded-full overflow-hidden bg-white/5">
            {netSupply > 0 && (
              <>
                <div
                  className="h-full bg-gold/60"
                  style={{ width: `${(stats.circulatingCents / netSupply) * 100}%` }}
                  title={`${t('treasuryFree')}: ${fmt(stats.circulatingCents)}`}
                />
                <div
                  className="h-full bg-amber-600/60"
                  style={{ width: `${(stats.lockedCents / netSupply) * 100}%` }}
                  title={`${t('treasuryLocked')}: ${fmt(stats.lockedCents)}`}
                />
              </>
            )}
          </div>
          <div className="flex gap-4 mt-1.5 text-[10px] text-white/40">
            <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-gold/60" /> {t('treasuryFree')}: <span className="font-mono tabular-nums">{fmt(stats.circulatingCents)}</span></span>
            <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-amber-600/60" /> {t('treasuryLocked')}: <span className="font-mono tabular-nums">{fmt(stats.lockedCents)}</span></span>
          </div>
        </div>
      </Card>

      {/* Trading Metrics */}
      <Card className="p-5 space-y-3">
        <h3 className="text-sm font-black text-white/80 uppercase tracking-wide">{t('treasuryTrading')}</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MiniStat label={t('treasuryTrades')} value={String(stats.totalTrades)} icon={<TrendingDown className="size-4" />} />
          <MiniStat label={t('treasuryPlatformBurn')} value={fmt(stats.platformFees)} color="text-red-400" icon={<Flame className="size-4" />} />
          <MiniStat label={t('treasuryPbtTreasury')} value={fmt(stats.pbtBalance)} color="text-purple-400" icon={<Banknote className="size-4" />} />
          <MiniStat label={t('treasuryAvgFeePerTrade')} value={fmt(avgFeePerTrade)} icon={<Wallet className="size-4" />} />
        </div>
      </Card>

      {/* Ticket Economy */}
      <Card className="p-5 space-y-3">
        <h3 className="text-sm font-black text-white/80 uppercase tracking-wide">{t('treasuryTicketEconomy')}</h3>
        <div className="grid grid-cols-3 gap-3">
          <MiniStat label={t('treasuryInCirculation')} value={String(stats.ticketsCirculating)} color="text-amber-400" icon={<Ticket className="size-4" />} />
          <MiniStat label={t('treasuryEarnedTotal')} value={String(stats.ticketsEarned)} color="text-green-400" icon={<ArrowDownRight className="size-4" />} />
          <MiniStat label={t('treasurySpent')} value={String(stats.ticketsSpent)} color="text-red-400" icon={<ArrowUpRight className="size-4" />} />
        </div>
      </Card>

      {/* Founding Passes */}
      <Card className="p-5 space-y-3">
        <h3 className="text-sm font-black text-white/80 uppercase tracking-wide">{t('treasuryFoundingPasses')}</h3>
        <div className="grid grid-cols-3 gap-3">
          <MiniStat label={t('treasurySold')} value={String(stats.passesSold)} icon={<Gift className="size-4" />} />
          <MiniStat label={t('treasuryCreditsGranted')} value={fmt(stats.passBcredits)} color="text-gold" icon={<Wallet className="size-4" />} />
          <MiniStat label={t('treasuryWelcomeBonus')} value={String(stats.welcomeBonusesClaimed)} icon={<Users className="size-4" />} />
        </div>
      </Card>

      {/* Refresh */}
      <div className="flex justify-end">
        <button
          onClick={() => { setLoading(true); loadData(); }}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white/50 hover:text-white/80 bg-surface-subtle hover:bg-white/[0.08] rounded-lg transition-colors min-h-[44px]"
          aria-label={t('treasuryRefreshLabel')}
        >
          <RefreshCw className="size-3.5" aria-hidden="true" />
          {t('treasuryRefresh')}
        </button>
      </div>
    </div>
  );
}

// ============================================
// Sub-Components
// ============================================

function FlowRow({ label, value, count, unit, isOutflow }: {
  label: string; value: number; count?: number; unit?: string; isOutflow?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-1.5 px-3 bg-surface-minimal rounded-lg">
      <div className="text-xs text-white/60">
        {label}
        {count !== undefined && unit && (
          <span className="text-white/30 ml-1.5">({count} {unit})</span>
        )}
      </div>
      <span className={cn(
        'font-mono tabular-nums text-xs font-bold',
        isOutflow ? 'text-red-400/70' : 'text-green-400/70',
      )}>
        {isOutflow ? '-' : '+'}{fmt(value)}
      </span>
    </div>
  );
}

function MiniStat({ label, value, color, icon }: {
  label: string; value: string; color?: string; icon: React.ReactNode;
}) {
  return (
    <div className="bg-surface-minimal rounded-xl p-3 border border-divider">
      <div className={cn('mb-1', color ?? 'text-white/40')}>{icon}</div>
      <div className={cn('font-mono tabular-nums font-bold text-sm', color ?? 'text-white/80')}>{value}</div>
      <div className="text-[10px] text-white/40 mt-0.5">{label}</div>
    </div>
  );
}
