'use client';

import { useState, useEffect, useCallback } from 'react';
import { Gift, Loader2, RefreshCw, Search, Crown, AlertCircle, ShieldAlert } from 'lucide-react';
import { Card, Button, StatCard } from '@/components/ui';
import FoundingPassBadge from '@/components/ui/FoundingPassBadge';
import { useToast } from '@/components/providers/ToastProvider';
import { cn, fmtScout } from '@/lib/utils';
import { FOUNDING_PASS_TIERS } from '@/lib/foundingPasses';
import type { FoundingPassTier, DbUserFoundingPass } from '@/types';

const KILL_SWITCH_LIMIT_EUR = 900_000;

const TIER_HEX: Record<FoundingPassTier, string> = {
  fan: '#38bdf8',      // sky-400
  scout: '#34d399',    // emerald-400
  pro: '#a78bfa',      // purple-400
  founder: '#FFD700',  // gold
};

// ============================================
// Types
// ============================================

type PassWithProfile = DbUserFoundingPass & {
  profiles: { username: string; avatar_url: string | null } | null;
};

type PassStats = {
  total: number;
  byTier: Record<FoundingPassTier, number>;
  totalBcreditsGranted: number;
  totalEurCents: number;
};

// ============================================
// Admin Founding Passes Tab
// ============================================

