import { useState, useEffect, useMemo, useCallback } from 'react';
import { useBatchFormScores, useNextFixtures } from '@/lib/queries/fantasyPicker';
import { usePlayers } from '@/lib/queries/players';
import { getClub } from '@/lib/clubs';
import { getClubAvgL5 } from '@/components/fantasy/FDRBadge';
import { centsToBsd } from '@/lib/services/players';
import { PRESET_KEY } from '../constants';
import type { Pos } from '@/types';
import type { FantasyEvent, LineupPlayer, UserDpcHolding, LineupPreset } from '../types';
import type { FormationDef } from '../constants';
import type { PickerSortKey } from '@/components/fantasy/PickerSortFilter';

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
}

export function useLineupPanelState({
  event, selectedPlayers, effectiveHoldings, ownedPlayerIds,
  isPlayerLocked, formationSlots, slotDbKeys, selectedFormation,
  availableFormations, onApplyPreset, onSelectPlayer, wildcardSlots,
}: UseLineupPanelStateProps) {
  const isFullyLocked = event.status === 'ended';
  const isReadOnly = isFullyLocked;

  // ── Picker State ──
  const [showPlayerPicker, setShowPlayerPicker] = useState<{ position: string; slot: number } | null>(null);
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
  const playerIds = useMemo(() => effectiveHoldings.map(h => h.id), [effectiveHoldings]);
  const { data: formScoresMap } = useBatchFormScores(playerIds, !!showPlayerPicker || !isReadOnly);
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

  const synergyClubs = useMemo(() => {
    const clubs = selectedPlayers.map(sp => {
      const h = effectiveHoldings.find(eh => eh.id === sp.playerId);
      return h?.club;
    }).filter(Boolean) as string[];
    return Array.from(new Set(clubs));
  }, [selectedPlayers, effectiveHoldings]);

  const availableClubsList = useMemo(() => {
    const clubShorts = Array.from(new Set(effectiveHoldings.map(h => h.club)));
    return clubShorts.map(short => {
      const c = getClub(short);
      return { short, logo: c?.logo ?? null };
    });
  }, [effectiveHoldings]);

  // ── Row Props Helper ──
  const getRowProps = useCallback((player: UserDpcHolding) => {
    const isSelected = selectedPlayers.some(sp => sp.playerId === player.id);
    const fixtureLocked = isPlayerLocked(player.id);
    const formEntries = formScoresMap?.get(player.id) ?? [];
    const clubId = player.clubId ?? allPlayers.find(p => p.id === player.id)?.clubId;
    const nextFix = clubId ? nextFixturesMap?.get(clubId) : undefined;
    const oppAvgL5 = nextFix ? getClubAvgL5(nextFix.opponentShort, allPlayers) : 0;
    const hasSynergy = synergyClubs.includes(player.club) && !isSelected;
    const synergyPct = hasSynergy ? synergyClubs.filter(c => c === player.club).length * 4 : null;

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
      },
      formEntries,
      nextFixture: nextFix ? { opponentShort: nextFix.opponentShort, opponentName: nextFix.opponentName, isHome: nextFix.isHome } : null,
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
    setShowPlayerPicker({ position, slot });
    setPickerSearch('');
    setClubFilter([]);
  }, []);

  const closePicker = useCallback(() => {
    setShowPlayerPicker(null);
    setPickerSearch('');
    setClubFilter([]);
  }, []);

  const selectPlayerFromPicker = useCallback((playerId: string) => {
    if (!showPlayerPicker) return;
    onSelectPlayer(playerId, showPlayerPicker.position, showPlayerPicker.slot);
    setShowPlayerPicker(null);
    setPickerSearch('');
  }, [showPlayerPicker, onSelectPlayer]);

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
  };
}
