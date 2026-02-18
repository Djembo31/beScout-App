'use client';

import React, { useState } from 'react';
import {
  ShoppingCart, Users, Clock, Target, Zap, Lock,
  PiggyBank, Crown, AlertTriangle, Send, Briefcase,
  CheckCircle2, XCircle, Loader2,
} from 'lucide-react';
import { Card, Button } from '@/components/ui';
import { fmtBSD } from '@/lib/utils';
import { centsToBsd } from '@/lib/services/players';
import { formatBsd } from '@/lib/services/wallet';
import type { Player, DbIpo, DbOrder, OfferWithDetails } from '@/types';
import SponsorBanner from './SponsorBanner';

// ─── Helpers ────────────────────────────────────

const getIPOFormatLabel = (format: string) => {
  switch (format) {
    case 'fixed': return 'Festpreis';
    case 'tiered': return 'Staffelpreis';
    case 'dutch': return 'Sinkender Preis';
    default: return format;
  }
};

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

// ─── Props ──────────────────────────────────────

interface TradingSidebarProps {
  player: Player;
  activeIpo: DbIpo | null;
  userIpoPurchased: number;
  balanceCents: number | null;
  holdingQty: number;
  userOrders: DbOrder[];
  allSellOrders: DbOrder[];
  openBids: OfferWithDetails[];
  userId?: string;
  // Status
  buying: boolean;
  ipoBuying: boolean;
  selling: boolean;
  cancellingId: string | null;
  buyError: string | null;
  buySuccess: string | null;
  shared: boolean;
  pendingBuyQty: number | null;
  // Handlers
  onBuy: (qty: number) => void;
  onIpoBuy: (qty: number) => void;
  onSell: (qty: number, priceCents: number) => void;
  onCancelOrder: (orderId: string) => void;
  onConfirmBuy: (qty: number) => void;
  onCancelPendingBuy: () => void;
  onShareTrade: () => void;
  onAcceptBid: (offerId: string) => void;
  onOpenOfferModal: () => void;
}

