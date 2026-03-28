import { useState, useMemo, useCallback, useEffect } from 'react';
import { useUser } from '@/components/providers/AuthProvider';
import { useRecentMinutes, useRecentScores, useNextFixtures, usePlayerEventUsage } from '@/lib/queries/managerData';
import { FORMATIONS, DEFAULT_FORMATIONS, DEFAULT_SQUAD_SIZE, SQUAD_PRESET_KEY, SQUAD_SIZE_KEY } from './constants';
import type { Player, Pos } from '@/types';
import type { FormationId, SquadPreset, SquadSize } from './types';

interface UseKaderStateProps {
  players: Player[];
  ownedPlayers: Player[];
}

export function useKaderState({ players, ownedPlayers }: UseKaderStateProps) {
  const { user } = useUser();
  const [squadSize, setSquadSize] = useState<SquadSize>(DEFAULT_SQUAD_SIZE);

  // Hydrate from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(SQUAD_SIZE_KEY) as SquadSize | null;
      if (saved) setSquadSize(saved);
    } catch { /* ignore */ }
  }, []);

  const [formationId, setFormationId] = useState<FormationId>(DEFAULT_FORMATIONS[squadSize]);
  const [assignments, setAssignments] = useState<Map<number, string>>(new Map());
  const [pickerOpen, setPickerOpen] = useState<{ slotIndex: number; pos: Pos } | null>(null);
  const [pickerSearch, setPickerSearch] = useState('');
  const [presetName, setPresetName] = useState('');
  const [showPresets, setShowPresets] = useState(false);
  const [presets, setPresets] = useState<SquadPreset[]>([]);
  const [sortBy, setSortBy] = useState<'perf' | 'price' | 'name'>('perf');
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

  // ── Callbacks ──

  const handleSlotClick = useCallback((slotIndex: number, pos: Pos) => {
    const existing = assignments.get(slotIndex);
    if (existing) {
      setAssignments(prev => {
        const next = new Map(prev);
        next.delete(slotIndex);
        return next;
      });
    } else {
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
    setAssignments(new Map());
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

  const handleResetAll = useCallback(() => {
    setAssignments(new Map());
    setSidePanelPos(null);
    setSidePanelSlot(null);
  }, []);

  const handleClosePicker = useCallback(() => {
    setPickerOpen(null);
    setSidePanelPos(null);
    setSidePanelSlot(null);
  }, []);

  const getEventCount = useCallback((playerId: string) => {
    return eventUsageMap?.get(playerId)?.length ?? 0;
  }, [eventUsageMap]);

  const getNextFixture = useCallback((player: Player) => {
    return nextFixturesMap?.get(player.clubId ?? '');
  }, [nextFixturesMap]);

  // ── Derived Data ──

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

  return {
    // State
    squadSize, formationId, formation, availableFormations,
    assignments, assignedPlayers, assignedIds,
    pickerOpen, pickerSearch, setPickerSearch,
    presetName, setPresetName, showPresets, setShowPresets, presets,
    sortBy, setSortBy, sidePanelPos, setSidePanelPos, sidePanelSlot, setSidePanelSlot,
    // Manager data
    minutesMap, scoresMap, nextFixturesMap, eventUsageMap,
    // Derived
    pickerPlayers, sortedOwned,
    // Actions
    handleSlotClick, handlePickPlayer, handleSquadSizeChange, handleFormationChange,
    handleSavePreset, handleLoadPreset, handleDeletePreset, handleResetAll, handleClosePicker,
    getEventCount, getNextFixture,
  };
}
