'use client';

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/components/providers/ToastProvider';
import { fmtScout } from '@/lib/utils';
import { centsToBsd } from '@/lib/services/players';
import type { Player } from '@/types';

const PRICE_ALERTS_KEY = 'bescout-price-alerts';

function loadPriceAlerts(): Record<string, { target: number; dir: 'above' | 'below' }> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(PRICE_ALERTS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function savePriceAlerts(alerts: Record<string, { target: number; dir: 'above' | 'below' }>): void {
  localStorage.setItem(PRICE_ALERTS_KEY, JSON.stringify(alerts));
}

interface UsePriceAlertsParams {
  playerId: string;
  player: Player | null;
}

export function usePriceAlerts({ playerId, player }: UsePriceAlertsParams) {
  const { addToast } = useToast();
  const [priceAlert, setPriceAlert] = useState<{ target: number; dir: 'above' | 'below' } | null>(null);

  // Load + check trigger
  useEffect(() => {
    if (!player) return;
    const alerts = loadPriceAlerts();
    const existing = alerts[playerId];
    if (existing) {
      const floorBsd = centsToBsd(player.prices.floor ?? 0);
      const triggered = existing.dir === 'below' ? floorBsd <= existing.target : floorBsd >= existing.target;
      if (triggered && floorBsd > 0) {
        addToast(`Preis-Alert: ${player.first} ${player.last} ist ${existing.dir === 'below' ? 'unter' : 'über'} ${fmtScout(existing.target)} $SCOUT`, 'success');
        delete alerts[playerId];
        savePriceAlerts(alerts);
        setPriceAlert(null);
      } else {
        setPriceAlert(existing);
      }
    }
  }, [player, playerId, addToast]);

  const handleSetPriceAlert = useCallback((target: number) => {
    if (!player) return;
    const currentBsd = centsToBsd(player.prices.floor ?? 0);
    const dir = target < currentBsd ? 'below' : 'above';
    const alerts = loadPriceAlerts();
    alerts[playerId] = { target, dir };
    savePriceAlerts(alerts);
    setPriceAlert({ target, dir });
    addToast(`Preis-Alert gesetzt: ${dir === 'below' ? '\u2264' : '\u2265'} ${fmtScout(target)} $SCOUT`, 'success');
  }, [player, playerId, addToast]);

  const handleRemovePriceAlert = useCallback(() => {
    const alerts = loadPriceAlerts();
    delete alerts[playerId];
    savePriceAlerts(alerts);
    setPriceAlert(null);
  }, [playerId]);

  return { priceAlert, handleSetPriceAlert, handleRemovePriceAlert };
}
