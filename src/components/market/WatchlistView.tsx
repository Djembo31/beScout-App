'use client';

import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Heart, HeartOff, Loader2, ArrowUpDown, Bell } from 'lucide-react';
import type { Player } from '@/types';
import { cn, fmtScout } from '@/lib/utils';
import { getClubName } from '@/lib/clubs';
import { removeFromWatchlist, updateAlertThreshold } from '@/lib/services/watchlist';
import type { WatchlistEntry } from '@/lib/services/watchlist';
import { useUser } from '@/components/providers/AuthProvider';
import { useToast } from '@/components/providers/ToastProvider';
import { PlayerPhoto, getL5Color, getL5Bg, PositionBadge } from '@/components/player';
import { EmptyState } from '@/components/ui/EmptyState';
import { queryClient } from '@/lib/queryClient';
import { qk } from '@/lib/queries/keys';

// ============================================
// TYPES
// ============================================

type SortKey = 'name' | 'price' | 'l5' | 'change';

interface WatchlistViewProps {
  players: Player[];
  watchlistEntries: WatchlistEntry[];
}

// ============================================
// CONSTANTS
// ============================================

const THRESHOLD_OPTIONS = [0, 5, 10, 20] as const;

// ============================================
// HELPERS
// ============================================

const getFloor = (p: Player) =>
  p.listings.length > 0 ? Math.min(...p.listings.map(l => l.price)) : p.prices.floor ?? 0;

// ============================================
// THRESHOLD POPOVER
// ============================================

