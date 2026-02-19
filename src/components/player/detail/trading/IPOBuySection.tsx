'use client';

import React, { useState } from 'react';
import { Clock, Zap, Lock, Loader2 } from 'lucide-react';
import { Card, Button } from '@/components/ui';
import { fmtBSD } from '@/lib/utils';
import { centsToBsd } from '@/lib/services/players';
import { formatBsd } from '@/lib/services/wallet';
import type { DbIpo } from '@/types';

const formatCountdown = (isoDate: string) => {
  const ms = Math.max(0, new Date(isoDate).getTime() - Date.now());
  const hours = Math.floor(ms / 3600000);
  const mins = Math.floor((ms % 3600000) / 60000);
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  }
  return `${hours}h ${mins}m`;
};

interface IPOBuySectionProps {
  ipo: DbIpo;
  userPurchased: number;
  balanceCents: number | null;
  onBuy: (qty: number) => void;
  buying: boolean;
}

export default function IPOBuySection({
  ipo, userPurchased, balanceCents, onBuy, buying,
}: IPOBuySectionProps) {
  const [buyQty, setBuyQty] = useState(1);
  const priceBsd = centsToBsd(ipo.price);
  const remaining = ipo.total_offered - ipo.sold;
  const progress = (ipo.sold / ipo.total_offered) * 100;
  const canBuyMore = userPurchased < ipo.max_per_user;
  const maxBuy = Math.min(ipo.max_per_user - userPurchased, remaining);
  const totalCents = ipo.price * buyQty;
  const totalBsd = centsToBsd(totalCents);
  const canAfford = balanceCents !== null && balanceCents >= totalCents;

  return (
    <Card className="overflow-hidden">
      <div className="bg-gradient-to-r from-[#22C55E]/20 to-[#22C55E]/5 border-b border-[#22C55E]/20 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse" />
            <span className="font-black text-[#22C55E]">IPO LIVE</span>
            <span className="text-[10px] text-white/40 ml-1">Festpreis</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-white/50">
            <Clock className="w-3 h-3" />
            <span>Endet in {formatCountdown(ipo.ends_at)}</span>
          </div>
        </div>
      </div>
      <div className="p-4 space-y-4">
        {/* Progress */}
        <div>
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-white/50">Fortschritt</span>
            <span className="font-mono font-bold text-[#FFD700]">{progress.toFixed(0)}%</span>
          </div>
          <div className="h-3 bg-black/30 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-[#FFD700] to-[#FFA500] rounded-full" style={{ width: `${progress}%` }} />
          </div>
          <div className="flex items-center justify-between text-xs text-white/40 mt-1">
            <span>{fmtBSD(ipo.sold)} verkauft</span>
            <span>{fmtBSD(remaining)} verfügbar</span>
          </div>
        </div>
        {/* Price */}
        <div className="bg-black/20 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white/50 text-sm">IPO Preis</span>
            <span className="font-mono font-black text-2xl text-[#FFD700]">{fmtBSD(priceBsd)} BSD</span>
          </div>
        </div>
        {/* Limits */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="bg-white/[0.02] rounded-lg p-3">
            <div className="text-xs text-white/40">Dein Limit</div>
            <div className="font-mono font-bold">{ipo.max_per_user} DPC</div>
          </div>
          <div className="bg-white/[0.02] rounded-lg p-3">
            <div className="text-xs text-white/40">Bereits gekauft</div>
            <div className="font-mono font-bold">{userPurchased} DPC</div>
          </div>
        </div>
        {/* Buy form */}
        {canBuyMore && maxBuy > 0 ? (
          <>
            <div>
              <label className="text-xs text-white/50 mb-2 block">Anzahl</label>
              <div className="flex items-center gap-2">
                <button onClick={() => setBuyQty(Math.max(1, buyQty - 1))}
                  className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 font-bold hover:bg-white/10">-</button>
                <input type="number" value={buyQty} min={1} max={maxBuy}
                  onChange={(e) => setBuyQty(Math.max(1, Math.min(maxBuy, parseInt(e.target.value) || 1)))}
                  className="flex-1 text-center bg-white/5 border border-white/10 rounded-xl py-2 font-mono font-bold" />
                <button onClick={() => setBuyQty(Math.min(maxBuy, buyQty + 1))}
                  className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 font-bold hover:bg-white/10">+</button>
              </div>
            </div>
            <div className="bg-black/20 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-white/40">Preis pro DPC</span>
                <span className="font-mono text-white/60">{fmtBSD(priceBsd)} BSD</span>
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
                    {formatBsd(balanceCents - totalCents)} BSD
                  </span>
                </div>
              )}
            </div>
            <Button variant="gold" fullWidth size="lg" onClick={() => onBuy(buyQty)} disabled={buying || !canAfford}>
              {buying ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
              {buying ? 'Wird gekauft...' : `${buyQty} DPC verpflichten`}
            </Button>
            {!canAfford && !buying && <div className="text-xs text-red-400 text-center">Nicht genug BSD</div>}
          </>
        ) : (
          <div className="bg-white/[0.03] rounded-xl p-4 text-center">
            <Lock className="w-8 h-8 mx-auto mb-2 text-white/30" />
            <div className="text-white/50">Limit erreicht</div>
            <div className="text-xs text-white/30">Du hast das Maximum für diesen IPO erreicht</div>
          </div>
        )}
      </div>
    </Card>
  );
}
