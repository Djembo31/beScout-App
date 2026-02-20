'use client';

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
  const estTotalCents = Math.round(floorBsd * 100) * pendingBuyQty;

  return (
    <Card className="overflow-hidden">
      <div className="bg-orange-500/20 border-b border-orange-500/30 p-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-orange-300" />
          <span className="font-black text-orange-300">Hinweis</span>
        </div>
      </div>
      <div className="p-4 space-y-3">
        <div className="text-sm text-white/80">
          Du hast aktuell <span className="font-bold text-[#FFD700]">
            {userOrders.reduce((sum, o) => sum + (o.quantity - o.filled_qty), 0)} DPC
          </span> zum Verkauf gelistet.
        </div>
        <div className="text-xs text-white/50 bg-white/[0.02] rounded-lg p-3">
          Deine eigenen Angebote werden beim Kauf übersprungen.
        </div>
        <div className="bg-black/20 rounded-lg px-3 py-2 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-white/40">ca. Kosten ({pendingBuyQty} &times; {fmtScout(floorBsd)})</span>
            <span className="font-mono font-bold text-[#FFD700]">{fmtScout(floorBsd * pendingBuyQty)} $SCOUT</span>
          </div>
          {balanceCents !== null && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-white/40">Guthaben danach</span>
              <span className={`font-mono font-bold ${balanceCents >= estTotalCents ? 'text-[#22C55E]' : 'text-red-400'}`}>
                {formatScout(balanceCents - estTotalCents)} $SCOUT
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="gold" size="sm" className="flex-1" onClick={() => onConfirmBuy(pendingBuyQty)} disabled={buying}>
            {buying ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Ja, {pendingBuyQty} DPC kaufen
          </Button>
          <Button variant="outline" size="sm" className="flex-1" onClick={onCancel}>
            Abbrechen
          </Button>
        </div>
      </div>
    </Card>
  );
}
