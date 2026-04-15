'use client';

import { useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useToast } from '@/components/providers/ToastProvider';
import type { Player } from '@/types';

/**
 * @deprecated J10 FIX-15 (2026-04-15)
 *
 * Local price-alerts via localStorage are deprecated in favour of the
 * server-side `watchlist.alert_threshold_pct` system (AR-59 trigger
 * `notify_watchlist_price_change`). The legacy hook is kept as a no-op so
 * existing call-sites (PlayerContent, PlayerHero) continue to compile, but it
 * no longer reads or writes any state.
 *
 * Migration path: users add players to their watchlist (Star/Heart icon) and
 * configure threshold via the WatchlistView ThresholdPopover (Bell icon).
 */
interface UsePriceAlertsParams {
  playerId: string;
  player: Player | null;
}

export function usePriceAlerts(_params: UsePriceAlertsParams) {
  const tp = useTranslations('player');
  const { addToast } = useToast();

  // Setting an alert now redirects users to the watchlist-based system.
  const handleSetPriceAlert = useCallback(() => {
    addToast(tp('priceAlertDeprecated'), 'info');
  }, [addToast, tp]);

  const handleRemovePriceAlert = useCallback(() => {
    /* no-op — nothing to remove */
  }, []);

  return {
    priceAlert: null as { target: number; dir: 'above' | 'below' } | null,
    handleSetPriceAlert,
    handleRemovePriceAlert,
  };
}
