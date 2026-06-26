'use client';

import { useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useSellOrders } from '@/lib/queries/misc';
import { resolveBuyPriceCents } from '../marketContent.priceCents';
import type { Player, DbIpo } from '@/types';

const BuyConfirmModal = dynamic(() => import('./BuyConfirmModal'), { ssr: false, loading: () => null });

interface MarketBuyConfirmContainerProps {
  player: Player;
  source: 'market' | 'ipo';
  ipo: DbIpo | null;
  balanceCents: number;
  isPending: boolean;
  onConfirm: (qty: number, orderId?: string | null) => void;
  onClose: () => void;
}

/**
 * Slice 404 (Welle 1.1) — Hooks-sicherer Wrapper um BuyConfirmModal.
 *
 * Ersetzt die IIFE in MarketContent (Hooks dort nicht aufrufbar). Für Markt-Käufe
 * resolved er die GÜNSTIGSTE FREMD-Sell-Order über `useSellOrders` — dieselbe
 * per-Spieler-Quelle, die auch das Player-Detail nutzt (echte Konsolidierung) —
 * und bindet Preis + Menge an diese Order: „was du siehst = was du zahlst".
 * Der Kauf läuft order-gebunden über `buy_from_order` (orderId), nicht mehr über
 * den Floor-Preis + `buy_player_sc`-cheapest-at-execution.
 *
 * IPO-Branch bleibt unverändert (Festpreis aus `ipos.price`, kein orderId).
 */
export default function MarketBuyConfirmContainer({
  player, source, ipo, balanceCents, isPending, onConfirm, onClose,
}: MarketBuyConfirmContainerProps) {
  const isIpo = source === 'ipo';

  // Market: per-player orderbook (sell side). Disabled für IPO (kein Fetch).
  const { data: sellOrders, isLoading } = useSellOrders(isIpo ? undefined : player.id);

  const market = useMemo(() => {
    if (isIpo) return { priceCents: 0, maxQty: 0, orderId: null as string | null };
    const cheapest = (sellOrders ?? [])
      .filter(o => !o.is_own && (o.quantity - o.filled_qty) > 0)
      .sort((a, b) => a.price - b.price)[0] ?? null;
    if (!cheapest) return { priceCents: 0, maxQty: 0, orderId: null as string | null };
    const remaining = cheapest.quantity - cheapest.filled_qty;
    const affordable = Math.floor(balanceCents / Math.max(cheapest.price, 1));
    return {
      priceCents: cheapest.price,
      orderId: cheapest.id,
      maxQty: Math.max(0, Math.min(remaining, affordable)),
    };
  }, [isIpo, sellOrders, balanceCents]);

  const ipoRemaining = ipo ? ipo.total_offered - ipo.sold : 0;
  const ipoProgress = ipo ? (ipo.sold / ipo.total_offered) * 100 : 0;

  const priceCents = isIpo
    ? resolveBuyPriceCents({ isIpo: true, ipoPriceCents: ipo?.price, floorBsd: player.prices.floor })
    : market.priceCents;
  const maxQty = isIpo
    ? (ipo ? Math.min(ipo.max_per_user, ipoRemaining) : 1)
    : market.maxQty;
  const orderId = isIpo ? undefined : market.orderId;

  return (
    <BuyConfirmModal
      open
      onClose={onClose}
      player={player}
      source={source}
      priceCents={priceCents}
      maxQty={maxQty}
      balanceCents={balanceCents}
      isPending={isPending}
      orderId={orderId}
      loading={!isIpo && isLoading}
      onConfirm={onConfirm}
      ipoProgress={isIpo ? ipoProgress : undefined}
      ipoRemaining={isIpo ? ipoRemaining : undefined}
    />
  );
}
