'use client';

import React from 'react';
import { Trophy, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui';
import { fmtScout } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import type { FantasyEvent } from '@/components/fantasy/types';

export interface JoinConfirmDialogProps {
  event: FantasyEvent;
  joining: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function JoinConfirmDialog({ event, joining, onConfirm, onCancel }: JoinConfirmDialogProps) {
  const t = useTranslations('fantasy');
  const ticketCost = event.ticketCost ?? 0;
  const hasCost = ticketCost > 0;

  return (
    <div className="absolute inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-[#141414] border border-white/10 rounded-2xl p-6 max-w-sm w-full">
        <div className="flex items-center gap-3 mb-4">
          <div className="size-10 rounded-xl bg-gold/10 flex items-center justify-center">
            <Trophy aria-hidden="true" className="size-5 text-gold" />
          </div>
          <div>
            <h3 className="font-bold text-white">{t('confirmJoinTitle')}</h3>
            <p className="text-xs text-white/50">{event.name}</p>
          </div>
        </div>
        <div className="space-y-2 mb-5 text-sm">
          {/* Cost display -- currency-aware */}
          <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/5">
            <span className="text-white/60">{t('entryFeeLabel')}</span>
            {event.currency === 'tickets' && ticketCost > 0 ? (
              <span className="font-bold font-mono tabular-nums text-amber-400">{t('ticketCost', { cost: ticketCost })}</span>
            ) : event.currency === 'scout' && ticketCost > 0 ? (
              <span className="font-bold font-mono tabular-nums text-gold">{fmtScout(ticketCost / 100)} $SCOUT</span>
            ) : (
              <span className="font-bold text-green-500">{t('freeLabel')}</span>
            )}
          </div>
          <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/5">
            <span className="text-white/60">{t('formatLabel')}</span>
            <span className="font-mono text-white">{event.format}</span>
          </div>
        </div>
        {hasCost && (
          <p className="text-xs text-white/40 mb-4">
            {t('entryFeeNote')}
          </p>
        )}
        <div className="flex gap-3">
          <Button variant="outline" size="lg" fullWidth onClick={onCancel}>
            {t('cancelBtn')}
          </Button>
          <Button variant="gold" size="lg" fullWidth onClick={onConfirm} disabled={joining}>
            {joining ? <Loader2 aria-hidden="true" className="size-4 animate-spin motion-reduce:animate-none" /> : <CheckCircle2 aria-hidden="true" className="size-4" />}
            {joining ? t('confirming') : t('confirmBtn')}
          </Button>
        </div>
      </div>
    </div>
  );
}
