'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Save, RotateCcw, Search, ChevronDown, X, ShoppingCart, Shield } from 'lucide-react';
import Link from 'next/link';
import { Card } from '@/components/ui';
import { PositionBadge, PlayerIdentity } from '@/components/player';
import { cn } from '@/lib/utils';
import { getClub } from '@/lib/clubs';
import { useUser } from '@/components/providers/AuthProvider';
import { useRecentMinutes, useRecentScores, useNextFixtures, usePlayerEventUsage } from '@/lib/queries/managerData';
import SquadPitch from './SquadPitch';
import SquadSummaryStats from './SquadSummaryStats';
import { FORMATIONS, DEFAULT_FORMATIONS, DEFAULT_SQUAD_SIZE, SQUAD_PRESET_KEY, SQUAD_SIZE_KEY } from './constants';
import { getPosColor } from './helpers';
import { StatusPill, MinutesPill, NextMatchBadge, STATUS_CONFIG } from './bestand/bestandHelpers';
import type { Player, Pos } from '@/types';
import type { FormationId, SquadPreset, SquadSize } from './types';
import type { NextFixtureInfo } from '@/lib/services/fixtures';

// ============================================
// EVENT USAGE BADGE
// ============================================

function EventUsageBadge({ count, title }: { count: number; title: string }) {
  if (count === 0) return null;
  return (
    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-green-500/10 border border-green-500/20 rounded text-[9px] font-bold text-green-500"
          title={title}>
      <Shield className="size-2.5" aria-hidden="true" />{count}
    </span>
  );
}

// ============================================
// SCORE CIRCLE (prominent last score)
// ============================================

