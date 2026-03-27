'use client';

import { useCallback, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { addToWatchlist, removeFromWatchlist, migrateLocalWatchlist } from '@/lib/services/watchlist';
import type { WatchlistEntry } from '@/lib/services/watchlist';
import { useToast } from '@/components/providers/ToastProvider';
import { queryClient } from '@/lib/queryClient';
import { qk } from '@/lib/queries/keys';

export function useWatchlistActions(
  userId: string | undefined,
  watchlistMap: Record<string, boolean>,
) {
  const { addToast } = useToast();
  const t = useTranslations('market');

  // ── Optimistic toggle ──
  const toggleWatch = useCallback((id: string) => {
    if (!userId) return;
    const isWatched = !!watchlistMap[id];
    // Optimistic update via React Query cache
    queryClient.setQueryData<WatchlistEntry[]>(qk.watchlist.byUser(userId), (old) => {
      if (!old) return old;
      if (isWatched) return old.filter(e => e.playerId !== id);
      return [...old, {
        id: `opt-${id}`,
        playerId: id,
        alertThresholdPct: 0,
        alertDirection: 'both' as const,
        lastAlertPrice: 0,
        createdAt: new Date().toISOString(),
      }];
    });
    const action = isWatched ? removeFromWatchlist(userId, id) : addToWatchlist(userId, id);
    action.catch((err) => {
      console.error('[Market] Watchlist toggle failed:', err);
      queryClient.invalidateQueries({ queryKey: qk.watchlist.byUser(userId) });
      addToast(t('watchlistError'), 'error');
    });
  }, [userId, watchlistMap, addToast, t]);

  // ── One-time localStorage migration ──
  useEffect(() => {
    if (!userId || typeof window === 'undefined') return;
    const legacy = localStorage.getItem('bescout-watchlist');
    if (!legacy) return;
    migrateLocalWatchlist(userId)
      .then(count => {
        if (count > 0) queryClient.invalidateQueries({ queryKey: qk.watchlist.byUser(userId) });
      })
      .catch(err => console.error('[Market] Watchlist migration failed:', err));
  }, [userId]);

  return { toggleWatch };
}
