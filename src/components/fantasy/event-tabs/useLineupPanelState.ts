import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNextFixtures } from '@/lib/queries/fantasyPicker';
import { useRecentScores } from '@/lib/queries/managerData';
import { usePlayers } from '@/lib/queries/players';
import { getClub } from '@/lib/clubs';
import { getClubAvgL5 } from '@/components/fantasy/FDRBadge';
import { centsToBsd } from '@/lib/services/players';
import { PRESET_KEY } from '../constants';
import type { Pos } from '@/types';
import type { FantasyEvent, LineupPlayer, UserDpcHolding, LineupPreset } from '../types';
import type { FormationDef } from '../constants';
import type { PickerSortKey } from '@/components/fantasy/PickerSortFilter';
import type { BenchSlotKey } from '@/features/fantasy/store/lineupStore';

/**
 * Slice 195d — Picker-Mode:
 *  - `starter` = normaler Picker, fuellt selectedPlayers per slot
 *  - `bench-gk` / `bench-outfield` = fuellt bench-slot (fixed kind)
 */
export type PickerMode =
  | { kind: 'starter'; position: string; slot: number }
  | { kind: 'bench-gk' | 'bench-outfield'; benchKind: BenchSlotKey };

interface UseLineupPanelStateProps {
  event: FantasyEvent;
  selectedPlayers: LineupPlayer[];
  effectiveHoldings: UserDpcHolding[];
  ownedPlayerIds?: Set<string>;
  isPlayerLocked: (playerId: string) => boolean;
  formationSlots: { pos: string; slot: number }[];
  slotDbKeys: string[];
  selectedFormation: string;
  availableFormations: FormationDef[];
  onApplyPreset: (formation: string, lineup: LineupPlayer[]) => void;
  onSelectPlayer: (playerId: string, position: string, slot: number) => void;
  wildcardSlots?: Set<string>;
  // Slice 195d — Bench-Picker
  onSelectBench?: (kind: BenchSlotKey, playerId: string) => void;
}

