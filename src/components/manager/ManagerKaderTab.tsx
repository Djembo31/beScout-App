'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Save, RotateCcw, Search, ChevronDown, X, ShoppingCart, Shield, Heart, AlertTriangle, HelpCircle } from 'lucide-react';
import Link from 'next/link';
import { Card } from '@/components/ui';
import { PositionBadge } from '@/components/player';
import { cn } from '@/lib/utils';
import { getClub } from '@/lib/clubs';
import { useUser } from '@/components/providers/AuthProvider';
import { useRecentMinutes, useRecentScores, useNextFixtures, usePlayerEventUsage } from '@/lib/queries/managerData';
import SquadPitch from './SquadPitch';
import SquadSummaryStats from './SquadSummaryStats';
import { FORMATIONS, DEFAULT_FORMATIONS, DEFAULT_SQUAD_SIZE, SQUAD_PRESET_KEY, SQUAD_SIZE_KEY } from './constants';
import { getPosColor } from './helpers';
import type { Player, Pos, PlayerStatus } from '@/types';
import type { FormationId, SquadPreset, SquadSize } from './types';
import type { NextFixtureInfo } from '@/lib/services/fixtures';

// ============================================
// STATUS HELPERS
// ============================================

const STATUS_CONFIG: Record<PlayerStatus, { label: string; short: string; bg: string; border: string; text: string; icon: typeof Heart }> = {
  fit: { label: 'Fit', short: 'Fit', bg: 'bg-[#22C55E]/10', border: 'border-[#22C55E]/20', text: 'text-[#22C55E]', icon: Heart },
  injured: { label: 'Verletzt', short: 'Verl.', bg: 'bg-red-500/10', border: 'border-red-500/20', text: 'text-red-400', icon: AlertTriangle },
  suspended: { label: 'Gesperrt', short: 'Gesp.', bg: 'bg-orange-500/10', border: 'border-orange-500/20', text: 'text-orange-400', icon: AlertTriangle },
  doubtful: { label: 'Fraglich', short: 'Fragl.', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', text: 'text-yellow-400', icon: HelpCircle },
};

function StatusPill({ status }: { status: PlayerStatus }) {
  const cfg = STATUS_CONFIG[status];
  const Icon = cfg.icon;
  return (
    <span className={cn('inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold border', cfg.bg, cfg.border, cfg.text)}>
      <Icon className="w-2.5 h-2.5" />
      <span className="hidden sm:inline">{cfg.short}</span>
    </span>
  );
}

// ============================================
// MINUTES PILL
// ============================================

function MinutesPill({ minutes }: { minutes: number[] | undefined }) {
  if (!minutes || minutes.length === 0) {
    return <span className="text-[10px] text-white/30 font-mono">&mdash;&apos;</span>;
  }
  const avg = Math.round(minutes.reduce((s, m) => s + m, 0) / minutes.length);
  const color = avg >= 75 ? 'text-[#22C55E]' : avg >= 45 ? 'text-yellow-400' : 'text-red-400';
  return (
    <span className={cn('text-[10px] font-mono font-bold', color)}>
      ∅{avg}&apos;
    </span>
  );
}

// ============================================
// NEXT MATCH BADGE
// ============================================

function NextMatchBadge({ fixture }: { fixture: NextFixtureInfo | undefined }) {
  if (!fixture) return <span className="text-[10px] text-white/30">&mdash;</span>;
  return (
    <span className="text-[10px] text-white/50 font-mono">
      <span className={fixture.isHome ? 'text-[#22C55E]' : 'text-sky-300'}>
        {fixture.isHome ? 'H' : 'A'}
      </span>
      {' '}{fixture.opponentShort}
    </span>
  );
}

// ============================================
// EVENT USAGE BADGE
// ============================================

function EventUsageBadge({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-[#22C55E]/10 border border-[#22C55E]/20 rounded text-[9px] font-bold text-[#22C55E]"
          title={`In ${count} aktiven Event(s) aufgestellt`}>
      <Shield className="w-2.5 h-2.5" />{count}
    </span>
  );
}

// ============================================
// SCORE CIRCLE (prominent last score)
// ============================================

function ScoreCircle({ score }: { score: number | null }) {
  if (score == null) {
    return (
      <div className="w-10 h-10 rounded-full bg-white/[0.04] border border-white/10 flex items-center justify-center">
        <span className="text-[10px] font-mono text-white/20">&mdash;</span>
      </div>
    );
  }
  const bg = score >= 100 ? 'bg-[#FFD700]/15 border-[#FFD700]/30' : score >= 70 ? 'bg-white/[0.06] border-white/15' : 'bg-red-500/10 border-red-400/20';
  const text = score >= 100 ? 'text-[#FFD700]' : score >= 70 ? 'text-white' : 'text-red-300';
  return (
    <div className={cn('w-10 h-10 rounded-full border flex items-center justify-center', bg)}>
      <span className={cn('text-sm font-black font-mono', text)}>{score}</span>
    </div>
  );
}

// ============================================
// LAST 5 SCORE BARS (vertical bars for GW scores + minutes overlay)
// ============================================

function L5ScoreBars({ scores, minutes }: { scores: number[] | undefined; minutes: number[] | undefined }) {
  // Build 5 slots (most recent first, pad with null)
  const slots: { score: number | null; min: number | null }[] = [];
  for (let i = 0; i < 5; i++) {
    slots.push({
      score: scores && i < scores.length ? scores[i] : null,
      min: minutes && i < minutes.length ? minutes[i] : null,
    });
  }
  // Reverse so oldest is left, newest is right
  slots.reverse();

  const hasAnyData = slots.some(s => s.score != null);
  if (!hasAnyData) {
    return (
      <div className="flex items-end gap-[3px] h-6">
        {slots.map((_, i) => (
          <div key={i} className="w-[7px] h-1 rounded-sm bg-white/[0.06]" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex items-end gap-[3px] h-6">
      {slots.map((s, i) => {
        if (s.score == null) {
          return <div key={i} className="w-[7px] h-1 rounded-sm bg-white/[0.06]" />;
        }
        // Normalize: score 40-150 → height 15%-100%
        const pct = Math.min(100, Math.max(15, ((s.score - 40) / 110) * 100));
        const color = s.score >= 100 ? 'bg-[#FFD700]' : s.score >= 70 ? 'bg-[#22C55E]' : 'bg-red-400';
        // Minutes overlay: opacity based on minutes (0'=dim, 90'=full)
        const opacity = s.min != null ? Math.max(0.4, s.min / 90) : 0.6;
        return (
          <div key={i} className="relative group">
            <div
              className={cn('w-[7px] rounded-sm', color)}
              style={{ height: `${(pct / 100) * 24}px`, opacity }}
            />
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-1.5 py-0.5 bg-black/90 border border-white/10 rounded text-[8px] font-mono text-white whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10">
              {s.score}pts{s.min != null ? ` · ${s.min}'` : ''}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============================================
// PICKER PLAYER ROW (Performance-Fokus Card)
// ============================================

function PickerPlayerRow({ player, minutes, scores, nextFixture, eventCount, isAssigned, onClick }: {
  player: Player;
  minutes: number[] | undefined;
  scores: number[] | undefined;
  nextFixture: NextFixtureInfo | undefined;
  eventCount: number;
  isAssigned: boolean;
  onClick?: () => void;
}) {
  const p = player;
  const clubData = p.clubId ? getClub(p.clubId) : null;
  const borderColor = p.pos === 'GK' ? '#34d399' : p.pos === 'DEF' ? '#fbbf24' : p.pos === 'MID' ? '#38bdf8' : '#fb7185';
  const lastScore = scores && scores.length > 0 ? scores[0] : null;

  const Wrapper = onClick ? 'button' : 'div';

  return (
    <Wrapper
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border-l-2 transition-all text-left',
        'bg-white/[0.02] border border-white/[0.06]',
        isAssigned && 'bg-[#22C55E]/[0.06] border-[#22C55E]/20',
        onClick && 'hover:bg-white/[0.05] cursor-pointer',
      )}
      style={{ borderLeftColor: borderColor }}
    >
      {/* Player Photo */}
      <div className="shrink-0">
        {p.imageUrl ? (
          <img src={p.imageUrl} alt="" className="w-9 h-9 rounded-full object-cover border border-white/10" />
        ) : (
          <div className="w-9 h-9 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center text-[10px] font-bold text-white/30">
            {p.first[0]}{p.last[0]}
          </div>
        )}
      </div>

      {/* Center: Identity + Meta */}
      <div className="flex-1 min-w-0">
        {/* Row 1: Pos + #Nr + Name + Assigned icon */}
        <div className="flex items-center gap-1.5">
          <PositionBadge pos={p.pos} size="sm" />
          <span className="text-[10px] font-mono text-white/50">#{p.ticket}</span>
          <span className="font-bold text-xs truncate">{p.first} {p.last}</span>
          {isAssigned && (
            <span className="shrink-0" title="In Aufstellung">
              <Shield className="w-3 h-3 text-[#22C55E]" />
            </span>
          )}
        </div>
        {/* Row 2: Club, Age, Status, EventUsage, Stats, Min, Next */}
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          {clubData?.logo ? (
            <img src={clubData.logo} alt={p.club} className="w-3.5 h-3.5 rounded-full object-cover shrink-0" />
          ) : clubData?.colors?.primary ? (
            <div className="w-3.5 h-3.5 rounded-full shrink-0" style={{ backgroundColor: clubData.colors.primary }} />
          ) : null}
          <span className="text-[10px] text-white/50">{p.club}</span>
          {p.age > 0 && <span className="text-[10px] text-white/30 font-mono">{p.age}J.</span>}
          <StatusPill status={p.status} />
          <EventUsageBadge count={eventCount} />
          <span className="text-[10px] font-mono text-white/40">
            {p.stats.matches}<span className="text-white/25">S</span>{' '}
            {p.stats.goals}<span className="text-white/25">T</span>{' '}
            {p.stats.assists}<span className="text-white/25">A</span>
          </span>
          <MinutesPill minutes={minutes} />
          <NextMatchBadge fixture={nextFixture} />
        </div>
      </div>

      {/* Right: L5 Score Bars + Last Score Circle */}
      <div className="shrink-0 flex items-center gap-2">
        <L5ScoreBars scores={scores} minutes={minutes} />
        <ScoreCircle score={lastScore} />
      </div>
    </Wrapper>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

interface ManagerKaderTabProps {
  players: Player[]; // all players (for picker)
  ownedPlayers: Player[]; // only owned players
}

export default function ManagerKaderTab({ players, ownedPlayers }: ManagerKaderTabProps) {
  const { user } = useUser();
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
  // Desktop side-panel: which position is selected (null = show all owned)
  const [sidePanelPos, setSidePanelPos] = useState<Pos | null>(null);
  const [sidePanelSlot, setSidePanelSlot] = useState<number | null>(null);

  // ── Manager Data Hooks ──
  const { data: minutesMap } = useRecentMinutes();
  const { data: scoresMap } = useRecentScores();
  const { data: nextFixturesMap } = useNextFixtures();
  const { data: eventUsageMap } = usePlayerEventUsage(user?.id);

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
      // Desktop: set side panel filter; Mobile: open modal
      setSidePanelPos(pos);
      setSidePanelSlot(slotIndex);
      setPickerOpen({ slotIndex, pos });
      setPickerSearch('');
    }
  }, [assignments]);

  const handlePickPlayer = useCallback((playerId: string) => {
    const targetSlot = sidePanelSlot ?? pickerOpen?.slotIndex;
    if (targetSlot == null) return;
    setAssignments(prev => {
      const next = new Map(prev);
      // Remove player from any other slot first
      Array.from(next.entries()).forEach(([idx, pid]) => {
        if (pid === playerId) next.delete(idx);
      });
      next.set(targetSlot, playerId);
      return next;
    });
    setPickerOpen(null);
    setSidePanelPos(null);
    setSidePanelSlot(null);
  }, [pickerOpen, sidePanelSlot]);

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

  // Helper to get event usage count for a player
  const getEventCount = useCallback((playerId: string) => {
    return eventUsageMap?.get(playerId)?.length ?? 0;
  }, [eventUsageMap]);

  // Helper to get next fixture for a player
  const getNextFixture = useCallback((player: Player) => {
    return nextFixturesMap?.get(player.clubId ?? '');
  }, [nextFixturesMap]);

  // Picker players — filter by position, search, not already assigned
  const pickerPlayers = useMemo(() => {
    const targetPos = sidePanelPos ?? pickerOpen?.pos;
    if (!targetPos) return [];
    let list = ownedPlayers.filter(p => p.pos === targetPos && !assignedIds.has(p.id));
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
  }, [sidePanelPos, pickerOpen, ownedPlayers, assignedIds, pickerSearch, sortBy]);

  // Owned player list for "all players" section (when no position selected)
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

  // The side panel position label
  const POS_LABEL: Record<Pos, string> = { GK: 'Torwart', DEF: 'Verteidiger', MID: 'Mittelfeldspieler', ATT: 'Angreifer' };

  // ── Desktop Side Panel (right of pitch) ──
  const sidePanel = (
    <div className="flex flex-col h-full min-h-0">
      {/* Header: Position tabs */}
      <div className="p-3 border-b border-white/10 space-y-2.5 shrink-0">
        <div className="flex items-center gap-1">
          <button
            onClick={() => { setSidePanelPos(null); setSidePanelSlot(null); }}
            className={cn('px-2.5 py-1 rounded-lg text-[10px] font-black transition-all',
              !sidePanelPos ? 'bg-[#FFD700]/15 text-[#FFD700]' : 'text-white/40 hover:text-white/70'
            )}
          >Alle</button>
          {(['GK', 'DEF', 'MID', 'ATT'] as Pos[]).map(pos => {
            const active = sidePanelPos === pos;
            return (
              <button
                key={pos}
                onClick={() => { setSidePanelPos(pos); setSidePanelSlot(null); }}
                className={cn('px-2.5 py-1 rounded-lg text-[10px] font-black transition-all',
                  active ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/70'
                )}
                style={active ? { color: getPosColor(pos) } : undefined}
              >{pos}</button>
            );
          })}
        </div>
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
          <input
            type="text"
            placeholder="Spieler suchen..."
            value={pickerSearch}
            onChange={e => setPickerSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs focus:outline-none focus:border-[#FFD700]/40 placeholder:text-white/30"
          />
        </div>
      </div>

      {/* Title */}
      <div className="px-3 pt-2.5 pb-1 shrink-0 flex items-center justify-between">
        <div className="text-xs font-black uppercase tracking-wide text-white/60">
          {sidePanelPos ? (
            <>Wähle deinen <span style={{ color: getPosColor(sidePanelPos) }}>{POS_LABEL[sidePanelPos]}</span></>
          ) : (
            <>Dein Kader ({ownedPlayers.length})</>
          )}
        </div>
        <div className="flex items-center gap-0.5">
          {(['perf', 'price', 'name'] as const).map(s => (
            <button
              key={s}
              onClick={() => setSortBy(s)}
              className={cn('px-1.5 py-0.5 rounded text-[9px] font-bold transition-all',
                sortBy === s ? 'bg-[#FFD700]/15 text-[#FFD700]' : 'text-white/30 hover:text-white/60'
              )}
            >{s === 'perf' ? 'L5' : s === 'price' ? 'Wert' : 'A-Z'}</button>
          ))}
        </div>
      </div>

      {/* Player list — scrollable */}
      <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-1 min-h-0">
        {sidePanelPos ? (
          // Filtered by position (picking mode)
          pickerPlayers.length === 0 ? (
            <div className="text-center py-8 space-y-2">
              <PositionBadge pos={sidePanelPos} size="lg" />
              <div className="text-xs text-white/30 mt-2">
                {ownedPlayers.filter(p => p.pos === sidePanelPos).length === 0
                  ? `Keine eigenen ${sidePanelPos}-Spieler`
                  : 'Keine Spieler gefunden'}
              </div>
              <Link href="/market?tab=kaufen" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#FFD700]/15 text-[#FFD700] text-[10px] font-bold rounded-lg hover:bg-[#FFD700]/25 transition-all mt-2">
                <ShoppingCart className="w-3 h-3" />
                Spieler kaufen
              </Link>
            </div>
          ) : (
            pickerPlayers.map(p => (
              <PickerPlayerRow
                key={p.id}
                player={p}
                minutes={minutesMap?.get(p.id)}
                scores={scoresMap?.get(p.id)}
                nextFixture={getNextFixture(p)}
                eventCount={getEventCount(p.id)}
                isAssigned={false}
                onClick={() => handlePickPlayer(p.id)}
              />
            ))
          )
        ) : (
          // All owned players
          sortedOwned.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-xs text-white/30 mb-2">Noch keine Spieler im Kader</div>
              <Link href="/market?tab=kaufen" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#FFD700]/15 text-[#FFD700] text-[10px] font-bold rounded-lg hover:bg-[#FFD700]/25 transition-all">
                <ShoppingCart className="w-3 h-3" />
                Spieler kaufen
              </Link>
            </div>
          ) : (
            sortedOwned.map(p => (
              <PickerPlayerRow
                key={p.id}
                player={p}
                minutes={minutesMap?.get(p.id)}
                scores={scoresMap?.get(p.id)}
                nextFixture={getNextFixture(p)}
                eventCount={getEventCount(p.id)}
                isAssigned={assignedIds.has(p.id)}
              />
            ))
          )
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-3">
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
            onClick={() => { setAssignments(new Map()); setSidePanelPos(null); setSidePanelSlot(null); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-white/5 border border-white/10 text-white/50 hover:text-white transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset</span>
          </button>
        </div>
      </div>

      {/* ═══ Desktop: Pitch (left) + Player Panel (right) side by side ═══ */}
      <div className="flex gap-4">
        {/* Pitch — takes ~55% on desktop, full on mobile */}
        <div className="w-full lg:w-[55%] shrink-0">
          <SquadPitch formation={formation} assignments={assignedPlayers} onSlotClick={handleSlotClick} />
        </div>

        {/* Side Panel — only visible on lg+ */}
        <div className="hidden lg:flex flex-col flex-1 min-w-0 bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden"
          style={{ maxHeight: 'min(55vh, 500px)' }}>
          {sidePanel}
        </div>
      </div>

      {/* ═══ Mobile: Modal Picker ═══ */}
      {pickerOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center lg:hidden" onClick={() => { setPickerOpen(null); setSidePanelPos(null); setSidePanelSlot(null); }}>
          <div onClick={e => e.stopPropagation()} className="w-full max-w-md max-h-[70vh] bg-[#0f0f1a] border border-white/15 rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col">
            <div className="p-4 border-b border-white/10">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-black text-sm">
                  <span style={{ color: getPosColor(pickerOpen.pos) }}>{pickerOpen.pos}</span> auswählen
                </h3>
                <button onClick={() => { setPickerOpen(null); setSidePanelPos(null); setSidePanelSlot(null); }} className="p-1 hover:bg-white/10 rounded-lg"><X className="w-4 h-4 text-white/50" /></button>
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
                  <PickerPlayerRow
                    key={p.id}
                    player={p}
                    minutes={minutesMap?.get(p.id)}
                    scores={scoresMap?.get(p.id)}
                    nextFixture={getNextFixture(p)}
                    eventCount={getEventCount(p.id)}
                    isAssigned={false}
                    onClick={() => handlePickPlayer(p.id)}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══ Below-pitch player list (mobile + small desktop without side panel) ═══ */}
      <div className="lg:hidden">
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
            <PickerPlayerRow
              key={p.id}
              player={p}
              minutes={minutesMap?.get(p.id)}
              scores={scoresMap?.get(p.id)}
              nextFixture={getNextFixture(p)}
              eventCount={getEventCount(p.id)}
              isAssigned={assignedIds.has(p.id)}
            />
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
