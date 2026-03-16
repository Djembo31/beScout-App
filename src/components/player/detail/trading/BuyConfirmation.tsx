'use client';

import { useTranslations } from 'next-intl';
import { AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { Card, Button } from '@/components/ui';
import { fmtScout } from '@/lib/utils';
import { formatScout } from '@/lib/services/wallet';
import type { DbOrder } from '@/types';

interface BuyConfirmationProps {
  pendingBuyQty: number;
  userOrders: DbOrder[];
  floorBsd: number;
  balanceCents: number | null;
  buying: boolean;
  onConfirmBuy: (qty: number) => void;
  onCancel: () => void;
}

export default function BuyConfirmation({
  pendingBuyQty, userOrders, floorBsd, balanceCents,
  buying, onConfirmBuy, onCancel,
}: BuyConfirmationProps) {
  const t = useTranslations('playerDetail');
  const estTotalCents = Math.round(floorBsd * 100) * pendingBuyQty;

  return (
    <Card className="overflow-hidden">
      <div className="bg-orange-500/20 border-b border-orange-500/30 p-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="size-5 text-orange-300" aria-hidden="true" />
          <span className="font-black text-orange-300">{t('notice')}</span>
        </div>
      </div>
      <div className="p-4 space-y-3">
        <div className="text-sm text-white/80">
          {t('ownOrdersListed', { count: userOrders.reduce((sum, o) => sum + (o.quantity - o.filled_qty), 0) })}
        </div>
        <div className="text-xs text-white/50 bg-surface-minimal rounded-lg p-3">
          {t('ownOrdersSkipped')}
        </div>
        <div className="bg-black/20 rounded-lg px-3 py-2 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-white/40">{t('estCost', { qty: pendingBuyQty, price: fmtScout(floorBsd) })}</span>
            <span className="font-mono font-bold tabular-nums text-gold">{fmtScout(floorBsd * pendingBuyQty)} CR</span>
          </div>
          {balanceCents !== null && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-white/40">{t('balanceAfter')}</span>
              <span className={`font-mono font-bold tabular-nums ${balanceCents >= estTotalCents ? 'text-green-500' : 'text-red-400'}`}>
                {formatScout(balanceCents - estTotalCents)} CR
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="gold" size="sm" className="flex-1" onClick={() => onConfirmBuy(pendingBuyQty)} disabled={buying}>
            {buying ? <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <CheckCircle2 className="size-4" aria-hidden="true" />}
            {t('confirmBuy', { qty: pendingBuyQty })}
          </Button>
          <Button variant="outline" size="sm" className="flex-1" onClick={onCancel}>
            {t('cancelAction')}
          </Button>
        </div>
      </div>
    </Card>
  );
}
