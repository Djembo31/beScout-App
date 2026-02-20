'use client';

import { useState } from 'react';
import { Send, Briefcase, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { Modal, Card, Button } from '@/components/ui';
import { fmtScout } from '@/lib/utils';
import { formatScout } from '@/lib/services/wallet';
import type { Player, DbOrder } from '@/types';

interface SellModalProps {
  open: boolean;
  onClose: () => void;
  player: Player;
  holdingQty: number;
  userOrders: DbOrder[];
  onSell: (qty: number, priceCents: number) => void;
  onCancelOrder: (orderId: string) => void;
  selling: boolean;
  cancellingId: string | null;
}

export default function SellModal({
  open, onClose, player, holdingQty, userOrders,
  onSell, onCancelOrder, selling, cancellingId,
}: SellModalProps) {
  const [sellQty, setSellQty] = useState(1);
  const [sellPriceBsd, setSellPriceBsd] = useState('');
  const [sellSuccess, setSellSuccess] = useState<string | null>(null);
  const [sellError, setSellError] = useState<string | null>(null);

  const circulation = player.dpc.circulation || 1;
  const share = holdingQty / circulation;
  const listedQty = userOrders.reduce((sum, o) => sum + (o.quantity - o.filled_qty), 0);
  const availableToSell = holdingQty - listedQty;
  const floorPriceCents = Math.round((player.prices.floor ?? 0) * 100);
  const floorBsd = floorPriceCents / 100;

  const handleSell = () => {
    const priceCents = Math.round(Number(sellPriceBsd) * 100);
    if (priceCents > 0 && sellQty > 0) {
      setSellError(null);
      onSell(sellQty, priceCents);
    }
  };

  // Fee breakdown
  const gross = sellQty * Number(sellPriceBsd || 0);
  const feePct = 6;
  const fee = gross * feePct / 100;
  const net = gross - fee;
  const showFee = sellPriceBsd && Number(sellPriceBsd) > 0;

  return (
    <Modal open={open} onClose={onClose} title="Verkaufen" subtitle={`${player.first} ${player.last}`}>
      <div className="-mx-4 -mb-4 sm:-mx-6 sm:-mb-6">
        <div className="space-y-4 p-4 sm:p-6">
          {/* Toast messages */}
          {sellSuccess && (
            <div className="bg-[#22C55E]/20 border border-[#22C55E]/30 text-[#22C55E] rounded-xl px-4 py-3 text-sm font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              {sellSuccess}
            </div>
          )}
          {sellError && (
            <div className="bg-red-500/20 border border-red-500/30 text-red-300 rounded-xl px-4 py-3 text-sm font-bold flex items-center gap-2">
              <XCircle className="w-4 h-4" />
              {sellError}
            </div>
          )}

          {/* Position Info */}
          <Card className="overflow-hidden">
            <div className="bg-gradient-to-r from-[#22C55E]/20 to-[#22C55E]/5 border-b border-[#22C55E]/20 p-4">
              <div className="flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-[#22C55E]" />
                <span className="font-black text-[#22C55E]">Deine Position</span>
              </div>
            </div>
            <div className="p-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/50">DPC Besitz</span>
                <span className="font-mono font-bold text-lg">{holdingQty} DPC</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/50">Anteil am Float</span>
                <span className="font-mono font-bold">{(share * 100).toFixed(2)}%</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/50">Verfügbar</span>
                <span className="font-mono font-bold text-[#22C55E]">{availableToSell} DPC</span>
              </div>
              {listedQty > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/50">Gelistet</span>
                  <span className="font-mono font-bold text-orange-300">{listedQty} DPC</span>
                </div>
              )}
            </div>
          </Card>

          {/* Sell Form */}
          {availableToSell > 0 && (
            <Card className="p-4 space-y-3">
              <span className="font-bold text-sm">Neue Order</span>

              {/* Quantity */}
              <div>
                <label className="text-xs text-white/50 mb-1 block">Anzahl (max. {availableToSell})</label>
                <div className="flex items-center gap-2">
                  <button onClick={() => setSellQty(Math.max(1, sellQty - 1))}
                    className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-lg bg-white/5 border border-white/10 font-bold hover:bg-white/10 text-sm">-</button>
                  <input type="number" inputMode="numeric" value={sellQty} min={1} max={availableToSell}
                    onChange={(e) => setSellQty(Math.max(1, Math.min(availableToSell, parseInt(e.target.value) || 1)))}
                    className="flex-1 text-center bg-white/5 border border-white/10 rounded-lg py-1.5 font-mono font-bold text-base" />
                  <button onClick={() => setSellQty(Math.min(availableToSell, sellQty + 1))}
                    className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-lg bg-white/5 border border-white/10 font-bold hover:bg-white/10 text-sm">+</button>
                </div>
              </div>

              {/* Price */}
              <div>
                <label className="text-xs text-white/50 mb-1 block">Preis pro DPC ($SCOUT)</label>
                <input
                  type="number" inputMode="numeric" value={sellPriceBsd} min={1} step={1}
                  placeholder={floorBsd > 0 ? `z.B. ${floorBsd}` : 'Preis eingeben'}
                  onChange={(e) => setSellPriceBsd(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 font-mono font-bold text-base"
                />
                {/* Quick-Price Presets */}
                {floorBsd > 0 && (
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <button onClick={() => setSellPriceBsd(floorBsd.toString())}
                      className="px-2.5 py-1.5 min-h-[36px] rounded-lg bg-white/5 border border-white/10 text-[11px] font-bold text-white/50 hover:text-white hover:bg-white/10 transition-all">Floor</button>
                    <button onClick={() => setSellPriceBsd(Math.ceil(floorBsd * 1.05).toString())}
                      className="px-2.5 py-1.5 min-h-[36px] rounded-lg bg-white/5 border border-white/10 text-[11px] font-bold text-white/50 hover:text-white hover:bg-white/10 transition-all">+5%</button>
                    <button onClick={() => setSellPriceBsd(Math.ceil(floorBsd * 1.10).toString())}
                      className="px-2.5 py-1.5 min-h-[36px] rounded-lg bg-white/5 border border-white/10 text-[11px] font-bold text-white/50 hover:text-white hover:bg-white/10 transition-all">+10%</button>
                    <button onClick={() => setSellPriceBsd(Math.ceil(floorBsd * 1.20).toString())}
                      className="px-2.5 py-1.5 min-h-[36px] rounded-lg bg-white/5 border border-white/10 text-[11px] font-bold text-white/50 hover:text-white hover:bg-white/10 transition-all">+20%</button>
                    <span className="text-[11px] text-white/25 ml-1">Floor: {fmtScout(floorBsd)}</span>
                  </div>
                )}
              </div>

              {/* Fee breakdown */}
              {showFee && (
                <div className="bg-black/20 rounded-lg px-3 py-2 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white/40">Brutto</span>
                    <span className="font-mono text-white/40">{fmtScout(gross)} $SCOUT</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white/40">Gebühr ({feePct}%)</span>
                    <span className="font-mono text-red-400/70">-{fmtScout(fee)} $SCOUT</span>
                  </div>
                  <div className="border-t border-white/10 pt-1.5 flex items-center justify-between text-sm">
                    <span className="text-white/50">Netto-Erlös</span>
                    <span className="font-mono font-bold text-[#FFD700]">{fmtScout(net)} $SCOUT</span>
                  </div>
                </div>
              )}

              {/* Submit */}
              <Button variant="gold" fullWidth size="lg"
                onClick={handleSell}
                disabled={selling || !sellPriceBsd || Number(sellPriceBsd) <= 0}
              >
                {selling ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {selling ? 'Wird gelistet...' : `Für ${showFee ? fmtScout(Number(sellPriceBsd)) : '...'} $SCOUT listen`}
              </Button>
            </Card>
          )}

          {/* Active Listings */}
          {userOrders.length > 0 && (
            <Card className="p-4">
              <div className="text-xs text-white/40 mb-3 font-bold">Aktive Listings</div>
              <div className="space-y-2">
                {userOrders.map((order) => {
                  const remaining = order.quantity - order.filled_qty;
                  return (
                    <div key={order.id} className="flex items-center justify-between p-3 bg-white/[0.02] rounded-xl border border-white/10">
                      <div>
                        <div className="font-mono font-bold text-sm text-[#FFD700]">{formatScout(order.price)} $SCOUT</div>
                        <div className="text-[10px] text-white/40">
                          {remaining}/{order.quantity} DPC
                          {order.filled_qty > 0 && <span className="text-[#22C55E]"> &middot; {order.filled_qty} verkauft</span>}
                        </div>
                      </div>
                      <button
                        onClick={() => onCancelOrder(order.id)}
                        disabled={cancellingId === order.id}
                        className="text-xs text-red-400 hover:text-red-300 px-3 py-2 min-h-[44px] rounded-lg hover:bg-red-500/10 transition-all disabled:opacity-50"
                      >
                        {cancellingId === order.id ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Stornieren'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </div>
      </div>
    </Modal>
  );
}
