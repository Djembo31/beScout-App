'use client';

import React, { useState } from 'react';
import { ShoppingCart, Users, Target, Loader2 } from 'lucide-react';
import { Card, Button } from '@/components/ui';
import { fmtBSD } from '@/lib/utils';
import { formatBsd } from '@/lib/services/wallet';
import type { Player } from '@/types';

interface TransferBuySectionProps {
  player: Player;
  balanceCents: number | null;
  holdingQty: number;
  sellOrderCount: number;
  onBuy: (qty: number) => void;
  buying: boolean;
}

export default function TransferBuySection({
  player, balanceCents, holdingQty, sellOrderCount, onBuy, buying,
}: TransferBuySectionProps) {
  const [buyQty, setBuyQty] = useState(1);
  const floorCents = Math.round((player.prices.floor ?? 0) * 100);
  const floorBsd = player.prices.floor ?? 0;
  const totalBsd = floorBsd * buyQty;
  const canAfford = balanceCents !== null && balanceCents >= floorCents * buyQty;
  const hasOrders = sellOrderCount > 0;
  const maxQty = hasOrders
    ? Math.min(sellOrderCount, balanceCents !== null ? Math.floor(balanceCents / Math.max(floorCents, 1)) : 0)
    : 0;

  return (
    <Card className="overflow-hidden">
      <div className="bg-gradient-to-r from-sky-500/10 to-sky-500/5 border-b border-sky-500/20 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-sky-300" />
            <span className="font-black text-sky-300">Transfermarkt</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-white/50">
            <span>{holdingQty} im Besitz</span>
          </div>
        </div>
      </div>
      <div className="p-4 space-y-4">
        {hasOrders ? (
          <>
            <div className="bg-sky-500/10 border border-sky-500/20 rounded-xl p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 text-sky-300" />
                  <span className="text-sm text-sky-300 font-bold">User-Angebote</span>
                </div>
                <span className="font-mono font-black text-lg text-[#FFD700]">{fmtBSD(floorBsd)} BSD</span>
              </div>
              <div className="text-[10px] text-white/40 mt-1">{sellOrderCount} Angebot{sellOrderCount !== 1 ? 'e' : ''} von Usern</div>
            </div>
            <div>
              <label className="text-xs text-white/50 mb-2 block">Anzahl</label>
              <div className="flex items-center gap-2">
                <button onClick={() => setBuyQty(Math.max(1, buyQty - 1))}
                  className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl bg-white/5 border border-white/10 font-bold hover:bg-white/10">-</button>
                <input type="number" inputMode="numeric" value={buyQty} min={1} max={maxQty || undefined}
                  onChange={(e) => setBuyQty(Math.max(1, Math.min(maxQty || 999, parseInt(e.target.value) || 1)))}
                  className="flex-1 text-center bg-white/5 border border-white/10 rounded-xl py-2 font-mono font-bold text-base" />
                <button onClick={() => setBuyQty(Math.min(maxQty || buyQty + 1, buyQty + 1))}
                  className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl bg-white/5 border border-white/10 font-bold hover:bg-white/10">+</button>
              </div>
            </div>
            <div className="bg-black/20 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-white/40">Preis pro DPC</span>
                <span className="font-mono text-white/60">{fmtBSD(floorBsd)} BSD</span>
              </div>
              {buyQty > 1 && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/40">Anzahl</span>
                  <span className="font-mono text-white/60">&times; {buyQty}</span>
                </div>
              )}
              <div className="border-t border-white/10 pt-2 flex items-center justify-between">
                <span className="text-white/50 text-sm">Gesamtkosten</span>
                <span className="font-mono font-black text-xl text-[#FFD700]">{fmtBSD(totalBsd)} BSD</span>
              </div>
              <div className="border-t border-white/10 pt-2 flex items-center justify-between text-xs">
                <span className="text-white/40">Dein Guthaben</span>
                <span className="font-mono text-white/50">{balanceCents !== null ? formatBsd(balanceCents) : '...'} BSD</span>
              </div>
              {balanceCents !== null && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/40">Guthaben danach</span>
                  <span className={`font-mono font-bold ${canAfford ? 'text-[#22C55E]' : 'text-red-400'}`}>
                    {formatBsd(balanceCents - floorCents * buyQty)} BSD
                  </span>
                </div>
              )}
            </div>
            <Button variant="gold" fullWidth size="lg" onClick={() => onBuy(buyQty)} disabled={buying || !canAfford}>
              {buying ? <Loader2 className="w-5 h-5 animate-spin" /> : <Target className="w-5 h-5" />}
              {buying ? 'Wird gekauft...' : `${buyQty} DPC kaufen`}
            </Button>
            {!canAfford && !buying && <div className="text-xs text-red-400 text-center">Nicht genug BSD</div>}
          </>
        ) : (
          <div className="py-6 text-center">
            <ShoppingCart className="w-10 h-10 mx-auto mb-3 text-white/20" />
            <div className="text-white/50 mb-1">Keine User-Angebote</div>
            <div className="text-xs text-white/30">Noch hat niemand DPCs dieses Spielers zum Verkauf gelistet</div>
          </div>
        )}
      </div>
    </Card>
  );
}
