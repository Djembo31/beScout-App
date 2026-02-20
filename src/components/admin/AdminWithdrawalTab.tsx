'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Wallet, ArrowDownToLine, Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Card, Skeleton } from '@/components/ui';
import { getClubBalance, getClubWithdrawals, requestClubWithdrawal } from '@/lib/services/club';
import { formatScout } from '@/lib/services/wallet';
import type { ClubWithAdmin, ClubBalance, DbClubWithdrawal } from '@/types';

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const mins = Math.floor((now - then) / 60000);
  if (mins < 60) return `vor ${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `vor ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `vor ${days}d`;
  return new Date(dateStr).toLocaleDateString('de-DE');
}

const STATUS_MAP: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  pending: { label: 'Ausstehend', color: 'text-amber-400', icon: Clock },
  approved: { label: 'Genehmigt', color: 'text-[#22C55E]', icon: CheckCircle },
  rejected: { label: 'Abgelehnt', color: 'text-red-400', icon: XCircle },
  paid: { label: 'Ausgezahlt', color: 'text-[#FFD700]', icon: CheckCircle },
};

export default function AdminWithdrawalTab({ club }: { club: ClubWithAdmin }) {
  const [balance, setBalance] = useState<ClubBalance | null>(null);
  const [withdrawals, setWithdrawals] = useState<(DbClubWithdrawal & { requester_handle: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [b, w] = await Promise.all([
        getClubBalance(club.id),
        getClubWithdrawals(club.id),
      ]);
      setBalance(b);
      setWithdrawals(w);
    } catch (err) {
      console.error('[AdminWithdrawal] Load failed:', err);
    } finally {
      setLoading(false);
    }
  }, [club.id]);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(amount);
    if (!amountNum || amountNum < 1) {
      setFeedback({ type: 'error', msg: 'Mindestbetrag: 1 $SCOUT.' });
      return;
    }
    const cents = Math.round(amountNum * 100);
    if (balance && cents > balance.available) {
      setFeedback({ type: 'error', msg: `Nicht genug Guthaben. Verfügbar: ${formatScout(balance.available)} $SCOUT.` });
      return;
    }
    setSubmitting(true);
    setFeedback(null);
    try {
      const result = await requestClubWithdrawal(club.id, cents, note || undefined);
      if (result.success) {
        setFeedback({ type: 'success', msg: 'Auszahlungsantrag erstellt!' });
        setAmount('');
        setNote('');
        load();
      } else {
        setFeedback({ type: 'error', msg: result.error ?? 'Fehler beim Erstellen.' });
      }
    } catch (err) {
      setFeedback({ type: 'error', msg: err instanceof Error ? err.message : 'Unbekannter Fehler.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-black">Auszahlung</h2>

      {/* Balance Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="p-4 bg-gradient-to-br from-[#FFD700]/10 to-[#FFD700]/[0.02] border-[#FFD700]/20">
          <div className="text-[10px] text-white/40 uppercase tracking-wider mb-1">Verfügbar</div>
          {loading ? <Skeleton className="h-7 w-24" /> : (
            <div className="text-xl font-mono font-black text-[#FFD700]">{formatScout(balance?.available ?? 0)} $SCOUT</div>
          )}
        </Card>
        <Card className="p-4">
          <div className="text-[10px] text-white/40 uppercase tracking-wider mb-1">Gesamt verdient</div>
          {loading ? <Skeleton className="h-7 w-24" /> : (
            <div className="text-xl font-mono font-black">{formatScout(balance?.total_earned ?? 0)} $SCOUT</div>
          )}
        </Card>
        <Card className="p-4">
          <div className="text-[10px] text-white/40 uppercase tracking-wider mb-1">Trading-Fees</div>
          {loading ? <Skeleton className="h-7 w-24" /> : (
            <div className="text-sm font-mono font-bold text-emerald-400">{formatScout(balance?.trade_fees ?? 0)} $SCOUT</div>
          )}
        </Card>
        <Card className="p-4">
          <div className="text-[10px] text-white/40 uppercase tracking-wider mb-1">Bereits ausgezahlt</div>
          {loading ? <Skeleton className="h-7 w-24" /> : (
            <div className="text-sm font-mono font-bold text-white/60">{formatScout(balance?.total_withdrawn ?? 0)} $SCOUT</div>
          )}
        </Card>
      </div>

      {/* Withdrawal Form */}
      <Card className="p-6">
        <h3 className="text-sm font-bold text-white/70 mb-4 flex items-center gap-2">
          <ArrowDownToLine className="w-4 h-4" />
          Auszahlung beantragen
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-white/50 mb-1">Betrag ($SCOUT)</label>
              <input
                type="number"
                inputMode="numeric"
                min="1"
                step="0.01"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="z.B. 500"
                className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#FFD700]/50"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-white/50 mb-1">Notiz (optional)</label>
              <input
                type="text"
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="z.B. Monatliche Auszahlung"
                maxLength={200}
                className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#FFD700]/50"
              />
            </div>
          </div>
          {feedback && (
            <div className={`text-sm px-3 py-2 rounded-lg ${feedback.type === 'success' ? 'bg-[#22C55E]/10 text-[#22C55E]' : 'bg-red-500/10 text-red-400'}`}>
              {feedback.msg}
            </div>
          )}
          <button
            type="submit"
            disabled={submitting || loading}
            className="px-6 py-2.5 bg-[#FFD700] text-black rounded-xl font-bold text-sm hover:bg-[#FFD700]/90 disabled:opacity-50 flex items-center gap-2"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wallet className="w-4 h-4" />}
            Auszahlung beantragen
          </button>
        </form>
      </Card>

      {/* Withdrawal History */}
      <Card className="p-6">
        <h3 className="text-sm font-bold text-white/70 mb-4">Auszahlungsverlauf</h3>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}
          </div>
        ) : withdrawals.length === 0 ? (
          <div className="text-center py-8 text-sm text-white/30">Noch keine Auszahlungen beantragt.</div>
        ) : (
          <div className="space-y-2">
            {withdrawals.map(w => {
              const status = STATUS_MAP[w.status] ?? STATUS_MAP.pending;
              const StatusIcon = status.icon;
              return (
                <div key={w.id} className="flex items-center justify-between bg-white/[0.02] rounded-xl px-4 py-3 border border-white/[0.06]">
                  <div className="flex items-center gap-3">
                    <StatusIcon className={`w-4 h-4 ${status.color}`} />
                    <div>
                      <div className="text-sm font-mono font-bold">{formatScout(w.amount_cents)} $SCOUT</div>
                      {w.note && <div className="text-xs text-white/40">{w.note}</div>}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-xs font-semibold ${status.color}`}>{status.label}</div>
                    <div className="text-[10px] text-white/25">{timeAgo(w.created_at)}</div>
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