function ScoreCircle({ score }: { score: number | null }) {
  if (score == null) {
    return (
      <div className="size-7 md:size-10 rounded-full bg-white/[0.04] border border-white/10 flex items-center justify-center">
        <span className="text-[9px] md:text-[10px] font-mono text-white/20">&mdash;</span>
      </div>
    );
  }
  const bg = score >= 100 ? 'bg-gold/15 border-gold/30' : score >= 70 ? 'bg-white/[0.06] border-white/15' : 'bg-red-500/10 border-red-400/20';
  const text = score >= 100 ? 'text-gold' : score >= 70 ? 'text-white' : 'text-red-300';
  return (
    <div className={cn('size-7 md:size-10 rounded-full border flex items-center justify-center', bg)}>
      <span className={cn('text-xs md:text-sm font-black font-mono tabular-nums', text)}>{score}</span>
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
        const color = s.score >= 100 ? 'bg-gold' : s.score >= 70 ? 'bg-green-500' : 'bg-red-400';
        // Minutes overlay: opacity based on minutes (0'=dim, 90'=full)
        const opacity = s.min != null ? Math.max(0.4, s.min / 90) : 0.6;
        return (
          <div key={i} className="relative group">
            <div
              className={cn('w-[7px] rounded-sm', color)}
              style={{ height: `${(pct / 100) * 24}px`, opacity }}
            />
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-1.5 py-0.5 bg-black/90 border border-white/10 rounded text-[9px] font-mono text-white whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10">
              {s.score}pts{s.min != null ? ` · ${s.min}'` : ''}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============================================
// COMPACT PICKER ROW (for picker modals — single row, ~40px height)
// ============================================

function CompactPickerRow({ player, scores, minutes, onClick }: {
  player: Player;
  scores: number[] | undefined;
  minutes: number[] | undefined;
  onClick: () => void;
}) {
  const p = player;
  const lastScore = scores && scores.length > 0 ? scores[0] : null;
  const borderColor = p.pos === 'GK' ? '#34d399' : p.pos === 'DEF' ? '#fbbf24' : p.pos === 'MID' ? '#38bdf8' : '#fb7185';

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg border-l-2 hover:bg-white/[0.05] transition-colors text-left min-h-[44px]"
      style={{ borderLeftColor: borderColor }}
    >
      {/* Identity (28px photo via sm) */}
      <PlayerIdentity player={p} size="sm" showStatus={false} className="flex-1 min-w-0" />

      {/* L5 Bars */}
      <L5ScoreBars scores={scores} minutes={minutes} />

      {/* Score mini circle 28px */}
      {lastScore != null ? (
        <div className={cn(
          'size-7 rounded-full border flex items-center justify-center shrink-0',
          lastScore >= 100 ? 'bg-gold/15 border-gold/30' : lastScore >= 70 ? 'bg-white/[0.06] border-white/15' : 'bg-red-500/10 border-red-400/20',
        )}>
          <span className={cn('text-[10px] font-black font-mono tabular-nums',
            lastScore >= 100 ? 'text-gold' : lastScore >= 70 ? 'text-white' : 'text-red-300',
          )}>{lastScore}</span>
        </div>
      ) : (
        <div className="size-7 rounded-full bg-white/[0.03] border border-white/[0.06] flex items-center justify-center shrink-0">
          <span className="text-[9px] font-mono text-white/15">&mdash;</span>
        </div>
      )}
    </button>
  );
}

// ============================================
// FULL PLAYER ROW (for below-pitch list + desktop "Alle" view)
// ============================================

function FullPlayerRow({ player, minutes, scores, nextFixture, eventCount, isAssigned, eventUsageTitle, inLineupTitle }: {
  player: Player;
  minutes: number[] | undefined;
  scores: number[] | undefined;
  nextFixture: NextFixtureInfo | undefined;
  eventCount: number;
  isAssigned: boolean;
  eventUsageTitle: string;
  inLineupTitle: string;
}) {
  const t = useTranslations('market');
  const p = player;
  const borderColor = p.pos === 'GK' ? '#34d399' : p.pos === 'DEF' ? '#fbbf24' : p.pos === 'MID' ? '#38bdf8' : '#fb7185';
  const lastScore = scores && scores.length > 0 ? scores[0] : null;

  return (
    <div
      className={cn(
        'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border-l-2 transition-colors text-left',
        'bg-white/[0.02] border border-white/[0.06]',
        isAssigned && 'bg-green-500/[0.06] border-green-500/20',
      )}
      style={{ borderLeftColor: borderColor }}
    >
      {/* Center: Identity + Meta */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <PlayerIdentity player={p} size="md" showStatus={false} />
          {isAssigned && (
            <span className="shrink-0" title={inLineupTitle}>
              <Shield className="size-3 text-green-500" aria-hidden="true" />
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          <StatusPill status={p.status} />
          <EventUsageBadge count={eventCount} title={eventUsageTitle} />
          <span className="text-[10px] font-mono text-white/40 tabular-nums">
            {p.stats.matches}<span className="text-white/25">{t('statMatchesAbbr')}</span>{' '}
            {p.stats.goals}<span className="text-white/25">{t('statGoalsAbbr')}</span>{' '}
            {p.stats.assists}<span className="text-white/25">{t('statAssistsAbbr')}</span>
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
    </div>
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
  const t = useTranslations('market');
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

  // Position labels map
  const POS_LABEL: Record<Pos, string> = {
    GK: t('kaderPosGk'),
    DEF: t('kaderPosDef'),
    MID: t('kaderPosMid'),
    ATT: t('kaderPosAtt'),
  };

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

  // ── Desktop Side Panel (right of pitch) ──
  const sidePanel = (
    <div className="flex flex-col h-full min-h-0">
      {/* Header: Position tabs */}
      <div className="p-3 border-b border-white/10 space-y-2.5 shrink-0">
        <div className="flex items-center gap-1">
          <button
            onClick={() => { setSidePanelPos(null); setSidePanelSlot(null); }}
            className={cn('px-2.5 py-1 rounded-lg text-[10px] font-black transition-colors',
              !sidePanelPos ? 'bg-gold/15 text-gold' : 'text-white/40 hover:text-white/70'
            )}
          >{t('kaderAllTab')}</button>
          {(['GK', 'DEF', 'MID', 'ATT'] as Pos[]).map(pos => {
            const active = sidePanelPos === pos;
            return (
              <button
                key={pos}
                onClick={() => { setSidePanelPos(pos); setSidePanelSlot(null); }}
                className={cn('px-2.5 py-1 rounded-lg text-[10px] font-black transition-colors',
                  active ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/70'
                )}
                style={active ? { color: getPosColor(pos) } : undefined}
              >{pos}</button>
            );
          })}
        </div>
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-white/30" aria-hidden="true" />
          <input
            type="text"
            placeholder={t('kaderSearchPlaceholder')}
            aria-label={t('kaderSearchLabel')}
            value={pickerSearch}
            onChange={e => setPickerSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs focus:outline-none focus:border-gold/40 placeholder:text-white/30"
          />
        </div>
      </div>

      {/* Title */}
      <div className="px-3 pt-2.5 pb-1 shrink-0 flex items-center justify-between">
        <div className="text-xs font-black uppercase text-white/60">
          {sidePanelPos ? (
            <>{t('kaderPickTitle', { pos: '' })}<span style={{ color: getPosColor(sidePanelPos) }}>{POS_LABEL[sidePanelPos]}</span></>
          ) : (
            <>{t('kaderYourSquad', { count: ownedPlayers.length })}</>
          )}
        </div>
        <div className="flex items-center gap-0.5">
          {(['perf', 'price', 'name'] as const).map(s => (
            <button
              key={s}
              onClick={() => setSortBy(s)}
              className={cn('px-1.5 py-0.5 rounded text-[9px] font-bold transition-colors',
                sortBy === s ? 'bg-gold/15 text-gold' : 'text-white/30 hover:text-white/60'
              )}
            >{s === 'perf' ? 'L5' : s === 'price' ? t('kaderSortValue') : 'A-Z'}</button>
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
                  ? t('kaderNoOwnedPos', { pos: sidePanelPos })
                  : t('kaderNoPlayersFound')}
              </div>
              <Link href="/market?tab=kaufen" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gold/15 text-gold text-[10px] font-bold rounded-lg hover:bg-gold/25 transition-colors mt-2">
                <ShoppingCart className="size-3" aria-hidden="true" />
                {t('kaderBuyPlayers')}
              </Link>
            </div>
          ) : (
            pickerPlayers.map(p => (
              <CompactPickerRow
                key={p.id}
                player={p}
                scores={scoresMap?.get(p.id)}
                minutes={minutesMap?.get(p.id)}
                onClick={() => handlePickPlayer(p.id)}
              />
            ))
          )
        ) : (
          // All owned players
          sortedOwned.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-xs text-white/30 mb-2">{t('kaderNoPlayersYet')}</div>
              <Link href="/market?tab=kaufen" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gold/15 text-gold text-[10px] font-bold rounded-lg hover:bg-gold/25 transition-colors">
                <ShoppingCart className="size-3" aria-hidden="true" />
                {t('kaderBuyPlayers')}
              </Link>
            </div>
          ) : (
            sortedOwned.map(p => (
              <CompactPickerRow
                key={p.id}
                player={p}
                scores={scoresMap?.get(p.id)}
                minutes={minutesMap?.get(p.id)}
                onClick={() => handlePickPlayer(p.id)}
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
                'px-3 py-1 rounded-full text-xs font-black transition-colors',
                squadSize === size
                  ? 'bg-gold text-black'
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
              'px-3 py-1.5 rounded-full text-xs font-bold border transition-colors',
              formationId === f.id
                ? 'bg-gold/15 border-gold/30 text-gold'
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
              aria-label={t('kaderPresetsLabel')}
              aria-expanded={showPresets}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-white/5 border border-white/10 text-white/50 hover:text-white transition-colors"
            >
              <Save className="size-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">{t('kaderPresetsLabel')}</span>
              <ChevronDown className={cn('size-3 transition-transform', showPresets && 'rotate-180')} aria-hidden="true" />
            </button>
            {showPresets && (
              <div className="absolute right-0 top-full mt-1 w-64 bg-[#1a1a2e] border border-white/15 rounded-xl shadow-2xl z-50 p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Name..."
                    aria-label={t('kaderPresetNameLabel')}
                    value={presetName}
                    onChange={e => setPresetName(e.target.value)}
                    className="flex-1 px-2 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs focus:outline-none focus:border-gold/40 placeholder:text-white/30"
                  />
                  <button onClick={handleSavePreset} disabled={!presetName.trim()} className="px-2 py-1.5 bg-gold/20 text-gold text-xs font-bold rounded-lg disabled:opacity-30">
                    {t('kaderSavePreset')}
                  </button>
                </div>
                {presets.length > 0 && <div className="border-t border-white/10 pt-2 space-y-1">
                  {presets.map(p => (
                    <div key={p.name} className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 transition-colors">
                      <button onClick={() => handleLoadPreset(p)} className="text-xs text-white/70 hover:text-white text-left flex-1 min-w-0">
                        <div className="font-medium truncate">{p.name}</div>
                        <div className="text-[10px] text-white/30">{p.formationId}</div>
                      </button>
                      <button onClick={() => handleDeletePreset(p.name)} aria-label={t('kaderDeletePreset', { name: p.name })} className="text-white/30 hover:text-red-400 p-1"><X className="size-3" aria-hidden="true" /></button>
                    </div>
                  ))}
                </div>}
                {presets.length === 0 && <div className="text-[10px] text-white/30 text-center py-2">{t('kaderNoPresets')}</div>}
              </div>
            )}
          </div>
          <button
            onClick={() => { setAssignments(new Map()); setSidePanelPos(null); setSidePanelSlot(null); }}
            aria-label={t('kaderResetLabel')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-white/5 border border-white/10 text-white/50 hover:text-white transition-colors"
          >
            <RotateCcw className="size-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">{t('kaderReset')}</span>
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

      {/* ═══ Mobile: Full-Screen Picker ═══ */}
      {pickerOpen && (
        <div className="fixed inset-0 z-[70] bg-bg-main flex flex-col lg:hidden">
          {/* ── Sticky Header ── */}
          <div className="shrink-0 bg-bg-main border-b border-white/10">
            {/* Top bar: Back + Title + Count */}
            <div className="flex items-center gap-3 px-4 pt-3 pb-2">
              <button
                onClick={() => { setPickerOpen(null); setSidePanelPos(null); setSidePanelSlot(null); }}
                aria-label={t('kaderClose')}
                className="p-1.5 -ml-1.5 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="size-5 text-white/60" aria-hidden="true" />
              </button>
              <div className="flex-1">
                <h3 className="font-black text-base text-balance">
                  {t('kaderPickPos', { pos: '' })}<span style={{ color: getPosColor(pickerOpen.pos) }}>{POS_LABEL[pickerOpen.pos]}</span>
                </h3>
                <div className="text-[10px] text-white/40 tabular-nums">{t('kaderAvailableCount', { count: pickerPlayers.length })}</div>
              </div>
              {/* Sort pills */}
              <div className="flex items-center gap-0.5">
                {(['perf', 'name'] as const).map(s => (
                  <button
                    key={s}
                    onClick={() => setSortBy(s === 'perf' ? 'perf' : 'name')}
                    className={cn('px-2 py-1 rounded text-[10px] font-bold transition-colors',
                      sortBy === s ? 'bg-gold/15 text-gold' : 'text-white/30'
                    )}
                  >{s === 'perf' ? 'L5' : 'A-Z'}</button>
                ))}
              </div>
            </div>
            {/* Search */}
            <div className="px-4 pb-2.5">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-white/30" aria-hidden="true" />
                <input
                  type="text"
                  placeholder={t('kaderSearchPlaceholder')}
                  aria-label={t('kaderSearchLabel')}
                  value={pickerSearch}
                  onChange={e => setPickerSearch(e.target.value)}
                  autoFocus
                  className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-gold/40 placeholder:text-white/30"
                />
              </div>
            </div>
          </div>

          {/* ── Scrollable Player List ── */}
          <div className="flex-1 overflow-y-auto overscroll-contain">
            {pickerPlayers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-6">
                <PositionBadge pos={pickerOpen.pos} size="lg" />
                <div className="text-sm text-white/30 mt-3 text-center text-pretty">
                  {ownedPlayers.filter(p => p.pos === pickerOpen.pos).length === 0
                    ? t('kaderNoOwnedPosAlt', { pos: POS_LABEL[pickerOpen.pos] })
                    : t('kaderNoPlayersFound')}
                </div>
                <Link
                  href="/market?tab=kaufen"
                  onClick={() => { setPickerOpen(null); setSidePanelPos(null); setSidePanelSlot(null); }}
                  className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-gold/15 text-gold text-xs font-bold rounded-xl hover:bg-gold/25 transition-colors"
                >
                  <ShoppingCart className="size-3.5" aria-hidden="true" />
                  {t('kaderBuyPlayers')}
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-white/[0.04]">
                {pickerPlayers.map(p => {
                  const lastScore = scoresMap?.get(p.id)?.[0] ?? null;
                  const scoreColor = lastScore != null
                    ? (lastScore >= 100 ? 'text-gold' : lastScore >= 70 ? 'text-white' : 'text-red-300')
                    : 'text-white/15';
                  return (
                    <button
                      key={p.id}
                      onClick={() => handlePickPlayer(p.id)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 active:bg-white/[0.06] transition-colors text-left"
                    >
                      {/* Identity */}
                      <PlayerIdentity player={p} size="md" className="flex-1 min-w-0" />
                      {/* Score + Bars */}
                      <div className="shrink-0 flex items-center gap-2.5">
                        <L5ScoreBars scores={scoresMap?.get(p.id)} minutes={minutesMap?.get(p.id)} />
                        <div className="w-10 text-right">
                          <div className={cn('text-lg font-black font-mono tabular-nums leading-none', scoreColor)}>
                            {lastScore ?? '–'}
                          </div>
                          <div className="text-[9px] text-white/25 font-mono">Score</div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══ Below-pitch player list (mobile + small desktop without side panel) ═══ */}
      <div className="lg:hidden">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-black uppercase text-balance">{t('kaderAllPlayers', { count: ownedPlayers.length })}</h3>
          <div className="flex items-center gap-1">
            {(['perf', 'price', 'name'] as const).map(s => (
              <button
                key={s}
                onClick={() => setSortBy(s)}
                className={cn(
                  'px-2 py-1 rounded-lg text-[10px] font-bold transition-colors',
                  sortBy === s ? 'bg-gold/15 text-gold' : 'text-white/40 hover:text-white/70'
                )}
              >
                {s === 'perf' ? 'L5' : s === 'price' ? t('kaderSortValue') : t('kaderSortNameLabel')}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-1.5">
          {sortedOwned.map(p => (
            <FullPlayerRow
              key={p.id}
              player={p}
              minutes={minutesMap?.get(p.id)}
              scores={scoresMap?.get(p.id)}
              nextFixture={getNextFixture(p)}
              eventCount={getEventCount(p.id)}
              isAssigned={assignedIds.has(p.id)}
              eventUsageTitle={t('kaderEventUsage', { count: getEventCount(p.id) })}
              inLineupTitle={t('bestandInLineup')}
            />
          ))}
          {ownedPlayers.length === 0 && (
            <Card className="p-8 text-center">
              <div className="text-white/30 mb-2">{t('kaderNoPlayersYet')}</div>
              <div className="text-sm text-white/50 text-pretty">{t('kaderEmptyDesc')}</div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
