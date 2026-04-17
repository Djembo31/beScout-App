'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Search, X } from 'lucide-react';
import { PlayerIdentity, getL5Color } from '@/components/player';
import { fmtScout, cn } from '@/lib/utils';
import { centsToBsd } from '@/lib/services/players';
import type { Player, DbIpo, PublicOrder } from '@/types';

interface MarketSearchProps {
  players: Player[];
  activeIpos: DbIpo[];
  sellOrders: PublicOrder[];
  onClose: () => void;
}

export default function MarketSearch({ players, activeIpos, sellOrders, onClose }: MarketSearchProps) {
  const t = useTranslations('market');
  const [query, setQuery] = useState('');

  const ipoPlayerIds = useMemo(() => {
    const s = new Set<string>();
    for (const ipo of activeIpos) s.add(ipo.player_id);
    return s;
  }, [activeIpos]);

  const listingPlayerIds = useMemo(() => {
    const s = new Set<string>();
    for (const o of sellOrders) {
      if ((o.status === 'open' || o.status === 'partial') && o.side === 'sell') {
        s.add(o.player_id);
      }
    }
    return s;
  }, [sellOrders]);

  // Floor prices from sell orders
  const floors = useMemo(() => {
    const m = new Map<string, number>();
    for (const o of sellOrders) {
      if ((o.status !== 'open' && o.status !== 'partial') || o.side !== 'sell') continue;
      const existing = m.get(o.player_id);
      if (!existing || o.price < existing) m.set(o.player_id, o.price);
    }
    return m;
  }, [sellOrders]);

  const ipoPrice = useMemo(() => {
    const m = new Map<string, number>();
    for (const ipo of activeIpos) m.set(ipo.player_id, ipo.price);
    return m;
  }, [activeIpos]);

  const results = useMemo(() => {
    if (query.length < 2) return { clubSale: [], transfer: [] };

    const q = query.toLowerCase().replace(/[İı]/g, 'i');
    const filtered = players.filter(p => {
      const name = `${p.first} ${p.last}`.toLowerCase().replace(/[İı]/g, 'i');
      const club = p.club.toLowerCase();
      return name.includes(q) || club.includes(q) || p.pos.toLowerCase() === q || p.country.toLowerCase().includes(q);
    });

    return {
      clubSale: filtered.filter(p => ipoPlayerIds.has(p.id)),
      transfer: filtered.filter(p => listingPlayerIds.has(p.id) && !ipoPlayerIds.has(p.id)),
    };
  }, [query, players, ipoPlayerIds, listingPlayerIds]);

  const hasResults = results.clubSale.length > 0 || results.transfer.length > 0;
  const isSearching = query.length >= 2;

  return (
    <div className="mb-4">
      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-white/30" aria-hidden="true" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('searchPlayers', { defaultMessage: 'Spieler suchen...' })}
          className="w-full bg-surface-subtle border border-white/[0.10] rounded-xl pl-10 pr-10 py-2.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-white/20 min-h-[44px]"
          autoFocus
        />
        {query && (
          <button
            onClick={() => { setQuery(''); onClose(); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg hover:bg-white/10 transition-colors"
            aria-label={t('closeSearch', { defaultMessage: 'Suche schließen' })}
          >
            <X className="size-4 text-white/40" />
          </button>
        )}
      </div>

      {/* Results */}
      {isSearching && (
        <div className="mt-3 space-y-4">
          {/* Club Verkauf results */}
          {results.clubSale.length > 0 && (
            <div>
              <h4 className="text-[10px] font-bold text-white/40 uppercase tracking-wide mb-2">
                {t('inClubSale', { count: results.clubSale.length })}
              </h4>
              <div className="space-y-1">
                {results.clubSale.map(p => (
                  <Link
                    key={p.id}
                    href={`/player/${p.id}`}
                    className="flex items-center gap-3 bg-surface-base border border-divider rounded-xl px-3 py-2.5 hover:border-white/15 transition-colors"
                  >
                    <PlayerIdentity player={p} size="sm" showStatus={false} className="flex-1 min-w-0" />
                    <span className={cn('font-mono font-bold text-[10px]', getL5Color(p.perf.l5))}>{p.perf.l5}</span>
                    {ipoPrice.has(p.id) && (
                      <span className="font-mono font-bold text-xs text-gold tabular-nums">{fmtScout(centsToBsd(ipoPrice.get(p.id)!))}</span>
                    )}
                    <span className="text-[9px] font-bold text-vivid-green bg-vivid-green/10 px-1.5 py-0.5 rounded">{t('clubSaleBadge')}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Transferliste results */}
          {results.transfer.length > 0 && (
            <div>
              <h4 className="text-[10px] font-bold text-white/40 uppercase tracking-wide mb-2">
                {t('onTransferList', { count: results.transfer.length })}
              </h4>
              <div className="space-y-1">
                {results.transfer.map(p => (
                  <Link
                    key={p.id}
                    href={`/player/${p.id}`}
                    className="flex items-center gap-3 bg-surface-base border border-divider rounded-xl px-3 py-2.5 hover:border-white/15 transition-colors"
                  >
                    <PlayerIdentity player={p} size="sm" showStatus={false} className="flex-1 min-w-0" />
                    <span className={cn('font-mono font-bold text-[10px]', getL5Color(p.perf.l5))}>{p.perf.l5}</span>
                    {floors.has(p.id) && (
                      <div className="text-right">
                        <div className="text-[8px] text-white/30">{t('listedFrom')}</div>
                        <span className="font-mono font-bold text-xs text-gold tabular-nums">{fmtScout(centsToBsd(floors.get(p.id)!))}</span>
                      </div>
                    )}
                    <span className="text-[9px] font-bold text-sky-300 bg-sky-500/10 px-1.5 py-0.5 rounded">{t('transferListBadge')}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* No results */}
          {!hasResults && (
            <div className="text-center py-8">
              <div className="text-sm text-white/30">{t('noSearchResults')}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