export default function TradingSidebar({
  player, activeIpo, userIpoPurchased, balanceCents,
  holdingQty, userOrders, allSellOrders, openBids, userId,
  buying, ipoBuying, selling, cancellingId,
  buyError, buySuccess, shared, pendingBuyQty,
  onBuy, onIpoBuy, onSell, onCancelOrder,
  onConfirmBuy, onCancelPendingBuy, onShareTrade,
  onAcceptBid, onOpenOfferModal,
}: TradingSidebarProps) {
  const isLiquidated = player.isLiquidated;
  const isIPO = activeIpo !== null && (activeIpo.status === 'open' || activeIpo.status === 'early_access');

  return (
    <div className="space-y-4 lg:sticky lg:top-4">
      {/* Liquidated state */}
      {isLiquidated && (
        <Card className="p-4 border-red-500/20 bg-red-500/5">
          <div className="flex items-center gap-2 text-red-300 mb-2">
            <Lock className="w-4 h-4" />
            <span className="font-bold text-sm">Trading gesperrt</span>
          </div>
          <div className="text-xs text-white/50">Dieser Spieler wurde liquidiert. Kauf und Verkauf sind nicht mehr möglich.</div>
        </Card>
      )}

      {/* Toast Notifications */}
      {buySuccess && (
        <div className="bg-[#22C55E]/20 border border-[#22C55E]/30 text-[#22C55E] rounded-xl px-4 py-3 text-sm font-bold">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            {buySuccess}
          </div>
          {!shared && (
            <button
              onClick={onShareTrade}
              className="mt-2 flex items-center gap-1.5 px-3 py-1.5 bg-[#22C55E]/20 hover:bg-[#22C55E]/30 rounded-lg text-xs font-bold text-[#22C55E] transition-all"
            >
              In Community teilen
            </button>
          )}
        </div>
      )}
      {buyError && (
        <div className="bg-red-500/20 border border-red-500/30 text-red-300 rounded-xl px-4 py-3 text-sm font-bold flex items-center gap-2">
          <XCircle className="w-4 h-4" />
          {buyError}
        </div>
      )}

      {/* Buy Confirmation (own sell orders) */}
      {pendingBuyQty !== null && (
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
            {(() => {
              const estPriceBsd = player.prices.floor ?? 0;
              const estTotalCents = Math.round(estPriceBsd * 100) * pendingBuyQty;
              return (
                <div className="bg-black/20 rounded-lg px-3 py-2 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white/40">ca. Kosten ({pendingBuyQty} &times; {fmtBSD(estPriceBsd)})</span>
                    <span className="font-mono font-bold text-[#FFD700]">{fmtBSD(estPriceBsd * pendingBuyQty)} BSD</span>
                  </div>
                  {balanceCents !== null && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-white/40">Guthaben danach</span>
                      <span className={`font-mono font-bold ${balanceCents >= estTotalCents ? 'text-[#22C55E]' : 'text-red-400'}`}>
                        {formatBsd(balanceCents - estTotalCents)} BSD
                      </span>
                    </div>
                  )}
                </div>
              );
            })()}
            <div className="flex items-center gap-2">
              <Button variant="gold" size="sm" className="flex-1" onClick={() => onConfirmBuy(pendingBuyQty)} disabled={buying}>
                {buying ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Ja, {pendingBuyQty} DPC kaufen
              </Button>
              <Button variant="outline" size="sm" className="flex-1" onClick={onCancelPendingBuy}>
                Abbrechen
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* IPO Buy Widget */}
      {!isLiquidated && isIPO && activeIpo && (
        <IPOBuySection
          ipo={activeIpo}
          userPurchased={userIpoPurchased}
          balanceCents={balanceCents}
          onBuy={onIpoBuy}
          buying={ipoBuying}
        />
      )}

      {/* Transfer Buy Widget */}
      {!isLiquidated && (
        <TransferBuySection
          player={player}
          balanceCents={balanceCents}
          holdingQty={holdingQty}
          sellOrderCount={allSellOrders.filter(o => userId && o.user_id !== userId).reduce((sum, o) => sum + (o.quantity - o.filled_qty), 0)}
          onBuy={onBuy}
          buying={buying}
        />
      )}

      {/* Offers */}
      {!isLiquidated && userId && (
        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-white">Angebote</span>
            <button
              onClick={onOpenOfferModal}
              className="text-xs px-3 py-1.5 rounded-lg bg-[#FFD700]/10 text-[#FFD700] border border-[#FFD700]/20 hover:bg-[#FFD700]/20 transition-colors font-medium"
            >
              Kaufangebot machen
            </button>
          </div>
          {openBids.length > 0 ? (
            <div className="space-y-2">
              <div className="text-xs text-white/40">Offene Gebote ({openBids.length})</div>
              {openBids.slice(0, 3).map(bid => (
                <div key={bid.id} className="flex items-center justify-between bg-white/[0.03] rounded-xl px-3 py-2">
                  <div className="text-sm">
                    <span className="text-white/60">@{bid.sender_handle}</span>
                    <span className="text-white/30 mx-2">&middot;</span>
                    <span className="font-mono font-bold text-[#FFD700]">{fmtBSD(centsToBsd(bid.price))} BSD</span>
                  </div>
                  {holdingQty > 0 && bid.sender_id !== userId && (
                    <button
                      onClick={() => onAcceptBid(bid.id)}
                      className="text-xs px-2 py-1 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors"
                    >
                      Annehmen
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-white/30">Keine offenen Gebote für diesen Spieler.</div>
          )}
        </Card>
      )}

      {/* Your Holdings */}
      {!isLiquidated && (holdingQty > 0 || userOrders.length > 0) && (
        <HoldingsSection
          player={player}
          holdingQty={holdingQty}
          floorPriceCents={Math.round((player.prices.floor ?? 0) * 100)}
          userOrders={userOrders}
          onSell={onSell}
          onCancelOrder={onCancelOrder}
          selling={selling}
          cancellingId={cancellingId}
        />
      )}

      {/* Sponsor */}
      <SponsorBanner placement="player_footer" />
    </div>
  );
}

// ─── IPO Buy Section ────────────────────────────

function IPOBuySection({
  ipo, userPurchased, balanceCents, onBuy, buying,
}: {
  ipo: DbIpo;
  userPurchased: number;
  balanceCents: number | null;
  onBuy: (qty: number) => void;
  buying: boolean;
}) {
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
            <span className="text-[10px] text-white/40 ml-1">{getIPOFormatLabel(ipo.format)}</span>
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
          {ipo.member_discount > 0 && (
            <div className="flex items-center gap-2 text-sm bg-purple-500/10 border border-purple-500/20 rounded-lg px-3 py-2">
              <Crown className="w-4 h-4 text-purple-400" />
              <span className="text-purple-300">Club-Mitglied: -{ipo.member_discount}%</span>
              <span className="font-mono font-bold text-purple-300 ml-auto">{fmtBSD(priceBsd * (1 - ipo.member_discount / 100))} BSD</span>
            </div>
          )}
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

// ─── Transfer Buy Section ───────────────────────

function TransferBuySection({
  player, balanceCents, holdingQty, sellOrderCount, onBuy, buying,
}: {
  player: Player;
  balanceCents: number | null;
  holdingQty: number;
  sellOrderCount: number;
  onBuy: (qty: number) => void;
  buying: boolean;
}) {
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
                  className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 font-bold hover:bg-white/10">-</button>
                <input type="number" value={buyQty} min={1} max={maxQty || undefined}
                  onChange={(e) => setBuyQty(Math.max(1, Math.min(maxQty || 999, parseInt(e.target.value) || 1)))}
                  className="flex-1 text-center bg-white/5 border border-white/10 rounded-xl py-2 font-mono font-bold" />
                <button onClick={() => setBuyQty(Math.min(maxQty || buyQty + 1, buyQty + 1))}
                  className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 font-bold hover:bg-white/10">+</button>
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

// ─── Holdings Section ───────────────────────────

function HoldingsSection({
  player, holdingQty, floorPriceCents, userOrders, onSell, onCancelOrder, selling, cancellingId,
}: {
  player: Player;
  holdingQty: number;
  floorPriceCents: number;
  userOrders: DbOrder[];
  onSell: (qty: number, priceCents: number) => void;
  onCancelOrder: (orderId: string) => void;
  selling: boolean;
  cancellingId: string | null;
}) {
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
                  const feePct = 5;
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
