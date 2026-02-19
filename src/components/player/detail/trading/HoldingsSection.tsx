'use client';

import React, { useState } from 'react';
import { ShoppingCart, Send, Briefcase, Loader2 } from 'lucide-react';
import { Card, Button } from '@/components/ui';
import { fmtBSD } from '@/lib/utils';
import { formatBsd } from '@/lib/services/wallet';
import type { Player, DbOrder } from '@/types';

interface HoldingsSectionProps {
  player: Player;
  holdingQty: number;
  floorPriceCents: number;
  userOrders: DbOrder[];
  onSell: (qty: number, priceCents: number) => void;
  onCancelOrder: (orderId: string) => void;
  selling: boolean;
  cancellingId: string | null;
}

export default function HoldingsSection({
  player, holdingQty, floorPriceCents, userOrders, onSell, onCancelOrder, selling, cancellingId,
}: HoldingsSectionProps) {
  const circulation = player.dpc.circulation || 1;
  const share = holdingQty / circulation;
  const [showSellForm, setShowSellForm] = useState(false);
  const [sellQty, setSellQty] = useState(1);
  const [sellPriceBsd, setSellPriceBsd] = useState('');
  const listedQty = userOrders.reduce((sum, o) => sum + (o.quantity - o.filled_qty), 0);
  const availableToSell = holdingQty - listedQty;
  const floorBsd = floorPriceCents / 100;

  return (
    <Card className="overflow-hidden">
      <div className="bg-gradient-to-r from-[#22C55E]/20 to-[#22C55E]/5 border-b border-[#22C55E]/20 p-4">
        <div className="flex items-center gap-2">
          <Briefcase className="w-5 h-5 text-[#22C55E]" />
          <span className="font-black text-[#22C55E]">Deine Position</span>
        </div>
      </div>
      <div className="p-4 space-y-3">
        {holdingQty > 0 && (
          <>
            <div className="flex items-center justify-between">
              <span className="text-white/50">DPC Besitz</span>
              <span className="font-mono font-bold text-lg">{holdingQty} DPC</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/50">Anteil am Float</span>
              <span className="font-mono font-bold">{(share * 100).toFixed(2)}%</span>
            </div>
            {listedQty > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-white/50">Davon gelistet</span>
                <span className="font-mono font-bold text-orange-300">{listedQty} DPC</span>
              </div>
            )}
          </>
        )}
        {/* Sell form */}
        {availableToSell > 0 && (
          <div className="pt-3 border-t border-white/10 space-y-3">
            {!showSellForm ? (
              <Button variant="outline" fullWidth size="sm" onClick={() => {
                setSellPriceBsd(floorBsd > 0 ? floorBsd.toString() : '');
                setSellQty(1);
                setShowSellForm(true);
              }}>
                <ShoppingCart className="w-4 h-4" /> Verkaufen
              </Button>
            ) : (
              <div className="bg-white/[0.02] border border-white/10 rounded-xl p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm">DPC verkaufen</span>
                  <button onClick={() => setShowSellForm(false)} className="text-white/40 hover:text-white text-xs">Abbrechen</button>
                </div>
                <div>
                  <label className="text-xs text-white/50 mb-1 block">Anzahl (max. {availableToSell})</label>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setSellQty(Math.max(1, sellQty - 1))}
                      className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 font-bold hover:bg-white/10 text-sm">-</button>
                    <input type="number" value={sellQty} min={1} max={availableToSell}
                      onChange={(e) => setSellQty(Math.max(1, Math.min(availableToSell, parseInt(e.target.value) || 1)))}
                      className="flex-1 text-center bg-white/5 border border-white/10 rounded-lg py-1.5 font-mono font-bold text-sm" />
                    <button onClick={() => setSellQty(Math.min(availableToSell, sellQty + 1))}
                      className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 font-bold hover:bg-white/10 text-sm">+</button>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-white/50 mb-1 block">Preis pro DPC (BSD)</label>
                  <input
                    type="number" value={sellPriceBsd} min={1} step={1}
                    placeholder={floorBsd > 0 ? `z.B. ${floorBsd}` : 'Preis eingeben'}
                    onChange={(e) => setSellPriceBsd(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 font-mono font-bold text-sm"
                  />
                  {floorBsd > 0 && (
                    <div className="mt-1.5 space-y-1">
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => setSellPriceBsd(floorBsd.toString())}
                          className="px-2 py-0.5 rounded-lg bg-white/5 border border-white/10 text-[10px] font-bold text-white/50 hover:text-white hover:bg-white/10 transition-all">Floor</button>
                        <button onClick={() => setSellPriceBsd(Math.ceil(floorBsd * 1.05).toString())}
                          className="px-2 py-0.5 rounded-lg bg-white/5 border border-white/10 text-[10px] font-bold text-white/50 hover:text-white hover:bg-white/10 transition-all">+5%</button>
                        <button onClick={() => setSellPriceBsd(Math.ceil(floorBsd * 1.10).toString())}
                          className="px-2 py-0.5 rounded-lg bg-white/5 border border-white/10 text-[10px] font-bold text-white/50 hover:text-white hover:bg-white/10 transition-all">+10%</button>
                        <span className="text-[10px] text-white/25 ml-1">Floor: {fmtBSD(floorBsd)}</span>
                      </div>
                    </div>
                  )}
                </div>
                {/* Fee breakdown */}
                {sellPriceBsd && Number(sellPriceBsd) > 0 && (() => {
                  const gross = sellQty * Number(sellPriceBsd);
                  const feePct = 6;
                  const fee = gross * feePct / 100;
                  const net = gross - fee;
                  return (
                    <div className="bg-black/20 rounded-lg px-3 py-2 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-white/40">Brutto</span>
                        <span className="font-mono text-white/40">{fmtBSD(gross)} BSD</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-white/40">Gebühr ({feePct}%)</span>
                        <span className="font-mono text-red-400/70">-{fmtBSD(fee)} BSD</span>
                      </div>
                      <div className="border-t border-white/10 pt-1.5 flex items-center justify-between text-sm">
                        <span className="text-white/50">Netto-Erlös</span>
                        <span className="font-mono font-bold text-[#FFD700]">{fmtBSD(net)} BSD</span>
                      </div>
                    </div>
                  );
                })()}
                <Button variant="gold" fullWidth size="sm"
                  onClick={() => {
                    const priceCents = Math.round(Number(sellPriceBsd) * 100);
                    if (priceCents > 0 && sellQty > 0) {
                      onSell(sellQty, priceCents);
                      setShowSellForm(false);
                    }
                  }}
                  disabled={selling || !sellPriceBsd || Number(sellPriceBsd) <= 0}
                >
                  {selling ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {selling ? 'Wird gelistet...' : `${sellQty} DPC listen`}
                </Button>
              </div>
            )}
          </div>
        )}
        {/* Active Sell Orders */}
        {userOrders.length > 0 && (
          <div className="pt-3 border-t border-white/10">
            <div className="text-xs text-white/40 mb-2">Deine aktiven Angebote</div>
            <div className="space-y-2">
              {userOrders.map((order) => {
                const remaining = order.quantity - order.filled_qty;
                return (
                  <div key={order.id} className="flex items-center justify-between p-2 bg-white/[0.02] rounded-lg border border-white/10">
                    <div>
                      <div className="font-mono font-bold text-sm text-[#FFD700]">{formatBsd(order.price)} BSD</div>
                      <div className="text-[10px] text-white/40">
                        {remaining}/{order.quantity} DPC
                        {order.filled_qty > 0 && <span className="text-[#22C55E]"> &middot; {order.filled_qty} verkauft</span>}
                      </div>
                    </div>
                    <button
                      onClick={() => onCancelOrder(order.id)}
                      disabled={cancellingId === order.id}
                      className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded-lg hover:bg-red-500/10 transition-all disabled:opacity-50"
                    >
                      {cancellingId === order.id ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Stornieren'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
