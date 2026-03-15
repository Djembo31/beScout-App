'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Wallet, ArrowDownToLine, Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Card, Skeleton } from '@/components/ui';
import { cn } from '@/lib/utils';
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

export default function AdminWithdrawalTab({ club }: { club: ClubWithAdmin }) {
  const t = useTranslations('admin');
  const [balance, setBalance] = useState<ClubBalance | null>(null);
  const [withdrawals, setWithdrawals] = useState<(DbClubWithdrawal & { requester_handle: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const STATUS_MAP: Record<string, { label: string; color: string; icon: React.ElementType }> = {
    pending: { label: t('wdStatusPending'), color: 'text-amber-400', icon: Clock },
    approved: { label: t('wdStatusApproved'), color: 'text-green-500', icon: CheckCircle },
    rejected: { label: t('wdStatusRejected'), color: 'text-red-400', icon: XCircle },
    paid: { label: t('wdStatusPaid'), color: 'text-gold', icon: CheckCircle },
  };

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
      setFeedback({ type: 'error', msg: t('wdMinAmount') });
      return;
    }
    const cents = Math.round(amountNum * 100);
    if (balance && cents > balance.available) {
      setFeedback({ type: 'error', msg: t('wdInsufficientBalance', { available: formatScout(balance.available) }) });
      return;
    }
    setSubmitting(true);
    setFeedback(null);
    try {
      const result = await requestClubWithdrawal(club.id, cents, note || undefined);
      if (result.success) {
        setFeedback({ type: 'success', msg: t('wdCreated') });
        setAmount('');
        setNote('');
        load();
      } else {
        setFeedback({ type: 'error', msg: result.error ?? t('wdCreateError') });
      }
    } catch (err) {
      setFeedback({ type: 'error', msg: err instanceof Error ? err.message : t('wdUnknownError') });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-black text-balance">{t('withdrawalTitle')}</h2>

      {/* Balance Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="p-4 bg-gold/[0.06] border-gold/20">
          <div className="text-[10px] text-white/40 uppercase mb-1">{t('wdAvailable')}</div>
          {loading ? <Skeleton className="h-7 w-24" /> : (
            <div className="text-xl font-mono font-black text-gold tabular-nums">{formatScout(balance?.available ?? 0)} bCredits</div>
          )}
        </Card>
        <Card className="p-4">
          <div className="text-[10px] text-white/40 uppercase mb-1">{t('wdTotalEarned')}</div>
          {loading ? <Skeleton className="h-7 w-24" /> : (
            <div className="text-xl font-mono font-black tabular-nums">{formatScout(balance?.total_earned ?? 0)} bCredits</div>
          )}
        </Card>
        <Card className="p-4">
          <div className="text-[10px] text-white/40 uppercase mb-1">{t('wdTradingFees')}</div>
          {loading ? <Skeleton className="h-7 w-24" /> : (
            <div className="text-sm font-mono font-bold text-emerald-400 tabular-nums">{formatScout(balance?.trade_fees ?? 0)} bCredits</div>
          )}
        </Card>
        <Card className="p-4">
          <div className="text-[10px] text-white/40 uppercase mb-1">{t('wdAlreadyPaid')}</div>
          {loading ? <Skeleton className="h-7 w-24" /> : (
            <div className="text-sm font-mono font-bold text-white/60 tabular-nums">{formatScout(balance?.total_withdrawn ?? 0)} bCredits</div>
          )}
        </Card>
      </div>

      {/* Withdrawal Form */}
      <Card className="p-6">
        <h3 className="text-sm font-bold text-white/70 mb-4 flex items-center gap-2">
          <ArrowDownToLine className="size-4" aria-hidden="true" />
          {t('wdRequestTitle')}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-white/50 mb-1">{t('wdAmountLabel')}</label>
              <input
                type="number"
                inputMode="numeric"
                min="1"
                step="0.01"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder={t('wdAmountPlaceholder')}
                className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-gold/50"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-white/50 mb-1">{t('wdNoteLabel')}</label>
              <input
                type="text"
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder={t('wdNotePlaceholder')}
                maxLength={200}
                className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-gold/50"
              />
            </div>
          </div>
          {feedback && (
            <div className={cn('text-sm px-3 py-2 rounded-lg', feedback.type === 'success' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-400')} role="alert">
              {feedback.msg}
            </div>
          )}
          <button
            type="submit"
            disabled={submitting || loading}
            className="px-6 py-2.5 bg-gold text-black rounded-xl font-bold text-sm hover:bg-gold/90 disabled:opacity-50 flex items-center gap-2 transition-colors"
          >
            {submitting ? <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Wallet className="size-4" aria-hidden="true" />}
            {t('wdSubmitBtn')}
          </button>
        </form>
      </Card>

      {/* Withdrawal History */}
      <Card className="p-6">
        <h3 className="text-sm font-bold text-white/70 mb-4">{t('wdHistoryTitle')}</h3>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}
          </div>
        ) : withdrawals.length === 0 ? (
          <div className="text-center py-8 text-sm text-white/30 text-pretty">{t('wdNoWithdrawals')}</div>
        ) : (
          <div className="space-y-2">
            {withdrawals.map(w => {
              const status = STATUS_MAP[w.status] ?? STATUS_MAP.pending;
              const StatusIcon = status.icon;
              return (
                <div key={w.id} className="flex items-center justify-between bg-surface-minimal rounded-xl px-4 py-3 border border-white/[0.06]">
                  <div className="flex items-center gap-3">
                    <StatusIcon className={cn('size-4', status.color)} aria-hidden="true" />
                    <div>
                      <div className="text-sm font-mono font-bold tabular-nums">{formatScout(w.amount_cents)} bCredits</div>
                      {w.note && <div className="text-xs text-white/40">{w.note}</div>}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={cn('text-xs font-semibold', status.color)}>{status.label}</div>
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
