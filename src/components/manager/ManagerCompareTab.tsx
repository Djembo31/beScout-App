'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { Search, X, GitCompareArrows } from 'lucide-react';
import { Card } from '@/components/ui';
import { PositionBadge } from '@/components/player';
import { cn } from '@/lib/utils';
import ComparePlayerCard from './ComparePlayerCard';
import type { Player } from '@/types';

interface ManagerCompareTabProps {
  players: Player[];
}

export default function ManagerCompareTab({ players }: ManagerCompareTabProps) {
  const [selectedIds, setSelectedIds] = useState<(string | null)[]>([null, null, null]);
  const [activeSlot, setActiveSlot] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const playerMap = useMemo(() => new Map(players.map(p => [p.id, p])), [players]);

  const selectedPlayers = useMemo(
    () => selectedIds.map(id => id ? playerMap.get(id) ?? null : null),
    [selectedIds, playerMap]
  );

  const filledCount = selectedPlayers.filter(Boolean).length;

  const handleSelect = useCallback((playerId: string) => {
    if (activeSlot === null) return;
    setSelectedIds(prev => {
      const next = [...prev];
      // Remove player from any existing slot
      const existingIdx = next.indexOf(playerId);
      if (existingIdx >= 0) next[existingIdx] = null;
      next[activeSlot] = playerId;
      return next;
    });
    setActiveSlot(null);
    setSearchQuery('');
  }, [activeSlot]);

  const handleClear = useCallback((slot: number) => {
    setSelectedIds(prev => {
      const next = [...prev];
      next[slot] = null;
      return next;
    });
  }, []);

  const filteredPlayers = useMemo(() => {
    if (!searchQuery) return players.slice(0, 20);
    const q = searchQuery.toLowerCase();
    return players.filter(p => `${p.first} ${p.last} ${p.club}`.toLowerCase().includes(q)).slice(0, 20);
  }, [players, searchQuery]);

  // Determine highest values for gold highlighting
  const highlightMap = useMemo(() => {
    const filled = selectedPlayers.filter((p): p is Player => p !== null);
    if (filled.length < 2) return filled.map(() => ({} as Record<string, boolean>));

    const stats = ['l5', 'l15', 'matches', 'goals', 'assists', 'floor', 'change'] as const;
    const getValue = (p: Player, stat: typeof stats[number]): number => {
      switch (stat) {
        case 'l5': return p.perf.l5;
        case 'l15': return p.perf.l15;
        case 'matches': return p.stats.matches;
        case 'goals': return p.stats.goals;
        case 'assists': return p.stats.assists;
        case 'floor': return p.prices.floor ?? 0;
        case 'change': return p.prices.change24h;
      }
    };

    return selectedPlayers.map(p => {
      if (!p) return {};
      const result: Record<string, boolean> = {};
      stats.forEach(stat => {
        const max = Math.max(...filled.map(fp => getValue(fp, stat)));
        result[stat] = getValue(p, stat) === max && max > 0;
      });
      return result;
    });
  }, [selectedPlayers]);

  return (
    <div className="space-y-4">
      {/* Selection Slots */}
      <div className="grid grid-cols-3 gap-3">
        {selectedIds.map((id, idx) => {
          const player = selectedPlayers[idx];
          return (
            <div key={idx} className="relative">
              {player ? (
                <div className="bg-white/[0.03] border border-white/10 rounded-xl p-3 text-center">
                  <button onClick={() => handleClear(idx)} className="absolute top-2 right-2 p-1 hover:bg-white/10 rounded-lg">
                    <X className="w-3 h-3 text-white/40" />
                  </button>
                  <div className="flex items-center justify-center gap-1.5 mb-1">
                    <PositionBadge pos={player.pos} size="sm" />
                    <span className="font-bold text-sm truncate">{player.last}</span>
                  </div>
                  <div className="text-[10px] text-white/40">{player.club}</div>
                </div>
              ) : (
                <button
                  onClick={() => { setActiveSlot(idx); setSearchQuery(''); }}
                  className={cn(
                    'w-full p-4 border-2 border-dashed rounded-xl text-center transition-all',
                    activeSlot === idx
                      ? 'border-[#FFD700]/40 bg-[#FFD700]/5'
                      : 'border-white/10 hover:border-white/20 bg-white/[0.02]'
                  )}
                >
                  <div className="text-xs text-white/30 font-medium">Spieler {idx + 1}</div>
                  <div className="text-[10px] text-white/20 mt-0.5">Klicke zum Auswählen</div>
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Search / Picker */}
      {activeSlot !== null && (
        <Card className="p-3 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
            <input
              type="text"
              placeholder="Spieler suchen..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              autoFocus
              className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-[#FFD700]/40 placeholder:text-white/30"
            />
          </div>
          <div className="max-h-64 overflow-y-auto space-y-1">
            {filteredPlayers.map(p => (
              <button
                key={p.id}
                onClick={() => handleSelect(p.id)}
                className="w-full flex items-center justify-between gap-3 p-2.5 rounded-lg hover:bg-white/5 transition-colors text-left"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <PositionBadge pos={p.pos} size="sm" />
                  <div className="min-w-0">
                    <div className="font-bold text-sm truncate">{p.first} {p.last}</div>
                    <div className="text-[10px] text-white/40">{p.club} · {p.age} J.</div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-mono font-bold text-xs">{p.perf.l5}</div>
                </div>
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* Comparison Table */}
      {filledCount >= 2 ? (
        <Card className="overflow-hidden">
          <div className={`grid gap-0 divide-x divide-white/5 ${filledCount === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
            {selectedPlayers.map((p, idx) => {
              if (!p) return null;
              return (
                <ComparePlayerCard key={p.id} player={p} isHighest={highlightMap[idx]} />
              );
            })}
          </div>
        </Card>
      ) : (
        <Card className="p-12 text-center">
          <GitCompareArrows className="w-12 h-12 mx-auto mb-4 text-white/20" />
          <div className="text-white/30 mb-2">Spieler vergleichen</div>
          <div className="text-sm text-white/50">Wähle 2-3 Spieler zum Vergleich aus</div>
        </Card>
      )}
    </div>
  );
}
