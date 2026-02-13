'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Save, RotateCcw, Search, ChevronDown, X } from 'lucide-react';
import { Card, Button } from '@/components/ui';
import { PositionBadge } from '@/components/player';
import { PlayerDisplay } from '@/components/player/PlayerRow';
import { fmtBSD, cn } from '@/lib/utils';
import SquadPitch from './SquadPitch';
import SquadSummaryStats from './SquadSummaryStats';
import { FORMATIONS, DEFAULT_FORMATIONS, DEFAULT_SQUAD_SIZE, SQUAD_PRESET_KEY, SQUAD_SIZE_KEY } from './constants';
import { getPosColor } from './helpers';
import type { Player, Pos } from '@/types';
import type { FormationId, SquadPreset, SquadSize } from './types';

interface ManagerKaderTabProps {
  players: Player[]; // all players (for picker)
  ownedPlayers: Player[]; // only owned players
}

export default function ManagerKaderTab({ players, ownedPlayers }: ManagerKaderTabProps) {
  const [squadSize, setSquadSize] = useState<SquadSize>(() => {
    if (typeof window === 'undefined') return DEFAULT_SQUAD_SIZE;
    try { return (localStorage.getItem(SQUAD_SIZE_KEY) as SquadSize) || DEFAULT_SQUAD_SIZE; } catch { return DEFAULT_SQUAD_SIZE; }
  });
  const [formationId, setFormationId] = useState<FormationId>(DEFAULT_FORMATIONS[squadSize]);
  const [assignments, setAssignments] = useState<Map<number, string>>(new Map()); // slotIndex → playerId
  const [pickerOpen, setPickerOpen] = useState<{ slotIndex: number; pos: Pos } | null>(null);
  const [pickerSearch, setPickerSearch] = useState('');
  const [presetName, setPresetName] = useState('');
  const [showPresets, setShowPresets] = useState(false);
  const [presets, setPresets] = useState<SquadPreset[]>([]);
  const [sortBy, setSortBy] = useState<'perf' | 'price' | 'name'>('perf');

  const availableFormations = FORMATIONS[squadSize];
  const formation = useMemo(() => availableFormations.find(f => f.id === formationId) ?? availableFormations[0], [formationId, availableFormations]);

  // Load presets from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(SQUAD_PRESET_KEY);
      if (stored) setPresets(JSON.parse(stored));
    } catch { /* ignore */ }
  }, []);

  // Player map for fast lookup
  const playerMap = useMemo(() => new Map(players.map(p => [p.id, p])), [players]);

  // Build assignments map with Player objects
  const assignedPlayers = useMemo(() => {
    const map = new Map<number, Player>();
    assignments.forEach((playerId, slotIdx) => {
      const p = playerMap.get(playerId);
      if (p) map.set(slotIdx, p);
    });
    return map;
  }, [assignments, playerMap]);

  // Assigned player IDs set
  const assignedIds = useMemo(() => new Set(assignments.values()), [assignments]);

  const handleSlotClick = useCallback((slotIndex: number, pos: Pos) => {
    const existing = assignments.get(slotIndex);
    if (existing) {
      // Remove player from slot
      setAssignments(prev => {
        const next = new Map(prev);
        next.delete(slotIndex);
        return next;
      });
    } else {
      // Open picker
      setPickerOpen({ slotIndex, pos });
      setPickerSearch('');
    }
  }, [assignments]);

  const handlePickPlayer = useCallback((playerId: string) => {
    if (!pickerOpen) return;
    setAssignments(prev => {
      const next = new Map(prev);
      // Remove player from any other slot first
      Array.from(next.entries()).forEach(([idx, pid]) => {
        if (pid === playerId) next.delete(idx);
      });
      next.set(pickerOpen.slotIndex, playerId);
      return next;
    });
    setPickerOpen(null);
  }, [pickerOpen]);

  const handleSquadSizeChange = useCallback((size: SquadSize) => {
    setSquadSize(size);
    setFormationId(DEFAULT_FORMATIONS[size]);
    setAssignments(new Map());
    try { localStorage.setItem(SQUAD_SIZE_KEY, size); } catch { /* ignore */ }
  }, []);

  const handleFormationChange = useCallback((id: FormationId) => {
    setFormationId(id);
    setAssignments(new Map()); // Reset assignments on formation change
  }, []);

  const handleSavePreset = useCallback(() => {
    if (!presetName.trim()) return;
    const preset: SquadPreset = {
      name: presetName.trim(),
      formationId,
      assignments: Object.fromEntries(assignments),
    };
    const updated = [...presets.filter(p => p.name !== preset.name), preset].slice(-5);
    setPresets(updated);
    localStorage.setItem(SQUAD_PRESET_KEY, JSON.stringify(updated));
    setPresetName('');
    setShowPresets(false);
  }, [presetName, formationId, assignments, presets]);

  const handleLoadPreset = useCallback((preset: SquadPreset) => {
    setFormationId(preset.formationId);
    setAssignments(new Map(Object.entries(preset.assignments).map(([k, v]) => [Number(k), v])));
    setShowPresets(false);
  }, []);

  const handleDeletePreset = useCallback((name: string) => {
    const updated = presets.filter(p => p.name !== name);
    setPresets(updated);
    localStorage.setItem(SQUAD_PRESET_KEY, JSON.stringify(updated));
  }, [presets]);

  // Picker players — filter by position, search, not already assigned
  const pickerPlayers = useMemo(() => {
    if (!pickerOpen) return [];
    let list = ownedPlayers.filter(p => p.pos === pickerOpen.pos && !assignedIds.has(p.id));
    if (pickerSearch) {
      const q = pickerSearch.toLowerCase();
      list = list.filter(p => `${p.first} ${p.last} ${p.club}`.toLowerCase().includes(q));
    }
    switch (sortBy) {
      case 'perf': return [...list].sort((a, b) => b.perf.l5 - a.perf.l5);
      case 'price': return [...list].sort((a, b) => (b.prices.floor ?? 0) - (a.prices.floor ?? 0));
      case 'name': return [...list].sort((a, b) => a.last.localeCompare(b.last));
      default: return list;
    }
  }, [pickerOpen, ownedPlayers, assignedIds, pickerSearch, sortBy]);

  // Owned player list for "all players" section below pitch
  const sortedOwned = useMemo(() => {
    return [...ownedPlayers].sort((a, b) => {
      switch (sortBy) {
        case 'perf': return b.perf.l5 - a.perf.l5;
        case 'price': return (b.prices.floor ?? 0) - (a.prices.floor ?? 0);
        case 'name': return a.last.localeCompare(b.last);
        default: return 0;
      }
    });
  }, [ownedPlayers, sortBy]);

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <SquadSummaryStats
        players={Array.from(assignedPlayers.values())}
        ownedPlayers={ownedPlayers}
        assignedCount={assignedPlayers.size}
        totalSlots={formation.slots.length}
      />

      {/* Squad Size + Formation Selector */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* 11er / 6er Toggle */}
        <div className="flex items-center bg-white/5 border border-white/10 rounded-full p-0.5">
          {(['11', '6'] as const).map(size => (
            <button
              key={size}
              onClick={() => handleSquadSizeChange(size)}
              className={cn(
                'px-3 py-1 rounded-full text-xs font-black transition-all',
                squadSize === size
                  ? 'bg-[#FFD700] text-black'
                  : 'text-white/50 hover:text-white'
              )}
            >
              {size}er
            </button>
          ))}
        </div>
        <span className="text-white/20">|</span>
        {availableFormations.map(f => (
          <button
            key={f.id}
            onClick={() => handleFormationChange(f.id)}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-bold border transition-all',
              formationId === f.id
                ? 'bg-[#FFD700]/15 border-[#FFD700]/30 text-[#FFD700]'
                : 'bg-white/5 border-white/10 text-white/50 hover:text-white hover:border-white/20'
            )}
          >
            {f.name}
          </button>
        ))}
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              onClick={() => setShowPresets(!showPresets)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-white/5 border border-white/10 text-white/50 hover:text-white transition-all"
            >
              <Save className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Vorlagen</span>
              <ChevronDown className={cn('w-3 h-3 transition-transform', showPresets && 'rotate-180')} />
            </button>
            {showPresets && (
              <div className="absolute right-0 top-full mt-1 w-64 bg-[#1a1a2e] border border-white/15 rounded-xl shadow-2xl z-50 p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Name..."
                    value={presetName}
                    onChange={e => setPresetName(e.target.value)}
                    className="flex-1 px-2 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs focus:outline-none focus:border-[#FFD700]/40 placeholder:text-white/30"
                  />
                  <button onClick={handleSavePreset} disabled={!presetName.trim()} className="px-2 py-1.5 bg-[#FFD700]/20 text-[#FFD700] text-xs font-bold rounded-lg disabled:opacity-30">
                    Speichern
                  </button>
                </div>
                {presets.length > 0 && <div className="border-t border-white/10 pt-2 space-y-1">
                  {presets.map(p => (
                    <div key={p.name} className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 transition-colors">
                      <button onClick={() => handleLoadPreset(p)} className="text-xs text-white/70 hover:text-white text-left flex-1 min-w-0">
                        <div className="font-medium truncate">{p.name}</div>
                        <div className="text-[10px] text-white/30">{p.formationId}</div>
                      </button>
                      <button onClick={() => handleDeletePreset(p.name)} className="text-white/30 hover:text-red-400 p-1"><X className="w-3 h-3" /></button>
                    </div>
                  ))}
                </div>}
                {presets.length === 0 && <div className="text-[10px] text-white/30 text-center py-2">Noch keine Vorlagen</div>}
              </div>
            )}
          </div>
          <button
            onClick={() => setAssignments(new Map())}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-white/5 border border-white/10 text-white/50 hover:text-white transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset</span>
          </button>
        </div>
      </div>

      {/* Pitch */}
      <SquadPitch formation={formation} assignments={assignedPlayers} onSlotClick={handleSlotClick} />

      {/* Player Picker Modal */}
      {pickerOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center" onClick={() => setPickerOpen(null)}>
          <div onClick={e => e.stopPropagation()} className="w-full max-w-md max-h-[70vh] bg-[#0f0f1a] border border-white/15 rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col">
            <div className="p-4 border-b border-white/10">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-black text-sm">
                  <span style={{ color: getPosColor(pickerOpen.pos) }}>{pickerOpen.pos}</span> auswählen
                </h3>
                <button onClick={() => setPickerOpen(null)} className="p-1 hover:bg-white/10 rounded-lg"><X className="w-4 h-4 text-white/50" /></button>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
                <input
                  type="text"
                  placeholder="Spieler suchen..."
                  value={pickerSearch}
                  onChange={e => setPickerSearch(e.target.value)}
                  autoFocus
                  className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-[#FFD700]/40 placeholder:text-white/30"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {pickerPlayers.length === 0 ? (
                <div className="text-center text-white/30 text-sm py-8">
                  {ownedPlayers.filter(p => p.pos === pickerOpen.pos).length === 0
                    ? `Keine eigenen ${pickerOpen.pos}-Spieler`
                    : 'Keine Spieler gefunden'}
                </div>
              ) : (
                pickerPlayers.map(p => (
                  <button
                    key={p.id}
                    onClick={() => handlePickPlayer(p.id)}
                    className="w-full flex items-center justify-between gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <PositionBadge pos={p.pos} size="sm" />
                      <div className="min-w-0">
                        <div className="font-bold text-sm truncate">{p.first} {p.last}</div>
                        <div className="text-[11px] text-white/40">{p.club}</div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className={cn(
                        'font-mono font-bold text-sm',
                        p.perf.l5 >= 70 ? 'text-[#FFD700]' : p.perf.l5 >= 50 ? 'text-white' : 'text-red-400'
                      )}>
                        {p.perf.l5}
                      </div>
                      <div className="text-[10px] text-white/40 font-mono">{fmtBSD(p.prices.floor ?? 0)}</div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Owned Players List */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-black uppercase tracking-wide">Alle Spieler ({ownedPlayers.length})</h3>
          <div className="flex items-center gap-1">
            {(['perf', 'price', 'name'] as const).map(s => (
              <button
                key={s}
                onClick={() => setSortBy(s)}
                className={cn(
                  'px-2 py-1 rounded-lg text-[10px] font-bold transition-all',
                  sortBy === s ? 'bg-[#FFD700]/15 text-[#FFD700]' : 'text-white/40 hover:text-white/70'
                )}
              >
                {s === 'perf' ? 'L5' : s === 'price' ? 'Wert' : 'Name'}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-1.5">
          {sortedOwned.map(p => (
            <PlayerDisplay key={p.id} variant="compact" player={p} showActions={false}
              className={assignedIds.has(p.id) ? 'bg-[#22C55E]/[0.06] border-[#22C55E]/20' : ''} />
          ))}
          {ownedPlayers.length === 0 && (
            <Card className="p-8 text-center">
              <div className="text-white/30 mb-2">Noch keine Spieler im Kader</div>
              <div className="text-sm text-white/50">Verpflichte Spieler über Scouting oder Transferliste</div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