export function useLineupPanelState({
  event, selectedPlayers, effectiveHoldings, ownedPlayerIds,
  isPlayerLocked, formationSlots, slotDbKeys, selectedFormation,
  availableFormations, onApplyPreset, onSelectPlayer, wildcardSlots,
  onSelectBench,
}: UseLineupPanelStateProps) {
  const isFullyLocked = event.status === 'ended';
  const isReadOnly = isFullyLocked;

  // ── Picker State ──
  // Slice 195d: showPlayerPicker erweitert um Bench-Picker-Mode (PickerMode-Discriminated-Union).
  const [pickerMode, setPickerMode] = useState<PickerMode | null>(null);
  // Backwards-compat: legacy showPlayerPicker fuer Starter-Slots (kind === 'starter').
  const showPlayerPicker = pickerMode && pickerMode.kind === 'starter'
    ? { position: pickerMode.position, slot: pickerMode.slot }
    : null;
  const [pickerSearch, setPickerSearch] = useState('');
  const [pickerSort, setPickerSort] = useState<PickerSortKey>('l5');
  const [clubFilter, setClubFilter] = useState<string[]>([]);
  const [onlyAvailable, setOnlyAvailable] = useState(true);
  const [synergyOnly, setSynergyOnly] = useState(false);

  // ── Preset State ──
  const [presetName, setPresetName] = useState('');
  const [showPresets, setShowPresets] = useState(false);
  const [presets, setPresets] = useState<LineupPreset[]>([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(PRESET_KEY);
      if (saved) setPresets(JSON.parse(saved));
    } catch { /* ignore */ }
  }, []);

  // ── Data Hooks ──
  // Slice 307: canonical last-5 scores via shared RPC (replaces weaker getBatchFormScores).
  const { data: formScoresMap } = useRecentScores();
  const { data: nextFixturesMap } = useNextFixtures(!isReadOnly);
  const { data: allPlayers = [] } = usePlayers(!isReadOnly);

  // ── Derived Data ──
  const ownershipBonusIds = useMemo(() => {
    if (!ownedPlayerIds || ownedPlayerIds.size === 0) return new Set<string>();
    const active: string[] = [];
    for (const sp of selectedPlayers) {
      if (ownedPlayerIds.has(sp.playerId)) {
        active.push(sp.playerId);
        if (active.length >= 3) break;
      }
    }
    return new Set(active);
  }, [selectedPlayers, ownedPlayerIds]);

  // Slice 423: Synergie per club_id (UUID) wie score_event (Server-Wahrheit), nicht stale players.club.
  const synergyClubs = useMemo(() => {
    const clubs = selectedPlayers.map(sp => {
      const h = effectiveHoldings.find(eh => eh.id === sp.playerId);
      return h ? (h.clubId ?? h.club) : undefined;
    }).filter(Boolean) as string[];
    return Array.from(new Set(clubs));
  }, [selectedPlayers, effectiveHoldings]);

  // Slice 423: Filter-Chips gruppiert + aufgelöst über club_id (UUID), konsistent zur Row (422).
  const availableClubsList = useMemo(() => {
    const seen = new Set<string>();
    const out: { id: string; label: string; logo: string | null }[] = [];
    for (const h of effectiveHoldings) {
      const id = h.clubId ?? h.club;
      if (!id || seen.has(id)) continue;
      seen.add(id);
      const c = h.clubId ? getClub(h.clubId) : getClub(h.club);
      out.push({ id, label: c?.name ?? h.club, logo: c?.logo ?? null });
    }
    return out;
  }, [effectiveHoldings]);

  // ── Row Props Helper ──
  const getRowProps = useCallback((player: UserDpcHolding) => {
    const isSelected = selectedPlayers.some(sp => sp.playerId === player.id);
    const fixtureLocked = isPlayerLocked(player.id);
    const formEntries = (formScoresMap?.get(player.id) ?? []).map((s) => ({
      score: s ?? 0,
      status: (s != null ? 'played' : 'not_in_squad') as 'played' | 'not_in_squad',
    }));
    const clubId = player.clubId ?? allPlayers.find(p => p.id === player.id)?.clubId;
    const nextFix = clubId ? nextFixturesMap?.get(clubId) : undefined;
    const oppAvgL5 = nextFix ? getClubAvgL5(nextFix.opponentClubId, allPlayers) : 0;
    const playerClubKey = player.clubId ?? player.club;
    const hasSynergy = synergyClubs.includes(playerClubKey) && !isSelected;
    const synergyPct = hasSynergy ? synergyClubs.filter(c => c === playerClubKey).length * 4 : null;

    let rowState: 'default' | 'selected' | 'locked' | 'deployed' | 'injured' | 'suspended' = 'default';
    if (fixtureLocked) rowState = 'locked';
    else if (isSelected) rowState = 'selected';
    else if (player.isLocked) rowState = 'deployed';
    else if (player.status === 'injured') rowState = 'injured';
    else if (player.status === 'suspended') rowState = 'suspended';

    return {
      player: {
        id: player.id,
        first: player.first,
        last: player.last,
        pos: player.pos as Pos,
        club: player.club,
        // Slice 422: die bereits aufgelöste clubId (mit allPlayers-Fallback, s.o.) durchreichen.
        clubId: clubId ?? player.clubId,
        imageUrl: player.imageUrl,
        ticket: player.ticket ?? 0,
        status: player.status,
        perfL5: player.perfL5,
        perfL15: player.perfL15 ?? 0,
        matches: player.matches,
        goals: player.goals,
        assists: player.assists,
        floorPrice: centsToBsd(player.floorPrice ?? 0),
        dpcOwned: player.dpcOwned,
        dpcAvailable: player.dpcAvailable,
        eventsUsing: player.eventsUsing,
        leagueShort: player.leagueShort,
        leagueLogoUrl: player.leagueLogoUrl,
      },
      formEntries,
      nextFixture: nextFix ? { opponentShort: nextFix.opponentShort, opponentName: nextFix.opponentName, opponentLogoUrl: nextFix.opponentLogoUrl, isHome: nextFix.isHome } : null,
      opponentAvgL5: oppAvgL5,
      synergyPct,
      rowState,
    };
  }, [selectedPlayers, isPlayerLocked, formScoresMap, allPlayers, nextFixturesMap, synergyClubs]);

  // ── Preset Actions ──
  const savePreset = useCallback(() => {
    if (!presetName.trim()) return;
    const ids = formationSlots.map(s => { const sp = selectedPlayers.find(p => p.slot === s.slot); return sp?.playerId || ''; });
    const updated = [...presets, { name: presetName, formation: selectedFormation, playerIds: ids }];
    if (updated.length > 5) updated.shift();
    localStorage.setItem(PRESET_KEY, JSON.stringify(updated));
    setPresets(updated);
    setPresetName('');
    setShowPresets(false);
  }, [presetName, formationSlots, selectedPlayers, presets, selectedFormation]);

  const applyPreset = useCallback((preset: LineupPreset) => {
    const fmts = availableFormations;
    const formation = fmts.find(f => f.id === preset.formation) || fmts[0];
    const slots: { pos: string; slot: number }[] = [];
    let idx = 0;
    for (const s of formation.slots) { for (let i = 0; i < s.count; i++) slots.push({ pos: s.pos, slot: idx++ }); }
    const lineup: LineupPlayer[] = [];
    slots.forEach((s, i) => {
      if (preset.playerIds[i] && effectiveHoldings.some(h => h.id === preset.playerIds[i] && !h.isLocked))
        lineup.push({ playerId: preset.playerIds[i], position: s.pos, slot: s.slot, isLocked: false });
    });
    onApplyPreset(preset.formation, lineup);
    setShowPresets(false);
  }, [availableFormations, effectiveHoldings, onApplyPreset]);

  const deletePreset = useCallback((index: number) => {
    const updated = [...presets]; updated.splice(index, 1);
    localStorage.setItem(PRESET_KEY, JSON.stringify(updated));
    setPresets(updated);
    setShowPresets(false);
  }, [presets]);

  // ── Picker Actions ──
  const openPicker = useCallback((position: string, slot: number) => {
    setPickerMode({ kind: 'starter', position, slot });
    setPickerSearch('');
    setClubFilter([]);
  }, []);

  /** Slice 195d — Bench-Picker oeffnen (GK oder Outfield). */
  const openBenchPicker = useCallback((benchKind: BenchSlotKey) => {
    const kind = benchKind === 'bench_gk' ? 'bench-gk' : 'bench-outfield';
    setPickerMode({ kind, benchKind });
    setPickerSearch('');
    setClubFilter([]);
  }, []);

  const closePicker = useCallback(() => {
    setPickerMode(null);
    setPickerSearch('');
    setClubFilter([]);
  }, []);

  const selectPlayerFromPicker = useCallback((playerId: string) => {
    if (!pickerMode) return;
    if (pickerMode.kind === 'starter') {
      onSelectPlayer(playerId, pickerMode.position, pickerMode.slot);
    } else if (onSelectBench) {
      onSelectBench(pickerMode.benchKind, playerId);
    }
    setPickerMode(null);
    setPickerSearch('');
  }, [pickerMode, onSelectPlayer, onSelectBench]);

  return {
    // Flags
    isFullyLocked, isReadOnly,
    // Picker state
    showPlayerPicker, pickerSearch, setPickerSearch, pickerSort, setPickerSort,
    clubFilter, setClubFilter, onlyAvailable, setOnlyAvailable,
    synergyOnly, setSynergyOnly,
    // Preset state
    presetName, setPresetName, showPresets, setShowPresets, presets,
    // Derived
    ownershipBonusIds, synergyClubs, availableClubsList,
    formScoresMap, nextFixturesMap, allPlayers,
    // Helpers
    getRowProps,
    // Actions
    savePreset, applyPreset, deletePreset,
    openPicker, closePicker, selectPlayerFromPicker,
    // Slice 195d — Bench
    pickerMode, openBenchPicker,
  };
}