function ThresholdPopover({
  playerId,
  currentThreshold,
  onSelect,
}: {
  playerId: string;
  currentThreshold: number;
  onSelect: (playerId: string, pct: number) => void;
}) {
  const t = useTranslations('market');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(prev => !prev);
        }}
        className={cn(
          'p-2 rounded-lg transition-colors shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center',
          currentThreshold === 0
            ? 'text-gold/70 hover:text-gold hover:bg-gold/10'
            : 'text-white/30 hover:text-white/60 hover:bg-white/[0.06]'
        )}
        aria-label={t('alertSettings')}
        title={t('alertSettings')}
      >
        <Bell className="size-4" />
        {currentThreshold > 0 && (
          <span className="absolute -top-0.5 -right-0.5 text-[9px] font-mono font-bold text-gold bg-gold/20 rounded-full size-4 flex items-center justify-center">
            {currentThreshold}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-1 z-50 w-44 bg-[#141414] border border-white/10 rounded-xl shadow-xl overflow-hidden"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
        >
          <div className="px-3 py-2 border-b border-white/[0.06]">
            <span className="text-xs font-semibold text-white/50">{t('alertThreshold')}</span>
          </div>
          {THRESHOLD_OPTIONS.map(pct => (
            <button
              key={pct}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onSelect(playerId, pct);
                setOpen(false);
              }}
              className={cn(
                'w-full px-3 py-2.5 text-left text-sm transition-colors flex items-center justify-between',
                pct === currentThreshold
                  ? 'bg-gold/10 text-gold'
                  : 'text-white/70 hover:bg-white/[0.06] hover:text-white'
              )}
            >
              <span>{pct === 0 ? t('alertAnyChange') : t('alertPctChange', { pct })}</span>
              {pct === currentThreshold && (
                <span className="size-1.5 rounded-full bg-gold" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================
// WATCHLIST VIEW
// ============================================

export default function WatchlistView({ players, watchlistEntries }: WatchlistViewProps) {
  const { user } = useUser();
  const { addToast } = useToast();
  const t = useTranslations('market');

  const [sortBy, setSortBy] = useState<SortKey>('name');
  const [removingId, setRemovingId] = useState<string | null>(null);

  // Map playerId -> threshold for quick lookup
  const thresholdMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const entry of watchlistEntries) {
      map.set(entry.playerId, entry.alertThresholdPct ?? 0);
    }
    return map;
  }, [watchlistEntries]);

  // Build watchlist player list with sort
  const watchlistPlayers = useMemo(() => {
    const watchedIds = new Set(watchlistEntries.map(e => e.playerId));
    const filtered = players.filter(p => watchedIds.has(p.id));

    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'price':
          return getFloor(b) - getFloor(a);
        case 'l5':
          return b.perf.l5 - a.perf.l5;
        case 'change':
          return b.prices.change24h - a.prices.change24h;
        case 'name':
        default:
          return `${a.last} ${a.first}`.localeCompare(`${b.last} ${b.first}`);
      }
    });
  }, [players, watchlistEntries, sortBy]);

  // Optimistic remove from watchlist
  const handleRemove = useCallback(async (playerId: string) => {
    if (!user) return;
    setRemovingId(playerId);

    // Optimistic update
    queryClient.setQueryData<WatchlistEntry[]>(qk.watchlist.byUser(user.id), (old) => {
      if (!old) return old;
      return old.filter(e => e.playerId !== playerId);
    });

    try {
      await removeFromWatchlist(user.id, playerId);
    } catch (err) {
      console.error('[WatchlistView] Remove failed:', err);
      queryClient.invalidateQueries({ queryKey: qk.watchlist.byUser(user.id) });
      addToast(t('watchlistError'), 'error');
    } finally {
      setRemovingId(null);
    }
  }, [user, addToast, t]);

  // Update alert threshold with optimistic update
  const handleThresholdChange = useCallback(async (playerId: string, pct: number) => {
    if (!user) return;
    const uid = user.id;

    // Optimistic update
    queryClient.setQueryData<WatchlistEntry[]>(qk.watchlist.byUser(uid), (old) => {
      if (!old) return old;
      return old.map(e => e.playerId === playerId ? { ...e, alertThresholdPct: pct } : e);
    });

    try {
      await updateAlertThreshold(uid, playerId, pct);
      addToast(t('alertSaved'), 'success');
    } catch (err) {
      console.error('[WatchlistView] Threshold update failed:', err);
      queryClient.invalidateQueries({ queryKey: qk.watchlist.byUser(uid) });
      addToast(t('watchlistError'), 'error');
    }
  }, [user, addToast, t]);

  // Sort options
  const sortOptions: { key: SortKey; label: string }[] = [
    { key: 'name', label: 'Name' },
    { key: 'price', label: t('floorPrice') },
    { key: 'l5', label: 'L5' },
    { key: 'change', label: '24h' },
  ];

  // Empty state
  if (watchlistEntries.length === 0) {
    return (
      <EmptyState
        icon={<Heart />}
        title={t('watchlistEmpty')}
        description={t('watchlistEmptyDesc')}
      />
    );
  }

  return (
    <div className="space-y-3">
      {/* Header: Count + Sort */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-white/50">
          {t('watchlistCount', { count: watchlistPlayers.length })}
        </span>
        <div className="flex items-center gap-1">
          <ArrowUpDown className="size-3.5 text-white/30" />
          {sortOptions.map(opt => (
            <button
              key={opt.key}
              onClick={() => setSortBy(opt.key)}
              className={cn(
                'px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors min-h-[44px]',
                sortBy === opt.key
                  ? 'bg-white/[0.10] text-white'
                  : 'text-white/40 hover:text-white/60'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Player List */}
      <div className="space-y-2">
        {watchlistPlayers.map(player => {
          const floor = getFloor(player);
          const change = player.prices.change24h;
          const isRemoving = removingId === player.id;
          const threshold = thresholdMap.get(player.id) ?? 0;

          return (
            <Link
              key={player.id}
              href={`/player/${player.id}`}
              className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.08] hover:bg-white/[0.04] transition-colors group"
            >
              {/* Photo */}
              <PlayerPhoto
                first={player.first}
                last={player.last}
                pos={player.pos}
                imageUrl={player.imageUrl}
                size={40}
              />

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-white truncate">
                    {player.first} {player.last}
                  </span>
                  <PositionBadge pos={player.pos} size="sm" />
                </div>
                <span className="text-xs text-white/40 truncate block">
                  {getClubName(player.club)}
                </span>
              </div>

              {/* L5 Badge */}
              <div className={cn(
                'px-2 py-1 rounded-lg text-xs font-mono font-bold tabular-nums',
                getL5Bg(player.perf.l5),
                getL5Color(player.perf.l5)
              )}>
                {player.perf.l5}
              </div>

              {/* Price + Change */}
              <div className="text-right shrink-0">
                <div className="font-mono font-bold text-sm tabular-nums text-gold">
                  {fmtScout(floor)}
                </div>
                <div className={cn(
                  'text-[11px] font-mono font-bold tabular-nums',
                  change > 0 ? 'text-green-500' : change < 0 ? 'text-red-400' : 'text-white/40'
                )}>
                  {change > 0 ? '+' : ''}{change.toFixed(1)}%
                </div>
              </div>

              {/* Alert Settings */}
              <ThresholdPopover
                playerId={player.id}
                currentThreshold={threshold}
                onSelect={handleThresholdChange}
              />

              {/* Remove Button */}
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleRemove(player.id);
                }}
                disabled={isRemoving}
                className="p-2 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center disabled:opacity-50"
                aria-label={t('removeFromWatchlist')}
              >
                {isRemoving ? (
                  <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
                ) : (
                  <HeartOff className="size-4" />
                )}
              </button>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