export function AdminFoundingPassesTab({ adminId }: { adminId: string }) {
  const { addToast } = useToast();
  const [passes, setPasses] = useState<PassWithProfile[]>([]);
  const [stats, setStats] = useState<PassStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Grant form state
  const [grantUserId, setGrantUserId] = useState('');
  const [grantTier, setGrantTier] = useState<FoundingPassTier>('fan');
  const [grantRef, setGrantRef] = useState('');
  const [granting, setGranting] = useState(false);
  const [grantError, setGrantError] = useState('');

  const loadData = useCallback(async () => {
    try {
      const { supabase } = await import('@/lib/supabaseClient');
      const { data, error } = await supabase
        .from('user_founding_passes')
        .select('id, user_id, tier, price_eur_cents, bcredits_granted, migration_bonus_pct, payment_reference, granted_by, created_at, profiles!inner(username, avatar_url)')
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) throw error;

      const rows = (data ?? []) as unknown as PassWithProfile[];
      setPasses(rows);

      // Compute stats
      const byTier: Record<string, number> = { fan: 0, scout: 0, pro: 0, founder: 0 };
      let totalBc = 0;
      let totalEur = 0;
      for (const p of rows) {
        byTier[p.tier] = (byTier[p.tier] ?? 0) + 1;
        totalBc += p.bcredits_granted;
        totalEur += p.price_eur_cents;
      }
      setStats({
        total: rows.length,
        byTier: byTier as Record<FoundingPassTier, number>,
        totalBcreditsGranted: totalBc,
        totalEurCents: totalEur,
      });
    } catch (err) {
      console.error('[Admin] Founding Passes load failed:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleGrant = async () => {
    if (!grantUserId.trim()) {
      setGrantError('User-ID eingeben');
      return;
    }
    setGranting(true);
    setGrantError('');
    try {
      const { grantFoundingPass } = await import('@/lib/services/foundingPasses');
      const tierDef = FOUNDING_PASS_TIERS.find(t => t.tier === grantTier);
      const result = await grantFoundingPass(
        grantUserId.trim(),
        grantTier,
        tierDef?.priceEurCents ?? 0,
        grantRef.trim() || `admin-grant:${adminId}`,
      );
      if (!result.ok) {
        const msg = result.error === 'KILL_SWITCH_ACTIVE'
          ? `Kill-Switch aktiv: EUR ${KILL_SWITCH_LIMIT_EUR.toLocaleString('de-DE')} Limit erreicht — keine weiteren Passes moeglich`
          : (result.error ?? 'Fehler beim Vergeben');
        setGrantError(msg);
        return;
      }
      addToast(`${grantTier.toUpperCase()} Pass vergeben — ${fmtScout(result.bcreditsGranted ?? 0)} bCredits`, 'success');
      setGrantUserId('');
      setGrantRef('');
      await loadData();
    } catch (err) {
      setGrantError(err instanceof Error ? err.message : 'Unbekannter Fehler');
    } finally {
      setGranting(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-8"><Loader2 aria-hidden="true" className="size-5 animate-spin motion-reduce:animate-none text-white/30" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard icon={<Gift aria-hidden="true" className="size-5 text-gold" />} label="Passes gesamt" value={String(stats.total)} />
          <StatCard icon={<Crown aria-hidden="true" className="size-5 text-purple-400" />} label="Founder" value={String(stats.byTier.founder)} />
          <StatCard icon={<Gift aria-hidden="true" className="size-5 text-amber-400" />} label="Pro" value={String(stats.byTier.pro)} />
          <StatCard icon={<Gift aria-hidden="true" className="size-5 text-sky-400" />} label="bCredits vergeben" value={fmtScout(stats.totalBcreditsGranted)} />
        </div>
      )}

      {/* Kill-Switch Revenue Limit */}
      {stats && (
        (() => {
          const eurTotal = stats.totalEurCents / 100;
          const pct = Math.min((eurTotal / KILL_SWITCH_LIMIT_EUR) * 100, 100);
          const isActive = eurTotal >= KILL_SWITCH_LIMIT_EUR;
          return (
            <Card className={cn('p-4 focus-within:ring-1 focus-within:ring-white/20 transition-colors hover:border-white/20', isActive && 'border-red-500/30 hover:border-red-500/50')}>
              <div className="flex items-center gap-2 mb-2">
                <ShieldAlert className={cn('size-4 flex-shrink-0', isActive ? 'text-red-400' : 'text-amber-400')} aria-hidden="true" />
                <span className="text-xs font-bold text-white/50 uppercase">
                  Kill-Switch — <span className="font-mono tabular-nums">EUR {KILL_SWITCH_LIMIT_EUR.toLocaleString('de-DE')}</span> Limit
                </span>
                {isActive && <span className="text-[10px] font-bold text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full">AKTIV</span>}
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-3 rounded-full overflow-hidden bg-white/5">
                  <div
                    className={cn('h-full rounded-full transition-all', isActive ? 'bg-red-500' : pct > 80 ? 'bg-amber-500' : 'bg-emerald-500')}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-xs font-mono tabular-nums text-white/70 min-w-[100px] text-right">
                  {eurTotal.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €
                </span>
              </div>
              <div className="text-[10px] text-white/30 mt-1">
                {pct.toFixed(1)}% des Limits erreicht
              </div>
            </Card>
          );
        })()
      )}

      {/* Tier Distribution */}
      {stats && stats.total > 0 && (
        <Card className="p-4">
          <div className="text-xs font-bold text-white/50 uppercase mb-3">Verteilung nach Tier</div>
          <div className="flex h-4 rounded-full overflow-hidden bg-white/5">
            {FOUNDING_PASS_TIERS.map(t => {
              const count = stats.byTier[t.tier] ?? 0;
              const pct = (count / stats.total) * 100;
              if (pct === 0) return null;
              return (
                <div
                  key={t.tier}
                  className="h-full transition-colors"
                  style={{ width: `${pct}%`, backgroundColor: TIER_HEX[t.tier] }}
                  title={`${t.tier}: ${count} (${pct.toFixed(1)}%)`}
                />
              );
            })}
          </div>
          <div className="flex gap-4 mt-2 text-[10px] text-white/40">
            {FOUNDING_PASS_TIERS.map(t => (
              <span key={t.tier} className="flex items-center gap-1">
                <span className="size-2 rounded-full" style={{ backgroundColor: TIER_HEX[t.tier] }} />
                {t.tier}: <span className="font-mono tabular-nums">{stats.byTier[t.tier]}</span>
              </span>
            ))}
          </div>
        </Card>
      )}

      {/* Grant Form */}
      <Card className="p-4 space-y-3">
        <div className="text-xs font-bold text-white/50 uppercase">Founding Pass vergeben</div>
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="text-[11px] text-white/40 mb-1 block">User-ID (UUID)</label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-white/30" aria-hidden="true" />
              <input
                type="text"
                value={grantUserId}
                onChange={e => setGrantUserId(e.target.value)}
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                aria-label="User-ID eingeben"
                className="w-full pl-8 pr-3 py-2 text-sm bg-white/[0.04] border border-white/10 rounded-lg text-white placeholder:text-white/20 focus:outline-none focus:ring-1 focus:ring-gold/50"
              />
            </div>
          </div>
          <div className="w-32">
            <label className="text-[11px] text-white/40 mb-1 block">Tier</label>
            <select
              value={grantTier}
              onChange={e => setGrantTier(e.target.value as FoundingPassTier)}
              className="w-full px-3 py-2 text-sm bg-white/[0.04] border border-white/10 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-gold/50"
              aria-label="Pass-Tier auswählen"
            >
              {FOUNDING_PASS_TIERS.map(t => (
                <option key={t.tier} value={t.tier} className="bg-[#1a1a1a]">
                  {t.tier.charAt(0).toUpperCase() + t.tier.slice(1)} — {fmtScout(t.bcreditsCents / 100)} bC
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[150px]">
            <label className="text-[11px] text-white/40 mb-1 block">Referenz (optional)</label>
            <input
              type="text"
              value={grantRef}
              onChange={e => setGrantRef(e.target.value)}
              placeholder="z.B. Stripe pi_xxx"
              className="w-full px-3 py-2 text-sm bg-white/[0.04] border border-white/10 rounded-lg text-white placeholder:text-white/20 focus:outline-none focus:ring-1 focus:ring-gold/50"
            />
          </div>
          <Button variant="gold" size="sm" onClick={handleGrant} disabled={granting} aria-label="Founding Pass vergeben" className={cn('gap-1.5 min-h-[44px] min-w-[44px]', granting && 'opacity-50 cursor-not-allowed')}>
            {granting ? <Loader2 className="size-3.5 animate-spin motion-reduce:animate-none" /> : <Gift className="size-3.5" />}
            Vergeben
          </Button>
        </div>
        {grantError && (
          <div role="alert" className="flex items-center gap-1.5 text-xs text-red-400">
            <AlertCircle className="size-3.5 flex-shrink-0 min-w-[14px] min-h-[14px]" aria-hidden="true" />
            {grantError}
          </div>
        )}
      </Card>

      {/* Passes Table */}
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-white/40 border-b border-white/10">
                <th className="text-left py-2.5 px-3 font-bold">User</th>
                <th className="text-left py-2.5 px-3 font-bold">Tier</th>
                <th className="text-right py-2.5 px-3 font-bold">bCredits</th>
                <th className="text-right py-2.5 px-3 font-bold">EUR</th>
                <th className="text-right py-2.5 px-3 font-bold">Migration %</th>
                <th className="text-left py-2.5 px-3 font-bold">Referenz</th>
                <th className="text-left py-2.5 px-3 font-bold">Datum</th>
              </tr>
            </thead>
            <tbody>
              {passes.map(p => (
                <tr key={p.id} className="border-b border-white/[0.06] hover:bg-white/[0.02] transition-colors">
                  <td className="py-2 px-3 text-white/80">{p.profiles?.username ?? p.user_id.slice(0, 8)}</td>
                  <td className="py-2 px-3"><FoundingPassBadge tier={p.tier as FoundingPassTier} /></td>
                  <td className="py-2 px-3 text-right font-mono tabular-nums text-gold">{fmtScout(p.bcredits_granted)}</td>
                  <td className="py-2 px-3 text-right font-mono tabular-nums text-white/50">{(p.price_eur_cents / 100).toFixed(2)} €</td>
                  <td className="py-2 px-3 text-right font-mono tabular-nums text-white/50">+{p.migration_bonus_pct}%</td>
                  <td className="py-2 px-3 text-white/40 truncate max-w-[120px]">{p.payment_reference ?? '—'}</td>
                  <td className="py-2 px-3 text-white/40">{new Date(p.created_at).toLocaleDateString('de-DE')}</td>
                </tr>
              ))}
              {passes.length === 0 && (
                <tr><td colSpan={7} className="py-8 text-center text-white/30">Noch keine Founding Passes vergeben</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Refresh */}
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={() => { setLoading(true); loadData(); }} className="gap-1.5">
          <RefreshCw aria-hidden="true" className="size-3.5" />
          Aktualisieren
        </Button>
      </div>
    </div>
  );
}
