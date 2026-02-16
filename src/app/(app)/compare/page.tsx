'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Search, X, Share2, ChevronLeft, BarChart3, ArrowLeftRight } from 'lucide-react';
import { Card, Button, ErrorState } from '@/components/ui';
import { PositionBadge } from '@/components/player';
import { RadarChart, buildPlayerRadarAxes } from '@/components/player/RadarChart';
import type { RadarDataSet } from '@/components/player/RadarChart';
import { getPlayers, centsToBsd } from '@/lib/services/players';
import { fmtBSD } from '@/lib/utils';
import type { DbPlayer, Pos } from '@/types';

const COLORS = ['#38bdf8', '#fb7185', '#fbbf24'];

export default function ComparePage() {
  const searchParams = useSearchParams();
  const [allPlayers, setAllPlayers] = useState<DbPlayer[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [activeSlot, setActiveSlot] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [dataError, setDataError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  // Load players
  useEffect(() => {
    let cancelled = false;
    setDataError(false);
    getPlayers().then(p => {
      if (!cancelled) { setAllPlayers(p); setLoading(false); }
    }).catch(err => {
      console.error('[Compare] Failed to load players:', err);
      if (!cancelled) { setDataError(true); setLoading(false); }
    });
    return () => { cancelled = true; };
  }, [retryCount]);

  // Parse URL params
  useEffect(() => {
    const ids: string[] = [];
    const p1 = searchParams.get('p1');
    const p2 = searchParams.get('p2');
    const p3 = searchParams.get('p3');
    if (p1) ids.push(p1);
    if (p2) ids.push(p2);
    if (p3) ids.push(p3);
    if (ids.length > 0) setSelectedIds(ids);
  }, [searchParams]);

  const selectedPlayers = useMemo(
    () => selectedIds.map(id => allPlayers.find(p => p.id === id)).filter(Boolean) as DbPlayer[],
    [selectedIds, allPlayers]
  );

  const filteredPlayers = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase();
    return allPlayers
      .filter(p => !selectedIds.includes(p.id))
      .filter(p => `${p.first_name} ${p.last_name} ${p.club}`.toLowerCase().includes(q))
      .slice(0, 20);
  }, [search, allPlayers, selectedIds]);

  const handleAddPlayer = (id: string) => {
    if (activeSlot !== null) {
      setSelectedIds(prev => {
        const next = [...prev];
        next[activeSlot] = id;
        return next;
      });
    } else {
      setSelectedIds(prev => [...prev.slice(0, 2), id]);
    }
    setActiveSlot(null);
    setSearch('');
  };

  const handleRemovePlayer = (idx: number) => {
    setSelectedIds(prev => prev.filter((_, i) => i !== idx));
  };

  const handleShare = () => {
    const params = selectedIds.map((id, i) => `p${i + 1}=${id}`).join('&');
    const url = `${window.location.origin}/compare?${params}`;
    navigator.clipboard.writeText(url).then(() => alert('Link kopiert!')).catch(err => console.error('[Compare] Clipboard write failed:', err));
  };

  // Build radar datasets
  const radarDatasets: RadarDataSet[] = selectedPlayers.map((p, i) => ({
    axes: buildPlayerRadarAxes({
      goals: p.goals,
      assists: p.assists,
      cleanSheets: p.clean_sheets,
      matches: p.matches,
      perfL5: p.perf_l5,
      perfL15: p.perf_l15,
      bonus: 0,
      minutes: p.matches * 90,
    }),
    color: COLORS[i % COLORS.length],
    label: `${p.first_name} ${p.last_name}`,
  }));

  // Stats rows for comparison table
  const statRows = [
    { label: 'Spiele', key: 'matches' as const },
    { label: 'Tore', key: 'goals' as const },
    { label: 'Assists', key: 'assists' as const },
    { label: 'Clean Sheets', key: 'clean_sheets' as const },
    { label: 'L5', key: 'perf_l5' as const },
    { label: 'L15', key: 'perf_l15' as const },
    { label: 'Floor Preis', key: 'floor_price' as const, isBsd: true },
    { label: 'Alter', key: 'age' as const },
  ];

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="text-center py-16">
          <div className="w-8 h-8 border-2 border-white/20 border-t-white/80 rounded-full animate-spin mx-auto mb-4" />
          <div className="text-white/40">Spieler werden geladen...</div>
        </div>
      </div>
    );
  }

  if (dataError) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4">
        <ErrorState onRetry={() => { setLoading(true); setRetryCount(c => c + 1); }} />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-4 md:py-8 px-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/market" className="p-2 hover:bg-white/10 rounded-lg transition-all">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl md:text-2xl font-black flex items-center gap-2">
              <ArrowLeftRight className="w-5 h-5 text-sky-400" />
              Spieler vergleichen
            </h1>
            <p className="text-xs text-white/40">Bis zu 3 Spieler side-by-side</p>
          </div>
        </div>
        {selectedPlayers.length >= 2 && (
          <Button variant="outline" size="sm" onClick={handleShare}>
            <Share2 className="w-4 h-4" /> Link teilen
          </Button>
        )}
      </div>

      {/* Player Slots */}
      <div className="grid grid-cols-3 gap-3">
        {[0, 1, 2].map(idx => {
          const p = selectedPlayers[idx];
          return (
            <div key={idx}>
              {p ? (
                <Card className="p-3 relative">
                  <button
                    onClick={() => handleRemovePlayer(idx)}
                    className="absolute top-2 right-2 p-1 bg-white/10 hover:bg-red-500/20 rounded-full transition-all"
                  >
                    <X className="w-3 h-3" />
                  </button>
                  <div className="flex flex-col items-center text-center gap-1">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center border-2"
                      style={{ borderColor: COLORS[idx], backgroundColor: COLORS[idx] + '20' }}>
                      <span className="font-bold text-sm" style={{ color: COLORS[idx] }}>{p.first_name[0]}{p.last_name[0]}</span>
                    </div>
                    <div className="font-bold text-sm truncate w-full">{p.last_name}</div>
                    <div className="text-[10px] text-white/40">{p.club}</div>
                    <PositionBadge pos={p.position as Pos} size="sm" />
                  </div>
                </Card>
              ) : (
                <button
                  onClick={() => { setActiveSlot(idx); setSearch(''); }}
                  className="w-full p-3 border border-dashed border-white/20 rounded-2xl hover:border-white/40 transition-all flex flex-col items-center justify-center gap-2 min-h-[120px]"
                >
                  <Search className="w-5 h-5 text-white/30" />
                  <span className="text-xs text-white/30">Spieler {idx + 1}</span>
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Search */}
      {(activeSlot !== null || selectedPlayers.length < 3) && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Spieler suchen..."
            className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-[#FFD700]/40"
            autoFocus={activeSlot !== null}
          />
          {filteredPlayers.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-[#0a0a0a] border border-white/10 rounded-xl shadow-2xl z-20 max-h-60 overflow-y-auto">
              {filteredPlayers.map(p => (
                <button
                  key={p.id}
                  onClick={() => handleAddPlayer(p.id)}
                  className="w-full flex items-center gap-3 p-3 hover:bg-white/5 transition-all text-left"
                >
                  <PositionBadge pos={p.position as Pos} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{p.first_name} {p.last_name}</div>
                    <div className="text-[10px] text-white/40">{p.club}</div>
                  </div>
                  <div className="text-xs text-white/40 font-mono">L5: {p.perf_l5}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Radar Chart Overlay */}
      {selectedPlayers.length >= 2 && (
        <Card className="p-4 md:p-6">
          <h3 className="font-black text-lg mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-sky-400" />
            Radar-Vergleich
          </h3>
          <div className="flex justify-center">
            <RadarChart datasets={radarDatasets} size={280} />
          </div>
          <div className="flex justify-center gap-4 mt-4">
            {selectedPlayers.map((p, i) => (
              <div key={p.id} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                <span className="text-xs text-white/60">{p.first_name} {p.last_name}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Stats Comparison Table */}
      {selectedPlayers.length >= 2 && (
        <Card className="p-4 md:p-6 overflow-x-auto">
          <h3 className="font-black text-lg mb-4">Statistik-Vergleich</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-2 text-white/40 font-medium text-xs">Attribut</th>
                {selectedPlayers.map((p, i) => (
                  <th key={p.id} className="text-right py-2 font-medium text-xs" style={{ color: COLORS[i] }}>
                    {p.last_name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {statRows.map(row => {
                const values = selectedPlayers.map(p => {
                  const v = (p as Record<string, unknown>)[row.key];
                  return typeof v === 'number' ? v : 0;
                });
                const maxVal = Math.max(...values);
                const minVal = Math.min(...values);

                return (
                  <tr key={row.key} className="border-b border-white/[0.04]">
                    <td className="py-2.5 text-white/60">{row.label}</td>
                    {values.map((v, i) => {
                      const isBest = v === maxVal && maxVal !== minVal;
                      const isWorst = v === minVal && maxVal !== minVal;
                      return (
                        <td key={i} className={`py-2.5 text-right font-mono font-bold ${isBest ? 'text-[#FFD700]' : isWorst ? 'text-red-400' : 'text-white'}`}>
                          {row.isBsd ? fmtBSD(centsToBsd(v)) : v}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      {selectedPlayers.length < 2 && (
        <div className="text-center py-12">
          <ArrowLeftRight className="w-12 h-12 mx-auto mb-4 text-white/10" />
          <div className="text-white/30 text-sm">Wähle mindestens 2 Spieler zum Vergleichen</div>
        </div>
      )}
    </div>
  );
}
