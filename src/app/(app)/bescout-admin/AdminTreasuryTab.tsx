'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Loader2, RefreshCw, Wallet, TrendingDown, TrendingUp, Banknote,
  Users, Ticket, Gift, ArrowDownRight, ArrowUpRight, Flame,
} from 'lucide-react';
import { Card, StatCard } from '@/components/ui';
import { fmtScout, cn } from '@/lib/utils';

// ============================================
// Types
// ============================================

type TreasuryStats = {
  // bCredits Economy
  circulatingCents: number;
  lockedCents: number;
  walletsWithBalance: number;
  // Fees (burned/collected)
  platformFees: number;
  pbtFees: number;
  clubFees: number;
  totalFeesBurned: number;
  totalTrades: number;
  // PBT Treasury
  pbtBalance: number;
  pbtTradingInflow: number;
  // Minting (inflow)
  passBcredits: number;
  passesSold: number;
  welcomeBonusesClaimed: number;
  welcomeBonusMinted: number; // 1000 bCredits × claims
  // Tickets
  ticketsCirculating: number;
  ticketsEarned: number;
  ticketsSpent: number;
};

// ============================================
// Helpers
// ============================================

function cents(v: string | number): number {
  return typeof v === 'string' ? parseInt(v, 10) || 0 : v;
}

function fmt(centVal: number): string {
  return fmtScout(centVal / 100);
}

// ============================================
// Admin Treasury Tab
// ============================================

export function AdminTreasuryTab() {
  const [stats, setStats] = useState<TreasuryStats | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const { supabase } = await import('@/lib/supabaseClient');

      // Single query for all metrics
      const { data, error } = await supabase.rpc('get_treasury_stats');

      if (error) {
        // Fallback: RPC doesn't exist yet, use direct queries
        const [wallets, trades, pbt, passes, bonuses, tickets] = await Promise.all([
          supabase.from('wallets').select('balance, locked_balance'),
          supabase.from('trades').select('platform_fee, pbt_fee, club_fee'),
          supabase.from('pbt_treasury').select('balance, trading_inflow'),
          supabase.from('user_founding_passes').select('bcredits_granted'),
          supabase.from('welcome_bonus_claims').select('id', { count: 'exact', head: true }),
          supabase.from('user_tickets').select('balance, earned_total, spent_total'),
        ]);

        const wRows = wallets.data ?? [];
        const tRows = trades.data ?? [];
        const pRows = pbt.data ?? [];
        const fpRows = passes.data ?? [];
        const tkRows = tickets.data ?? [];

        const circulatingCents = wRows.reduce((s, w) => s + cents(w.balance), 0);
        const lockedCents = wRows.reduce((s, w) => s + cents(w.locked_balance), 0);
        const walletsWithBalance = wRows.filter(w => cents(w.balance) > 0).length;

        const platformFees = tRows.reduce((s, t) => s + cents(t.platform_fee), 0);
        const pbtFees = tRows.reduce((s, t) => s + cents(t.pbt_fee), 0);
        const clubFees = tRows.reduce((s, t) => s + cents(t.club_fee), 0);

        const pbtBalance = pRows.reduce((s, p) => s + cents(p.balance), 0);
        const pbtTradingInflow = pRows.reduce((s, p) => s + cents(p.trading_inflow), 0);

        const passBcredits = fpRows.reduce((s, p) => s + cents(p.bcredits_granted), 0);
        const welcomeBonusesClaimed = bonuses.count ?? 0;

        const ticketsCirculating = tkRows.reduce((s, t) => s + cents(t.balance), 0);
        const ticketsEarned = tkRows.reduce((s, t) => s + cents(t.earned_total), 0);
        const ticketsSpent = tkRows.reduce((s, t) => s + cents(t.spent_total), 0);

        setStats({
          circulatingCents,
          lockedCents,
          walletsWithBalance,
          platformFees,
          pbtFees,
          clubFees,
          totalFeesBurned: platformFees, // Platform fees = burned
          totalTrades: tRows.length,
          pbtBalance,
          pbtTradingInflow,
          passBcredits,
          passesSold: fpRows.length,
          welcomeBonusesClaimed,
          welcomeBonusMinted: welcomeBonusesClaimed * 100_000, // 1000 bC = 100,000 cents
          ticketsCirculating,
          ticketsEarned,
          ticketsSpent,
        });
      } else {
        // RPC returned data directly
        const d = data as Record<string, string | number>;
        const wbc = cents(d.welcome_bonuses_claimed);
        setStats({
          circulatingCents: cents(d.total_circulating_cents),
          lockedCents: cents(d.total_locked_cents),
          walletsWithBalance: cents(d.wallets_with_balance),
          platformFees: cents(d.total_platform_fees),
          pbtFees: cents(d.total_pbt_fees),
          clubFees: cents(d.total_club_fees),
          totalFeesBurned: cents(d.total_platform_fees),
          totalTrades: cents(d.total_trades),
          pbtBalance: cents(d.pbt_total_balance),
          pbtTradingInflow: cents(d.pbt_trading_inflow),
          passBcredits: cents(d.total_pass_bcredits),
          passesSold: cents(d.total_passes_sold),
          welcomeBonusesClaimed: wbc,
          welcomeBonusMinted: wbc * 100_000,
          ticketsCirculating: cents(d.total_tickets_circulating),
          ticketsEarned: cents(d.total_tickets_earned),
          ticketsSpent: cents(d.total_tickets_spent),
        });
      }
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
    return <Card className="p-6 text-center text-white/40">Treasury-Daten konnten nicht geladen werden</Card>;
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
          label="Umlauf (bCredits)"
          value={fmt(netSupply)}
        />
        <StatCard
          icon={<Flame aria-hidden="true" className="size-5 text-red-400" />}
          label="Platform Fees (burned)"
          value={fmt(stats.platformFees)}
        />
        <StatCard
          icon={<TrendingUp aria-hidden="true" className="size-5 text-green-400" />}
          label="Minted (gesamt)"
          value={fmt(totalMinted)}
        />
        <StatCard
          icon={<Users aria-hidden="true" className="size-5 text-sky-400" />}
          label="Aktive Wallets"
          value={String(stats.walletsWithBalance)}
        />
      </div>

      {/* bCredits Flow */}
      <Card className="p-5 space-y-4">
        <h3 className="text-sm font-black text-white/80 uppercase tracking-wide">bCredits Geldfluss</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Inflows */}
          <div className="space-y-2">
            <div className="text-xs font-bold text-green-400 flex items-center gap-1.5">
              <ArrowDownRight className="size-3.5" aria-hidden="true" /> Zufluesse (Minting)
            </div>
            <FlowRow label="Founding Passes" value={stats.passBcredits} count={stats.passesSold} unit="Passes" />
            <FlowRow label="Welcome Bonus" value={stats.welcomeBonusMinted} count={stats.welcomeBonusesClaimed} unit="Claims" />
          </div>

          {/* Outflows */}
          <div className="space-y-2">
            <div className="text-xs font-bold text-red-400 flex items-center gap-1.5">
              <ArrowUpRight className="size-3.5" aria-hidden="true" /> Abfluesse (Burns/Fees)
            </div>
            <FlowRow label="Platform Fees (burn)" value={stats.platformFees} count={stats.totalTrades} unit="Trades" isOutflow />
            <FlowRow label="PBT Fees" value={stats.pbtFees} isOutflow />
            <FlowRow label="Club Fees" value={stats.clubFees} isOutflow />
          </div>
        </div>

        {/* Net Supply Bar */}
        <div className="pt-3 border-t border-white/[0.06]">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="text-white/50">Netto-Supply</span>
            <span className="font-mono tabular-nums font-bold text-gold">{fmt(netSupply)}</span>
          </div>
          <div className="flex h-3 rounded-full overflow-hidden bg-white/5">
            {netSupply > 0 && (
              <>
                <div
                  className="h-full bg-gold/60"
                  style={{ width: `${(stats.circulatingCents / netSupply) * 100}%` }}
                  title={`Frei: ${fmt(stats.circulatingCents)}`}
                />
                <div
                  className="h-full bg-amber-600/60"
                  style={{ width: `${(stats.lockedCents / netSupply) * 100}%` }}
                  title={`Locked: ${fmt(stats.lockedCents)}`}
                />
              </>
            )}
          </div>
          <div className="flex gap-4 mt-1.5 text-[10px] text-white/40">
            <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-gold/60" /> Frei: <span className="font-mono tabular-nums">{fmt(stats.circulatingCents)}</span></span>
            <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-amber-600/60" /> Locked: <span className="font-mono tabular-nums">{fmt(stats.lockedCents)}</span></span>
          </div>
        </div>
      </Card>

      {/* Trading Metrics */}
      <Card className="p-5 space-y-3">
        <h3 className="text-sm font-black text-white/80 uppercase tracking-wide">Trading</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MiniStat label="Trades" value={String(stats.totalTrades)} icon={<TrendingDown className="size-4" />} />
          <MiniStat label="Platform (burn)" value={fmt(stats.platformFees)} color="text-red-400" icon={<Flame className="size-4" />} />
          <MiniStat label="PBT Treasury" value={fmt(stats.pbtBalance)} color="text-purple-400" icon={<Banknote className="size-4" />} />
          <MiniStat label="Avg Fee/Trade" value={fmt(avgFeePerTrade)} icon={<Wallet className="size-4" />} />
        </div>
      </Card>

      {/* Ticket Economy */}
      <Card className="p-5 space-y-3">
        <h3 className="text-sm font-black text-white/80 uppercase tracking-wide">Ticket-Oekonomie</h3>
        <div className="grid grid-cols-3 gap-3">
          <MiniStat label="Im Umlauf" value={String(stats.ticketsCirculating)} color="text-amber-400" icon={<Ticket className="size-4" />} />
          <MiniStat label="Verdient (gesamt)" value={String(stats.ticketsEarned)} color="text-green-400" icon={<ArrowDownRight className="size-4" />} />
          <MiniStat label="Ausgegeben" value={String(stats.ticketsSpent)} color="text-red-400" icon={<ArrowUpRight className="size-4" />} />
        </div>
      </Card>

      {/* Founding Passes */}
      <Card className="p-5 space-y-3">
        <h3 className="text-sm font-black text-white/80 uppercase tracking-wide">Founding Passes</h3>
        <div className="grid grid-cols-3 gap-3">
          <MiniStat label="Verkauft" value={String(stats.passesSold)} icon={<Gift className="size-4" />} />
          <MiniStat label="bCredits vergeben" value={fmt(stats.passBcredits)} color="text-gold" icon={<Wallet className="size-4" />} />
          <MiniStat label="Welcome Bonus" value={String(stats.welcomeBonusesClaimed)} icon={<Users className="size-4" />} />
        </div>
      </Card>

      {/* Refresh */}
      <div className="flex justify-end">
        <button
          onClick={() => { setLoading(true); loadData(); }}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white/50 hover:text-white/80 bg-white/[0.04] hover:bg-white/[0.08] rounded-lg transition-colors min-h-[44px]"
          aria-label="Treasury-Daten aktualisieren"
        >
          <RefreshCw className="size-3.5" aria-hidden="true" />
          Aktualisieren
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
    <div className="flex items-center justify-between py-1.5 px-3 bg-white/[0.02] rounded-lg">
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
    <div className="bg-white/[0.02] rounded-xl p-3 border border-white/[0.06]">
      <div className={cn('mb-1', color ?? 'text-white/40')}>{icon}</div>
      <div className={cn('font-mono tabular-nums font-bold text-sm', color ?? 'text-white/80')}>{value}</div>
      <div className="text-[10px] text-white/40 mt-0.5">{label}</div>
    </div>
  );
}
